const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const logger  = require('../utils/logger');

// ── Token helpers ─────────────────────────────────────
const signAccess  = (id) => jwt.sign({ id }, process.env.JWT_ACCESS_SECRET,  { expiresIn: process.env.JWT_ACCESS_EXPIRE  || '15m' });
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'  });

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
};

/**
 * sendTokens — issues access + refresh tokens.
 * Access token goes in JSON body (frontend stores in memory).
 * Refresh token goes in HttpOnly cookie only.
 */
const sendTokens = (user, statusCode, res) => {
  const accessToken  = signAccess(user._id);
  const refreshToken = signRefresh(user._id);

  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const safeUser = {
    _id:        user._id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    phone:      user.phone,
    address:    user.address,
    isApproved: user.isApproved,
  };
  res.status(statusCode).json({ success: true, accessToken, user: safeUser });
};

// ── protect ───────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const { id } = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    if (user.isBanned) return res.status(403).json({ error: `Account banned: ${user.banReason}` });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// ── role guard ────────────────────────────────────────
const role = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  next();
};

// ── refresh endpoint handler ──────────────────────────
const refreshHandler = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token.' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(id);
    if (!user || user.isBanned) return res.status(401).json({ error: 'Unauthorized.' });
    const accessToken = signAccess(user._id);
    res.json({ success: true, accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
  }
};

module.exports = { protect, role, sendTokens, refreshHandler };
