const express = require('express');
const { getTimeByCategory, getTimeSeries } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/time-by-category', getTimeByCategory);
router.get('/time-series', getTimeSeries);

module.exports = router;
