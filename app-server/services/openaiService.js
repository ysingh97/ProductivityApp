const OpenAI = require('openai');

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 30000;

let cachedClient = null;

const createServiceError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

// The default client is created lazily so the server can boot (and tests can run)
// without an API key; callers that don't inject a client must have OPENAI_API_KEY.
const getDefaultClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw createServiceError(
      'OPENAI_API_KEY is not configured',
      'OPENAI_NOT_CONFIGURED'
    );
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1
    });
  }

  return cachedClient;
};

const taskSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    estimatedCompletionTime: { type: 'number' },
    suggestedTargetDate: { type: ['string', 'null'] }
  },
  required: ['title', 'description', 'estimatedCompletionTime', 'suggestedTargetDate']
};

// Structured-output schema. Kept to one level of sub-goals (each with tasks) plus
// top-level tasks so the model reliably returns something we can map onto the
// Goal/Task Mongo models.
const PLAN_JSON_SCHEMA = {
  name: 'goal_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      goal: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          estimatedHours: { type: 'number' },
          suggestedTargetDate: { type: ['string', 'null'] },
          subGoals: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                estimatedHours: { type: 'number' },
                suggestedTargetDate: { type: ['string', 'null'] },
                tasks: { type: 'array', items: taskSchema }
              },
              required: ['title', 'description', 'estimatedHours', 'suggestedTargetDate', 'tasks']
            }
          },
          tasks: { type: 'array', items: taskSchema }
        },
        required: ['title', 'description', 'category', 'estimatedHours', 'suggestedTargetDate', 'subGoals', 'tasks']
      }
    },
    required: ['goal']
  }
};

const buildSystemPrompt = ({ categories = [], today } = {}) => {
  const categoryLine = categories.length
    ? `The user already uses these categories: ${categories.join(', ')}. Prefer one of these for "category"; only invent a new short category name if none fit.`
    : 'The user has no categories yet; choose a short, sensible category name for "category".';

  return [
    'You are a planning assistant embedded in a productivity app called Branchwork.',
    'Given a user goal in natural language, produce a structured, actionable breakdown.',
    'Break the goal into a small number of sub-goals (0-5), each with a few concrete tasks (0-6).',
    'Also include any high-level tasks that belong directly under the top goal.',
    'estimatedHours is the total effort in hours for a goal; estimatedCompletionTime is the effort in hours for a single task. Use realistic, non-negative numbers.',
    `suggestedTargetDate must be an ISO date (YYYY-MM-DD) on or after ${today}, or null if no date makes sense.`,
    categoryLine,
    'Keep titles concise and descriptions to one or two sentences. Return only data that fits the provided JSON schema.'
  ].join(' ');
};

const buildUserPrompt = ({ prompt, existingGoalTitles = [] } = {}) => {
  const context = existingGoalTitles.length
    ? `\n\nFor context, the user's existing top-level goals are: ${existingGoalTitles.join(', ')}. Do not duplicate these.`
    : '';
  return `Create a plan for the following goal:\n\n"${prompt}"${context}`;
};

const toSafeString = (value) => (typeof value === 'string' ? value.trim() : '');
const toSafeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0;
};
const toSafeDate = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value.trim();
};

const normalizeTask = (task = {}) => ({
  title: toSafeString(task.title),
  description: toSafeString(task.description),
  estimatedCompletionTime: toSafeNumber(task.estimatedCompletionTime),
  suggestedTargetDate: toSafeDate(task.suggestedTargetDate)
});

const normalizeSubGoal = (subGoal = {}) => ({
  title: toSafeString(subGoal.title),
  description: toSafeString(subGoal.description),
  estimatedHours: toSafeNumber(subGoal.estimatedHours),
  suggestedTargetDate: toSafeDate(subGoal.suggestedTargetDate),
  tasks: (Array.isArray(subGoal.tasks) ? subGoal.tasks : [])
    .map(normalizeTask)
    .filter((task) => task.title)
});

const normalizePlan = (parsed) => {
  const goal = parsed && typeof parsed === 'object' ? parsed.goal : null;
  if (!goal || typeof goal !== 'object' || !toSafeString(goal.title)) {
    throw createServiceError(
      'The AI returned an unreadable plan. Please try again.',
      'INVALID_AI_RESPONSE'
    );
  }

  return {
    goal: {
      title: toSafeString(goal.title),
      description: toSafeString(goal.description),
      category: toSafeString(goal.category),
      estimatedHours: toSafeNumber(goal.estimatedHours),
      suggestedTargetDate: toSafeDate(goal.suggestedTargetDate),
      subGoals: (Array.isArray(goal.subGoals) ? goal.subGoals : [])
        .map(normalizeSubGoal)
        .filter((subGoal) => subGoal.title),
      tasks: (Array.isArray(goal.tasks) ? goal.tasks : [])
        .map(normalizeTask)
        .filter((task) => task.title)
    }
  };
};

// Calls OpenAI (or an injected client, used by tests) and returns a validated,
// normalized plan object ready for the client to preview and save.
const generatePlan = async ({
  prompt,
  categories = [],
  existingGoalTitles = [],
  today = new Date().toISOString().slice(0, 10),
  client
} = {}) => {
  const trimmedPrompt = toSafeString(prompt);
  if (!trimmedPrompt) {
    throw createServiceError(
      'A prompt describing your goal is required',
      'INVALID_PROMPT'
    );
  }

  const openai = client || getDefaultClient();

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: 'json_schema', json_schema: PLAN_JSON_SCHEMA },
    messages: [
      { role: 'system', content: buildSystemPrompt({ categories, today }) },
      { role: 'user', content: buildUserPrompt({ prompt: trimmedPrompt, existingGoalTitles }) }
    ]
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    throw createServiceError(
      'The AI did not return a plan. Please try again.',
      'EMPTY_AI_RESPONSE'
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw createServiceError(
      'The AI returned an unreadable plan. Please try again.',
      'INVALID_AI_RESPONSE'
    );
  }

  return normalizePlan(parsed);
};

module.exports = {
  generatePlan,
  buildSystemPrompt,
  buildUserPrompt,
  normalizePlan,
  PLAN_JSON_SCHEMA,
  DEFAULT_MODEL
};
