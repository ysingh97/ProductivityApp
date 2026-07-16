const express = require('express');
const router = express.Router();
const { generatePlan } = require('../controllers/aiController');

router.post('/plan', generatePlan);

module.exports = router;
