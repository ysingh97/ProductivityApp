const openaiService = require('../services/openaiService');

const makeClient = (content, onCreate) => ({
  chat: {
    completions: {
      create: async (params) => {
        if (onCreate) onCreate(params);
        return { choices: [{ message: { content } }] };
      }
    }
  }
});

const validPlan = {
  goal: {
    title: 'Run a half marathon',
    description: 'Train progressively over three months.',
    category: 'Fitness',
    estimatedHours: 60,
    suggestedTargetDate: '2026-10-15',
    subGoals: [
      {
        title: 'Build a base',
        description: 'Establish a running routine.',
        estimatedHours: 20,
        suggestedTargetDate: '2026-08-15',
        tasks: [
          {
            title: 'Run 3x per week',
            description: '30 minute easy runs',
            estimatedCompletionTime: 6,
            suggestedTargetDate: null
          }
        ]
      }
    ],
    tasks: [
      {
        title: 'Buy running shoes',
        description: '',
        estimatedCompletionTime: 1,
        suggestedTargetDate: null
      }
    ]
  }
};

test('generatePlan requires a non-empty prompt', async () => {
  await expect(openaiService.generatePlan({ prompt: '   ' })).rejects.toMatchObject({
    code: 'INVALID_PROMPT'
  });
});

test('generatePlan returns a normalized plan from the model response', async () => {
  const client = makeClient(JSON.stringify(validPlan));
  const plan = await openaiService.generatePlan({
    prompt: 'half marathon',
    categories: ['Fitness'],
    client
  });

  expect(plan.goal.title).toBe('Run a half marathon');
  expect(plan.goal.estimatedHours).toBe(60);
  expect(plan.goal.subGoals).toHaveLength(1);
  expect(plan.goal.subGoals[0].tasks[0].title).toBe('Run 3x per week');
  expect(plan.goal.tasks[0].title).toBe('Buy running shoes');
});

test('generatePlan passes structured-output config and context to the client', async () => {
  let captured;
  const client = makeClient(JSON.stringify(validPlan), (params) => {
    captured = params;
  });

  await openaiService.generatePlan({
    prompt: 'half marathon',
    categories: ['Fitness', 'Health'],
    existingGoalTitles: ['Learn guitar'],
    today: '2026-07-16',
    client
  });

  expect(captured.response_format.type).toBe('json_schema');
  expect(captured.messages[0].role).toBe('system');
  expect(captured.messages[0].content).toContain('Fitness');
  expect(captured.messages[1].content).toContain('half marathon');
  expect(captured.messages[1].content).toContain('Learn guitar');
});

test('generatePlan sanitizes invalid numbers, dates, and empty items', async () => {
  const messyPlan = {
    goal: {
      title: '  Messy goal  ',
      description: '',
      category: '',
      estimatedHours: -5,
      suggestedTargetDate: 'not-a-date',
      subGoals: [{ title: '', description: '', estimatedHours: 1, suggestedTargetDate: null, tasks: [] }],
      tasks: [
        { title: '', description: '', estimatedCompletionTime: 2, suggestedTargetDate: null },
        { title: 'Keep me', description: '', estimatedCompletionTime: 'abc', suggestedTargetDate: null }
      ]
    }
  };
  const client = makeClient(JSON.stringify(messyPlan));

  const plan = await openaiService.generatePlan({ prompt: 'x', client });

  expect(plan.goal.title).toBe('Messy goal');
  expect(plan.goal.estimatedHours).toBe(0);
  expect(plan.goal.suggestedTargetDate).toBeNull();
  expect(plan.goal.subGoals).toHaveLength(0);
  expect(plan.goal.tasks).toHaveLength(1);
  expect(plan.goal.tasks[0].title).toBe('Keep me');
  expect(plan.goal.tasks[0].estimatedCompletionTime).toBe(0);
});

test('generatePlan throws INVALID_AI_RESPONSE on unparseable content', async () => {
  const client = makeClient('this is not json');
  await expect(openaiService.generatePlan({ prompt: 'x', client })).rejects.toMatchObject({
    code: 'INVALID_AI_RESPONSE'
  });
});

test('generatePlan throws INVALID_AI_RESPONSE when the goal is missing', async () => {
  const client = makeClient(JSON.stringify({ goal: { description: 'no title' } }));
  await expect(openaiService.generatePlan({ prompt: 'x', client })).rejects.toMatchObject({
    code: 'INVALID_AI_RESPONSE'
  });
});

test('generatePlan throws EMPTY_AI_RESPONSE when no content is returned', async () => {
  const client = { chat: { completions: { create: async () => ({ choices: [{ message: {} }] }) } } };
  await expect(openaiService.generatePlan({ prompt: 'x', client })).rejects.toMatchObject({
    code: 'EMPTY_AI_RESPONSE'
  });
});
