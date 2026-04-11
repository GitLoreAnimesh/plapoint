const authService = require('../services/authService');
const { sendTokens, refreshHandler } = require('../middleware/auth');
const { asyncHandler } = require('../utils/appError');

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  sendTokens(user, 201, res);
});

exports.login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  sendTokens(user, 200, res);
});

exports.logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true });
};

exports.refresh = refreshHandler;

exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  // Return same safe shape as sendTokens so client always gets consistent user object
  res.json({
    success: true,
    user: {
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      phone:      user.phone,
      address:    user.address,
      isApproved: user.isApproved,
      isBanned:   user.isBanned,
    },
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.json({
    success: true,
    user: {
      _id:        user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      phone:      user.phone,
      address:    user.address,
      isApproved: user.isApproved,
      isBanned:   user.isBanned,
    },
  });
});
