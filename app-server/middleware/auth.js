const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (token) => {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  return ticket.getPayload();
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

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.create({
        googleId,
        email,
        name,
        picture
      });
    } else if (
      user.email !== email ||
      user.name !== name ||
      user.picture !== picture
    ) {
      user.email = email;
      user.name = name;
      user.picture = picture;
      await user.save();
    }

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
