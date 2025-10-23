const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const crypto = require('crypto');
const User = require('../models/User');

const DEFAULT_USERNAME_PREFIX = 'user';

function sanitizeUsername(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input
    .toLowerCase()
    .replace(/[^a-z0-9._-]/gi, '')
    .replace(/\.\.+/g, '.')
    .replace(/^\./, '')
    .slice(0, 40);
}

async function generateUniqueUsername(baseValue) {
  const base = sanitizeUsername(baseValue) || DEFAULT_USERNAME_PREFIX;
  let candidate = base;
  let suffix = 1;

  // Ensure uniqueness by appending numeric suffix when necessary
  while (await User.exists({ username: candidate })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function extractProfileAttributes(profile) {
  const primaryEmail = Array.isArray(profile.emails) && profile.emails.length > 0
    ? profile.emails[0].value.toLowerCase()
    : null;

  const avatar = Array.isArray(profile.photos) && profile.photos.length > 0
    ? profile.photos[0].value
    : null;

  return {
    googleId: profile.id,
    email: primaryEmail,
    firstName: profile.name?.givenName || '',
    lastName: profile.name?.familyName || '',
    displayName: profile.displayName,
    profilePicture: avatar,
  };
}

function configurePassport(passport) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[Passport] Google OAuth credentials are not fully configured.');
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const { googleId, email, firstName, lastName, displayName, profilePicture } = extractProfileAttributes(profile);

          if (!googleId) {
            return done(new Error('Google profile did not include an ID.'));
          }

          if (!email) {
            return done(new Error('No email address was returned by Google. An email address is required to sign in.'));
          }

          let user = await User.findOne({ googleId });
          let accountLinked = false;
          let isNewUser = false;

          if (!user) {
            user = await User.findOne({ email });

            if (user) {
              if (!user.googleId) {
                user.googleId = googleId;
                accountLinked = true;
              }
            } else {
              const fallbackUsername = await generateUniqueUsername(email.split('@')[0] || displayName || `${DEFAULT_USERNAME_PREFIX}-${crypto.randomBytes(4).toString('hex')}`);

              user = new User({
                username: fallbackUsername,
                email,
                googleId,
                firstName,
                lastName,
                profilePicture,
                authProvider: 'google',
              });

              isNewUser = true;
            }
          }

          // Update profile fields when fresh data is available
          if (!user.firstName && firstName) {
            user.firstName = firstName;
          }

          if (!user.lastName && lastName) {
            user.lastName = lastName;
          }

          if (profilePicture && user.profilePicture !== profilePicture) {
            user.profilePicture = profilePicture;
          }

          const hasGoogleAuth = Boolean(user.googleId);
          const hasLocalAuth = user.authProvider === 'local' || user.authProvider === 'both';

          if (hasGoogleAuth && hasLocalAuth) {
            user.authProvider = 'both';
          } else if (hasGoogleAuth) {
            user.authProvider = 'google';
          } else if (hasLocalAuth) {
            user.authProvider = 'local';
          }

          await user.save({ validateModifiedOnly: true });

          const safeUser = await User.findById(user._id).select('-password');

          return done(null, safeUser.toObject(), { accountLinked, isNewUser });
        } catch (error) {
          console.error('[Passport] Google strategy error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user._id || user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user ? user.toObject() : null);
    } catch (error) {
      done(error);
    }
  });
}

module.exports = configurePassport;
