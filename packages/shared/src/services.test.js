const test = require('node:test');
const assert = require('node:assert/strict');

const { createServices, buildAnalyticsQuery } = require('./services');

const makeClient = () => {
  const calls = [];
  const handler = (method) => (url, body) => {
    calls.push({ method, url, body });
    return Promise.resolve({ data: { method, url, body } });
  };
  return {
    calls,
    get: handler('get'),
    post: handler('post'),
    put: handler('put'),
    delete: handler('delete')
  };
};

test('buildAnalyticsQuery', async (t) => {
  await t.test('serializes provided params only', () => {
    assert.equal(buildAnalyticsQuery({ from: 'a', to: 'b', bucket: 'day' }), 'from=a&to=b&bucket=day');
    assert.equal(buildAnalyticsQuery({ from: 'a' }), 'from=a');
  });

  await t.test('returns empty string with no params', () => {
    assert.equal(buildAnalyticsQuery(), '');
    assert.equal(buildAnalyticsQuery({}), '');
  });
});

test('createServices requires a client', () => {
  assert.throws(() => createServices(), /requires an axios client/);
});

test('service methods map to the expected REST calls', async () => {
  const client = makeClient();
  const services = createServices(client);

  assert.deepEqual(await services.fetchTasks(), { method: 'get', url: '/tasks', body: undefined });
  await services.fetchTaskById('t1');
  await services.createTask({ title: 'x' });
  await services.updateTask('t1', { title: 'y' });
  await services.deleteTask('t1');
  await services.fetchTasksByListId('l1');
  await services.fetchGoals();
  await services.createGoal({ name: 'g' });
  await services.fetchLists();
  await services.fetchCategories();

  const find = (method, url) => client.calls.find((c) => c.method === method && c.url === url);
  assert.ok(find('get', '/tasks/t1'));
  assert.deepEqual(find('post', '/tasks').body, { title: 'x' });
  assert.deepEqual(find('put', '/tasks/t1').body, { title: 'y' });
  assert.ok(find('delete', '/tasks/t1'));
  assert.ok(find('get', '/tasks/list/l1'));
  assert.ok(find('get', '/goals'));
  assert.deepEqual(find('post', '/goals').body, { name: 'g' });
  assert.ok(find('get', '/lists'));
  assert.ok(find('get', '/categories'));
});

test('analytics services append query strings', async () => {
  const client = makeClient();
  const services = createServices(client);

  await services.fetchTimeByCategory({ from: 'a', to: 'b' });
  await services.fetchTimeSeries({ from: 'a', to: 'b', bucket: 'week' });
  await services.fetchTimeByCategory();

  assert.ok(client.calls.some((c) => c.url === '/analytics/time-by-category?from=a&to=b'));
  assert.ok(client.calls.some((c) => c.url === '/analytics/time-series?from=a&to=b&bucket=week'));
  assert.ok(client.calls.some((c) => c.url === '/analytics/time-by-category'));
});

test('google calendar services map to integration routes', async () => {
  const client = makeClient();
  const services = createServices(client);

  await services.fetchGoogleCalendarStatus();
  await services.saveGoogleCalendarSettings({ calendarId: 'primary' });
  await services.syncGoogleCalendarNow();
  await services.disconnectGoogleCalendar();

  assert.ok(client.calls.some((c) => c.method === 'get' && c.url === '/integrations/google-calendar/status'));
  assert.ok(
    client.calls.some(
      (c) => c.method === 'put' && c.url === '/integrations/google-calendar/settings'
    )
  );
  assert.ok(client.calls.some((c) => c.method === 'post' && c.url === '/integrations/google-calendar/sync-now'));
  assert.ok(client.calls.some((c) => c.method === 'delete' && c.url === '/integrations/google-calendar/disconnect'));
});
