const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  isRead:  { type: Boolean, default: false },
  data:    mongoose.Schema.Types.Mixed,
}, { timestamps: true });
schema.index({ recipient: 1, isRead: 1 });
module.exports = mongoose.model('Notification', schema);
