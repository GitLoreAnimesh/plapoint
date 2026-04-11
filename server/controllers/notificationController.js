const notifService = require('../services/notificationService');
const { asyncHandler } = require('../utils/appError');

exports.get = asyncHandler(async (req, res) => {
  const result = await notifService.getForUser(req.user._id);
  res.json({ success: true, ...result });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.user._id);
  res.json({ success: true });
});
