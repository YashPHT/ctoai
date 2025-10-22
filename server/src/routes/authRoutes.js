const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const passport = require('passport');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { signAuthToken, decodeToken } = require('../utils/token');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OAuth attempts detected. Please try again shortly.'
  }
});

const defaultClientOrigin = (process.env.CORS_ORIGIN || 'http://localhost:8080').replace(/\/$/, '');
const SUCCESS_REDIRECT_BASE = process.env.OAUTH_SUCCESS_REDIRECT || `${defaultClientOrigin}/auth-callback.html`;
const FAILURE_REDIRECT_BASE = process.env.OAUTH_FAILURE_REDIRECT || `${defaultClientOrigin}/login.html`;

function buildRedirectUrl(base, params = {}) {
  let target = base;

  try {
    target = new URL(base).toString();
  } catch (error) {
    const sanitizedBase = base.startsWith('/') ? base : `/${base}`;
    target = `${defaultClientOrigin}${sanitizedBase}`;
  }

  const url = new URL(target);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function buildSuccessRedirect(params = {}) {
  return buildRedirectUrl(SUCCESS_REDIRECT_BASE, {
    provider: 'google',
    ...params
  });
}

function buildFailureRedirect(params = {}) {
  return buildRedirectUrl(FAILURE_REDIRECT_BASE, {
    provider: 'google',
    ...params
  });
}

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', auth, (req, res) => {
  try {
    const token = signAuthToken({ id: req.user._id });
    const decoded = decodeToken(token);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token,
        expiresAt: decoded?.exp ? decoded.exp * 1000 : null,
        expiresIn: process.env.JWT_EXPIRE || '30d',
        user: req.user
      }
    });
  } catch (error) {
    console.error('[AuthRoutes] Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to refresh token'
    });
  }
});
router.get('/me', auth, authController.getMe);

router.get('/google', oauthLimiter, (req, res, next) => {
  if (!req.session) {
    console.error('[AuthRoutes] Session is not available for OAuth state handling.');
    return res.redirect(buildFailureRedirect({
      error: 'session_unavailable',
      message: 'Sign-in session could not be created. Please enable cookies and try again.'
    }));
  }

  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state
  })(req, res, next);
});

router.get('/google/callback', oauthLimiter, (req, res, next) => {
  if (req.query.error) {
    console.warn(`[AuthRoutes] Google OAuth error: ${req.query.error}`);
    return res.redirect(buildFailureRedirect({
      error: req.query.error,
      message: req.query.error_description || 'Google sign-in was cancelled.'
    }));
  }

  if (!req.session) {
    console.error('[AuthRoutes] Session unavailable during OAuth callback.');
    return res.redirect(buildFailureRedirect({
      error: 'session_unavailable',
      message: 'Session expired during sign-in. Please try again.'
    }));
  }

  const expectedState = req.session.oauthState;
  if (!expectedState || !req.query.state || req.query.state !== expectedState) {
    return res.redirect(buildFailureRedirect({
      error: 'invalid_state',
      message: 'The sign-in attempt could not be verified. Please try again.'
    }));
  }

  delete req.session.oauthState;

  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('[AuthRoutes] Google authentication error:', err);
      return res.redirect(buildFailureRedirect({
        error: 'server_error',
        message: 'Unable to complete Google sign-in. Please try again.'
      }));
    }

    if (!user) {
      return res.redirect(buildFailureRedirect({
        error: 'authentication_failed',
        message: 'Google authentication failed. Please try again.'
      }));
    }

    req.user = user;
    req.authInfo = info || {};
    return next();
  })(req, res, next);
}, (req, res) => {
  try {
    const token = signAuthToken({ id: req.user._id });
    const decoded = decodeToken(token);

    const redirectUrl = buildSuccessRedirect({
      token,
      expiresAt: decoded?.exp ? decoded.exp * 1000 : undefined,
      expiresIn: process.env.JWT_EXPIRE || '30d',
      isNewUser: req.authInfo?.isNewUser ? '1' : undefined,
      linked: req.authInfo?.accountLinked ? '1' : undefined
    });

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[AuthRoutes] Error creating token for Google user:', error);
    res.redirect(buildFailureRedirect({
      error: 'token_error',
      message: 'Could not create a session token. Please try signing in again.'
    }));
  }
});

module.exports = router;
