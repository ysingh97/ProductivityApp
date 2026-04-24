const Task = require('../models/task');

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnlyParam = (value, label) => {
  if (!value) {
    return null;
  }

  if (!dateOnlyPattern.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid calendar date.`);
  }

  return parsed;
};

const getTimeByCategory = async (req, res) => {
  try {
    const fromDate = parseDateOnlyParam(req.query.from, 'from');
    const toDate = parseDateOnlyParam(req.query.to, 'to');

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        error: 'from must be on or before to.'
      });
    }

    const match = {
      userId: req.user.id
    };

    if (fromDate || toDate) {
      match.targetCompletionDate = {};

      if (fromDate) {
        match.targetCompletionDate.$gte = fromDate;
      }

      if (toDate) {
        const exclusiveUpperBound = new Date(toDate);
        exclusiveUpperBound.setUTCDate(exclusiveUpperBound.getUTCDate() + 1);
        match.targetCompletionDate.$lt = exclusiveUpperBound;
      }
    }

    const rows = await Task.aggregate([
      {
        $match: match
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            categoryId: '$category._id',
            categoryTitle: '$category.title'
          },
          hours: { $sum: '$timeSpent' }
        }
      },
      {
        $project: {
          _id: 0,
          categoryId: {
            $ifNull: [{ $toString: '$_id.categoryId' }, null]
          },
          categoryTitle: {
            $ifNull: ['$_id.categoryTitle', 'Uncategorized']
          },
          hours: 1
        }
      },
      {
        $sort: {
          hours: -1,
          categoryTitle: 1
        }
      }
    ]);

    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
    const categories = rows.map((row) => ({
      ...row,
      hours: roundToTwoDecimals(row.hours),
      percentage: totalHours > 0
        ? roundToTwoDecimals((row.hours / totalHours) * 100)
        : 0
    }));

    res.status(200).json({
      totalHours: roundToTwoDecimals(totalHours),
      categories
    });
  } catch (err) {
    if (
      err.message === 'from must use YYYY-MM-DD format.' ||
      err.message === 'to must use YYYY-MM-DD format.' ||
      err.message === 'from must be a valid calendar date.' ||
      err.message === 'to must be a valid calendar date.'
    ) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTimeByCategory
};
