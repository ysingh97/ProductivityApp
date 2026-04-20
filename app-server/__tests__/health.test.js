const request = require('supertest');
const createApp = require('../app');

test('GET /api/health returns ok', async () => {
  const app = createApp();

  await request(app)
    .get('/api/health')
    .expect(200)
    .expect({ status: 'ok' });
});
