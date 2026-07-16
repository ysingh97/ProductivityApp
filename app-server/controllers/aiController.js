const Category = require('../models/category');
const Goal = require('../models/goal');
const openaiService = require('../services/openaiService');

const errorStatusByCode = {
  INVALID_PROMPT: 400,
  OPENAI_NOT_CONFIGURED: 503,
  EMPTY_AI_RESPONSE: 502,
  INVALID_AI_RESPONSE: 502
};

const messageByCode = {
  OPENAI_NOT_CONFIGURED: 'AI planning is not configured on the server.'
};

const generatePlan = async (req, res) => {
  const { prompt } = req.body || {};

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ message: 'A prompt describing your goal is required' });
  }

  try {
    const categories = await Category.find({ userId: req.user.id }, { title: 1 })
      .sort({ title: 1 });
    const existingGoals = await Goal.find(
      { userId: req.user.id, parentGoalId: null },
      { title: 1 }
    ).limit(50);

    const plan = await openaiService.generatePlan({
      prompt: prompt.trim(),
      categories: categories.map((category) => category.title),
      existingGoalTitles: existingGoals.map((goal) => goal.title),
      today: new Date().toISOString().slice(0, 10)
    });

    return res.status(200).json({ plan });
  } catch (err) {
    const status = errorStatusByCode[err.code];
    if (status) {
      return res.status(status).json({ message: messageByCode[err.code] || err.message });
    }

    console.error('AI plan generation failed', err);
    return res.status(502).json({
      message: 'Unable to generate a plan right now. Please try again.'
    });
  }
};

module.exports = {
  generatePlan
};
