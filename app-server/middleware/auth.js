const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');
const { getTestAuthPayload } = require('../utils/testAuth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
  const testPayload = getTestAuthPayload(token);
  if (testPayload) {
    return testPayload;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  return ticket.getPayload();
};

const isDuplicateKeyError = (err) => err?.code === 11000;

const upsertAuthenticatedUser = async ({ googleId, email, name, picture }) => {
  const updates = {
    $set: {
      email,
      name,
      picture
    },
    $setOnInsert: {
      googleId
    }
  };

  try {
    return await User.findOneAndUpdate(
      { googleId },
      updates,
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );
  } catch (err) {
    if (!isDuplicateKeyError(err)) {
      throw err;
    }

    return User.findOneAndUpdate(
      { googleId },
      {
        $set: {
          email,
          name,
          picture
        }
      },
      {
        new: true,
        runValidators: true
      }
    );
  }
};

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' });
  }

  try {
    const payload = await verifyGoogleToken(token);
    const { sub: googleId, email, name, picture } = payload;

    const user = await upsertAuthenticatedUser({
      googleId,
      email,
      name,
      picture
    });

    req.user = {
      id: user._id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture
    };

    next();
  } catch (err) {
    console.error('Auth error', err);
    res.status(401).json({ message: 'Invalid or expired Google token' });
  }
};

module.exports = {
  requireAuth,
  verifyGoogleToken
};
