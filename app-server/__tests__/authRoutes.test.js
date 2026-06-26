jest.mock('../middleware/auth', () => ({
  verifyGoogleToken: jest.fn()
}));

const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const authRoutes = require('../routes/authRoutes');
const User = require('../models/user');
const { verifyGoogleToken } = require('../middleware/auth');

jest.setTimeout(60000);

let app;
let mongoServer;
let consoleErrorSpy;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

afterAll(async () => {
  consoleErrorSpy.mockRestore();
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('auth route rejects requests without a credential', async () => {
  await request(app)
    .post('/api/auth/google')
    .send({})
    .expect(400)
    .expect({
      message: 'Missing credential'
    });

  expect(verifyGoogleToken).not.toHaveBeenCalled();
});

test('auth route rejects invalid Google credentials', async () => {
  verifyGoogleToken.mockRejectedValue(new Error('invalid token'));

  await request(app)
    .post('/api/auth/google')
    .send({ credential: 'bad-token' })
    .expect(401)
    .expect({
      message: 'Invalid Google credential'
    });

  expect(await User.countDocuments()).toBe(0);
});

test('auth route creates a user the first time a Google account signs in', async () => {
  verifyGoogleToken.mockResolvedValue({
    sub: 'google-123',
    email: 'alice@example.com',
    name: 'Alice Example',
    picture: 'https://example.com/alice.png'
  });

  await request(app)
    .post('/api/auth/google')
    .send({ credential: 'credential-token' })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        token: 'credential-token',
        user: {
          googleId: 'google-123',
          email: 'alice@example.com',
          name: 'Alice Example',
          picture: 'https://example.com/alice.png'
        }
      });
      expect(body.user.id).toBeTruthy();
    });

  const persistedUser = await User.findOne({ googleId: 'google-123' }).lean();

  expect(persistedUser).toMatchObject({
    googleId: 'google-123',
    email: 'alice@example.com',
    name: 'Alice Example',
    picture: 'https://example.com/alice.png'
  });
});

test('auth route updates an existing user when Google profile fields change', async () => {
  await User.create({
    googleId: 'google-123',
    email: 'old@example.com',
    name: 'Old Name',
    picture: 'https://example.com/old.png'
  });

  verifyGoogleToken.mockResolvedValue({
    sub: 'google-123',
    email: 'new@example.com',
    name: 'New Name',
    picture: 'https://example.com/new.png'
  });

  await request(app)
    .post('/api/auth/google')
    .send({ credential: 'fresh-token' })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        token: 'fresh-token',
        user: {
          googleId: 'google-123',
          email: 'new@example.com',
          name: 'New Name',
          picture: 'https://example.com/new.png'
        }
      });
    });

  const persistedUser = await User.findOne({ googleId: 'google-123' }).lean();

  expect(persistedUser).toMatchObject({
    googleId: 'google-123',
    email: 'new@example.com',
    name: 'New Name',
    picture: 'https://example.com/new.png'
  });
});
