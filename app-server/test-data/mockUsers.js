const User = require('../models/user');
const { testAuthUsers } = require('../utils/testAuth');

const getMockUserData = (persona) => {
  const payload = testAuthUsers[persona];
  if (!payload) {
    throw new Error(`Unknown mock persona: ${persona}`);
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  };
};

const upsertMockUser = async (persona) => {
  const userData = getMockUserData(persona);

  return User.findOneAndUpdate(
    { googleId: userData.googleId },
    userData,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  getMockUserData,
  upsertMockUser
};
