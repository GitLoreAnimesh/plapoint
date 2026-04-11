const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const json429 = (req, res) =>
  res.status(429).json({ error: 'Too many requests. Please slow down.' });

// Auth: 100 attempts per 15 min in dev, 15 in production
exports.authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             isDev ? 100 : 15,
  handler:         json429,
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true, // only count failed attempts
});

// General API: 500 req per minute in dev, 200 in production
exports.apiLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             isDev ? 500 : 200,
  handler:         json429,
  standardHeaders: true,
  legacyHeaders:   false,
});

// Booking creation: 50 per hour in dev, 20 in production
exports.bookingLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             isDev ? 50 : 20,
  handler:         json429,
  standardHeaders: true,
  legacyHeaders:   false,
});
