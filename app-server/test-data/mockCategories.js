const Category = require('../models/category');
const { upsertMockUser } = require('./mockUsers');

const mockCategoryFixtures = {
  empty: [],
  basic: ['Work', 'Health', 'Learning'],
  power: ['Work', 'Health', 'Learning', 'Admin', 'Creative', 'Relationships'],
  edge: ['Work', 'Learning', 'Uncategorized Stress Test']
};

const seedMockCategories = async (persona) => {
  const user = await upsertMockUser(persona);
  const titles = mockCategoryFixtures[persona];

  await Category.deleteMany({ userId: user._id });

  const categories = [];
  for (const title of titles) {
    categories.push(await Category.create({ userId: user._id, title }));
  }

  return {
    user,
    categories
  };
};

module.exports = {
  mockCategoryFixtures,
  seedMockCategories
};
