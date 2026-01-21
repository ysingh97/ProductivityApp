const express = require('express');
const { verifyGoogleToken } = require('../middleware/auth');
const User = require('../models/user');

const router = express.Router();

router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Missing credential' });
  }

  try {
    const payload = await verifyGoogleToken(credential);
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

    res.json({
      token: credential,
      user: {
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (err) {
    console.error('Google auth failed', err);
    res.status(401).json({ message: 'Invalid Google credential' });
  }
});

module.exports = router;
