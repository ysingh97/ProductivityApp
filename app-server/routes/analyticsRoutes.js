const express = require('express');
const { getTimeByCategory } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/time-by-category', getTimeByCategory);

module.exports = router;
