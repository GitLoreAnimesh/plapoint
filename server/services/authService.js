const User       = require('../models/User');
const { AppError } = require('../utils/appError');

/**
 * Registers a new user. Only 'player' and 'owner' roles allowed publicly.
 * Players are auto-approved; owners need admin approval.
 */
const register = async ({ name, email, password, role, phone, address }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email already registered.', 409);

  const safeRole   = ['player','owner'].includes(role) ? role : 'player';
  const isApproved = safeRole === 'player'; // owners need admin approval

  const user = await User.create({ name, email, password, role: safeRole, phone, address, isApproved });
  return user;
};

/**
 * Validates credentials and returns the user document.
 * Throws AppError on failure so the controller stays clean.
 */
const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    throw new AppError('Invalid email or password.', 401);
  if (user.isBanned)
    throw new AppError(`Account banned: ${user.banReason}`, 403);
  return user;
};

/**
 * Returns the full user document by ID (used by /me endpoint).
 */
const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

/**
 * Updates editable profile fields.
 */
const updateProfile = async (userId, { name, phone, address }) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { name, phone, address },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

module.exports = { register, login, getMe, updateProfile };
