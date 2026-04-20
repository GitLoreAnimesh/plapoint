const Notification = require('../models/Notification');

const push = async (io, recipientId, type, title, message, data = {}) => {
  const notification = await Notification.create({ recipient: recipientId, type, title, message, data });
  io?.to(`user_${recipientId}`).emit('notification', notification);
  return notification;
};

const getForUser = async (userId) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);
  return { notifications, unread };
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
};

module.exports = { push, getForUser, markAllRead };
