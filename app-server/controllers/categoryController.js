const Category = require('../models/category');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.id })
      .sort({ title: 1 });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCategories
};
