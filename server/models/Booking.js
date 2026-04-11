const mongoose = require('mongoose');

// ── Valid state machine transitions ───────────────────
// Defines what status an owner/player/system is allowed to move TO from each current status.
// This is the single source of truth for all transition rules.
const VALID_TRANSITIONS = {
  owner: {
    pending_payment: ['cancelled'],
    pending:         ['confirmed', 'cancelled'],
    confirmed:       ['completed', 'cancelled', 'no_show'],
    // terminal states — no transitions allowed
    completed:       [],
    cancelled:       [],
    no_show:         [],
  },
  player: {
    pending_payment: ['cancelled'],
    pending:         ['cancelled'],
    confirmed:       ['cancelled'],
    completed:       [],
    cancelled:       [],
    no_show:         [],
  },
  system: {
    pending_payment: ['pending', 'cancelled'],
    pending:         ['confirmed', 'cancelled'],
    confirmed:       ['completed'],
    completed:       [],
    cancelled:       [],
    no_show:         [],
  },
};

const canTransition = (actor, from, to) =>
  VALID_TRANSITIONS[actor]?.[from]?.includes(to) ?? false;

const bookingSchema = new mongoose.Schema({
  player:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ground:        { type: mongoose.Schema.Types.ObjectId, ref: 'Ground', required: true },
  date:          { type: Date, required: true },
  startHour:     { type: Number, required: true },
  endHour:       { type: Number, required: true },
  slotLabel:     { type: String, default: '' },
  groundName:    { type: String, default: '' },
  sport:         { type: String, default: '' },
  city:          { type: String, default: '' },
  amount:        { type: Number, required: true },

  // ── Payment ───────────────────────────────────────────
  paymentMode: {
    type: String,
    enum: ['pay_at_venue', 'sslcommerz'],
    default: 'pay_at_venue',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'unpaid',
  },

  // SSLCommerz payment details
  sslPayment: {
    tranId:         { type: String, default: '' },
    sessionKey:     { type: String, default: '' },
    gatewayPageUrl: { type: String, default: '' },
    valId:          { type: String, default: '' },
    bankTranId:     { type: String, default: '' },
    cardType:       { type: String, default: '' },
    amount:         { type: Number, default: 0  },
    currency:       { type: String, default: 'BDT' },
    paidAt:         { type: Date },
    ipnRaw:         { type: Object },
  },

  // ── Booking status ────────────────────────────────────
  status: {
    type: String,
    enum: ['pending_payment', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending',
  },
  cancelledBy:  { type: String, default: '' },
  cancelReason: { type: String, default: '' },

  // ── Optimistic concurrency — increment on every write ─
  // Prevents two simultaneous requests from both succeeding on stale data.
  __v: { type: Number, default: 0 },

  // ── Advance payment (via SSLCommerz) ──────────────────
  advancePayment: {
    required:  { type: Boolean, default: false },
    amount:    { type: Number, default: 0 },
    status:    { type: String, enum: ['not_required','pending','paid','failed'], default: 'not_required' },
    tranId:    { type: String, default: '' },
    valId:     { type: String, default: '' },
    cardType:  { type: String, default: '' },
    paidAt:    { type: Date },
    ipnRaw:    { type: Object },
  },

  // ── Review ────────────────────────────────────────────
  review: {
    rating:    Number,
    comment:   String,
    createdAt: Date,
  },
}, { timestamps: true });

// ── Anti double-booking guard ─────────────────────────
bookingSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  const clash = await this.constructor.findOne({
    ground: this.ground,
    date:   this.date,
    status: { $in: ['pending_payment', 'pending', 'confirmed'] },
    $or: [{ startHour: { $lt: this.endHour }, endHour: { $gt: this.startHour } }],
  });
  if (clash) return next(new Error('SLOT_TAKEN'));
  next();
});

bookingSchema.index({ player: 1 });
bookingSchema.index({ ground: 1, date: 1 });
bookingSchema.index({ 'sslPayment.tranId': 1 }, { sparse: true });
bookingSchema.index({ 'advancePayment.tranId': 1 }, { sparse: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
module.exports.canTransition = canTransition;
module.exports.VALID_TRANSITIONS = VALID_TRANSITIONS;
