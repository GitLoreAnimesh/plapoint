const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  label:     { type: String },
  startHour: { type: Number, required: true },
  endHour:   { type: Number, required: true },
  price:     { type: Number, required: true },
  isBlocked: { type: Boolean, default: false },
});

const groundSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:         { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  sport:        { type: String, required: true, enum: ['badminton','futsal','basketball','tennis','volleyball'] },
  city:         { type: String, required: true },
  area:         { type: String, default: '' },
  address:      { type: String, default: '' },
  images:       [{ type: String }],
  amenities:    [{ type: String }],
  pricePerHour: { type: Number, required: true },
  slots:        [slotSchema],
  openHour:     { type: Number, default: 6 },
  closeHour:    { type: Number, default: 23 },
  isApproved:   { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
  rating:       { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  // Advance payment configuration — collected via payment gateway
  advancePayment: {
    enabled:      { type: Boolean, default: false },
    amount:       { type: Number, default: 0 },     // fixed amount in BDT
    instructions: { type: String, default: '' },    // custom note to player
  },
}, { timestamps: true });

groundSchema.index({ city: 1, sport: 1 });
groundSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Ground', groundSchema);
