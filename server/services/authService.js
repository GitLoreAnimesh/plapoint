const User       = require('../models/User');
const { AppError } = require('../utils/appError');


const register = async ({ name, email, password, role, phone, address }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email already registered.', 409);

  const safeRole   = ['player','owner'].includes(role) ? role : 'player';
  const isApproved = safeRole === 'player'; 

  const user = await User.create({ name, email, password, role: safeRole, phone, address, isApproved });
  return user;
};


const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    throw new AppError('Invalid email or password.', 401);
  if (user.isBanned)
    throw new AppError(`Account banned: ${user.banReason}`, 403);
  return user;
};


const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};


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
