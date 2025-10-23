const jwt = require('jsonwebtoken');

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return process.env.JWT_SECRET;
}

function getJwtExpiry(defaultExpiry = '30d') {
  return process.env.JWT_EXPIRE || defaultExpiry;
}

function signAuthToken(payload, options = {}) {
  const secret = getJwtSecret();
  const expiresIn = options.expiresIn || getJwtExpiry();
  return jwt.sign(payload, secret, { expiresIn, ...options });
}

function decodeToken(token) {
  try {
    return jwt.decode(token, { json: true });
  } catch (error) {
    return null;
  }
}

module.exports = {
  signAuthToken,
  decodeToken,
};
