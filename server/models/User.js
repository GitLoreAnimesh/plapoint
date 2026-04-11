const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, minlength: 6, select: false },
  role:       { type: String, enum: ['player', 'owner', 'admin'], default: 'player' },
  phone:      { type: String, default: '' },
  address:    { type: String, default: '' },
  avatar:     { type: String, default: '' },
  isApproved: { type: Boolean, default: false },
  isBanned:   { type: Boolean, default: false },
  banReason:  { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function (c) { return bcrypt.compare(c, this.password); };

module.exports = mongoose.model('User', userSchema);