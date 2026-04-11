/**
 * AppError — structured error with HTTP status code.
 * Throw this anywhere in services/controllers to get a clean JSON response.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * asyncHandler — wraps async route/middleware so you never need try/catch.
 * Forwards any rejection to Express next().
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, asyncHandler };
