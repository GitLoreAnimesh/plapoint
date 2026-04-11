const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  let { message, statusCode = 500 } = err;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = 409;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join('; ');
    statusCode = 422;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}.`;
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  { message = 'Invalid token.';          statusCode = 401; }
  if (err.name === 'TokenExpiredError')  { message = 'TOKEN_EXPIRED';           statusCode = 401; }

  // Custom app error
  if (err.message === 'SLOT_TAKEN') {
    message = 'This slot is already booked. Please choose another time.';
    statusCode = 409;
  }

  // Log non-operational errors (unexpected bugs)
  if (!err.isOperational) {
    logger.error(`[UNHANDLED] ${req.method} ${req.path} — ${err.stack}`);
  }

  res.status(statusCode).json({
    success: false,
    error:   message || 'Something went wrong.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
