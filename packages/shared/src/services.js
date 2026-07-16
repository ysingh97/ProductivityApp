const buildAnalyticsQuery = ({ from, to, bucket } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (bucket) params.set('bucket', bucket);
  return params.toString();
};

// Binds every backend REST call to a supplied axios client so the same service
// layer can be reused by the web and mobile apps.
const createServices = (client) => {
  if (!client) {
    throw new Error('createServices requires an axios client');
  }

  // Tasks
  const fetchTasks = async () => (await client.get('/tasks')).data;
  const fetchTaskById = async (taskId) => (await client.get(`/tasks/${taskId}`)).data;
  const fetchTasksByListId = async (listId) =>
    (await client.get(`/tasks/list/${listId}`)).data;
  const createTask = async (taskData) => (await client.post('/tasks', taskData)).data;
  const updateTask = async (taskId, updates) =>
    (await client.put(`/tasks/${taskId}`, updates)).data;
  const deleteTask = async (taskId) => (await client.delete(`/tasks/${taskId}`)).data;

  // Task time entries
  const fetchTaskTimeEntries = async (taskId) =>
    (await client.get(`/tasks/${taskId}/time-entries`)).data;
  const createTaskTimeEntry = async (taskId, timeEntryData) =>
    (await client.post(`/tasks/${taskId}/time-entries`, timeEntryData)).data;
  const updateTaskTimeEntry = async (taskId, entryId, timeEntryData) =>
    (await client.put(`/tasks/${taskId}/time-entries/${entryId}`, timeEntryData)).data;
  const deleteTaskTimeEntry = async (taskId, entryId) =>
    (await client.delete(`/tasks/${taskId}/time-entries/${entryId}`)).data;

  // Goals
  const fetchGoals = async () => (await client.get('/goals')).data;
  const fetchGoalById = async (goalId) => (await client.get(`/goals/${goalId}`)).data;
  const createGoal = async (goalData) => (await client.post('/goals', goalData)).data;
  const updateGoal = async (goalId, updates) =>
    (await client.put(`/goals/${goalId}`, updates)).data;
  const deleteGoal = async (goalId) => client.delete(`/goals/${goalId}`);

  // Lists
  const fetchLists = async () => (await client.get('/lists')).data;
  const createList = async (listData) => client.post('/lists', listData);

  // Categories
  const fetchCategories = async () => (await client.get('/categories')).data;

  // Analytics
  const fetchTimeByCategory = async ({ from, to } = {}) => {
    const query = buildAnalyticsQuery({ from, to });
    return (
      await client.get(`/analytics/time-by-category${query ? `?${query}` : ''}`)
    ).data;
  };
  const fetchTimeSeries = async ({ from, to, bucket } = {}) => {
    const query = buildAnalyticsQuery({ from, to, bucket });
    return (await client.get(`/analytics/time-series${query ? `?${query}` : ''}`)).data;
  };

  // AI planning
  const generatePlan = async (prompt) =>
    (await client.post('/ai/plan', { prompt })).data;

  // Google Calendar integration
  const fetchGoogleCalendarConnectUrl = async () =>
    (await client.get('/integrations/google-calendar/connect-url')).data;
  const fetchGoogleCalendarStatus = async () =>
    (await client.get('/integrations/google-calendar/status')).data;
  const fetchGoogleCalendars = async () =>
    (await client.get('/integrations/google-calendar/calendars')).data;
  const saveGoogleCalendarSettings = async (settings) =>
    (await client.put('/integrations/google-calendar/settings', settings)).data;
  const syncGoogleCalendarNow = async () =>
    (await client.post('/integrations/google-calendar/sync-now')).data;
  const disconnectGoogleCalendar = async () =>
    (await client.delete('/integrations/google-calendar/disconnect')).data;

  return {
    fetchTasks,
    fetchTaskById,
    fetchTasksByListId,
    createTask,
    updateTask,
    deleteTask,
    fetchTaskTimeEntries,
    createTaskTimeEntry,
    updateTaskTimeEntry,
    deleteTaskTimeEntry,
    fetchGoals,
    fetchGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
    fetchLists,
    createList,
    fetchCategories,
    fetchTimeByCategory,
    fetchTimeSeries,
    generatePlan,
    fetchGoogleCalendarConnectUrl,
    fetchGoogleCalendarStatus,
    fetchGoogleCalendars,
    saveGoogleCalendarSettings,
    syncGoogleCalendarNow,
    disconnectGoogleCalendar
  };
};

module.exports = { createServices, buildAnalyticsQuery };
