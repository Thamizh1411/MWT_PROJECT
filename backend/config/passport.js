const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  if (!passport) {
    throw new Error('Passport object not provided');
  }

  // Check if Google OAuth credentials are configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    return; // Skip Google strategy setup
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let existingUser = await User.findOne({ oauthId: profile.id });

      if (existingUser) {
        return done(null, existingUser);
      }

      // Check if user exists with same email
      existingUser = await User.findOne({ email: profile.emails[0].value });

      if (existingUser) {
        // Link Google account to existing user
        existingUser.oauthId = profile.id;
        existingUser.oauthProvider = 'google';
        existingUser.avatar = profile.photos[0].value;
        await existingUser.save();
        return done(null, existingUser);
      }

      // Create new user
      const newUser = new User({
        name: profile.displayName,
        email: profile.emails[0].value,
        oauthId: profile.id,
        oauthProvider: 'google',
        avatar: profile.photos[0].value,
        role: 'user', // Default role for OAuth users
        verified: true,
        availability: true
      });

      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
