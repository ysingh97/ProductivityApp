const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

jest.mock('../services/openaiService', () => ({
  generatePlan: jest.fn()
}));

const openaiService = require('../services/openaiService');
const createApp = require('../app');
const Category = require('../models/category');
const Goal = require('../models/goal');
const User = require('../models/user');
const { testAuthUsers } = require('../utils/testAuth');

jest.setTimeout(60000);

const originalAllowTestAuth = process.env.ALLOW_TEST_AUTH;

let app;
let mongoServer;

const createTestUser = async (persona) => {
  const payload = testAuthUsers[persona];
  return User.create({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  });
};

const samplePlan = {
  goal: {
    title: 'Learn Spanish',
    description: 'Reach conversational level.',
    category: 'Learning',
    estimatedHours: 40,
    suggestedTargetDate: null,
    subGoals: [],
    tasks: []
  }
};

beforeAll(async () => {
  process.env.ALLOW_TEST_AUTH = 'true';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createApp();
});

afterEach(async () => {
  await Goal.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();
});

afterAll(async () => {
  if (originalAllowTestAuth === undefined) {
    delete process.env.ALLOW_TEST_AUTH;
  } else {
    process.env.ALLOW_TEST_AUTH = originalAllowTestAuth;
  }

  await mongoose.disconnect();
  await mongoServer.stop();
});

test('ai plan route requires authentication', async () => {
  await request(app)
    .post('/api/ai/plan')
    .send({ prompt: 'anything' })
    .expect(401)
    .expect({ message: 'Missing auth token' });
});

test('ai plan route rejects an empty prompt', async () => {
  await createTestUser('basic');

  await request(app)
    .post('/api/ai/plan')
    .set('Authorization', 'Bearer test:basic')
    .send({ prompt: '   ' })
    .expect(400)
    .expect({ message: 'A prompt describing your goal is required' });

  expect(openaiService.generatePlan).not.toHaveBeenCalled();
});

test('ai plan route returns the generated plan and passes user context', async () => {
  const user = await createTestUser('basic');
  await Category.create([
    { title: 'Learning', userId: user._id },
    { title: 'Fitness', userId: user._id }
  ]);
  await Goal.create({ title: 'Existing goal', userId: user._id });

  openaiService.generatePlan.mockResolvedValue(samplePlan);

  await request(app)
    .post('/api/ai/plan')
    .set('Authorization', 'Bearer test:basic')
    .send({ prompt: 'I want to learn Spanish' })
    .expect(200)
    .expect(({ body }) => {
      expect(body.plan.goal.title).toBe('Learn Spanish');
    });

  expect(openaiService.generatePlan).toHaveBeenCalledTimes(1);
  const args = openaiService.generatePlan.mock.calls[0][0];
  expect(args.prompt).toBe('I want to learn Spanish');
  expect(args.categories).toEqual(['Fitness', 'Learning']);
  expect(args.existingGoalTitles).toEqual(['Existing goal']);
});

test('ai plan route returns 503 when the key is not configured', async () => {
  await createTestUser('basic');
  const error = new Error('OPENAI_API_KEY is not configured');
  error.code = 'OPENAI_NOT_CONFIGURED';
  openaiService.generatePlan.mockRejectedValue(error);

  await request(app)
    .post('/api/ai/plan')
    .set('Authorization', 'Bearer test:basic')
    .send({ prompt: 'plan something' })
    .expect(503)
    .expect({ message: 'AI planning is not configured on the server.' });
});

test('ai plan route returns 502 on unexpected service failures', async () => {
  await createTestUser('basic');
  openaiService.generatePlan.mockRejectedValue(new Error('network exploded'));

  await request(app)
    .post('/api/ai/plan')
    .set('Authorization', 'Bearer test:basic')
    .send({ prompt: 'plan something' })
    .expect(502)
    .expect({ message: 'Unable to generate a plan right now. Please try again.' });
});
