const Task = require('../models/task');

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

const getTimeByCategory = async (req, res) => {
  try {
    const rows = await Task.aggregate([
      {
        $match: {
          userId: req.user.id
        }
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
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTimeByCategory
};
