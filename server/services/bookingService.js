const Booking              = require('../models/Booking');
const { canTransition }    = require('../models/Booking');
const Ground               = require('../models/Ground');
const { push }             = require('./notificationService');
const { AppError }         = require('../utils/appError');
const logger               = require('../utils/logger');

// ─────────────────────────────────────────────────────
// Helper — emit bookingUpdated to all parties who care
// ─────────────────────────────────────────────────────
const emitBookingUpdate = (io, booking, groundOwnerId) => {
  if (!io) return;
  const payload = {
    bookingId:   booking._id.toString(),
    status:      booking.status,
    groundId:    booking.ground?._id?.toString() || booking.ground?.toString(),
    cancelledBy: booking.cancelledBy,
  };
  // Notify the owner's socket room
  io.to(`user_${groundOwnerId}`).emit('bookingUpdated', payload);
  // Notify the player's socket room
  io.to(`user_${booking.player}`).emit('bookingUpdated', payload);
};

// ─────────────────────────────────────────────────────
// createBooking
// ─────────────────────────────────────────────────────
const createBooking = async (playerId, playerName, body, io) => {
  const { groundId, date, startHour, endHour, paymentMode } = body;

  if (+endHour <= +startHour)
    throw new AppError('endHour must be after startHour.', 400);

  const ground = await Ground.findById(groundId).populate('owner', 'name email phone _id');
  if (!ground || !ground.isApproved || !ground.isActive)
    throw new AppError('Ground not available.', 404);

  const slot   = ground.slots?.find(s => s.startHour === +startHour && s.endHour === +endHour && !s.isBlocked);
  const amount = slot ? slot.price : ground.pricePerHour * (+endHour - +startHour);
  const d      = new Date(date); d.setHours(0, 0, 0, 0);

  const safeMode          = paymentMode === 'sslcommerz' ? 'sslcommerz' : 'pay_at_venue';
  const advConf           = ground.advancePayment;
  const advRequired       = advConf?.enabled && safeMode !== 'sslcommerz';

  const initPaymentStatus = safeMode === 'sslcommerz' ? 'pending' : 'unpaid';
  // pending_payment applies to: full gateway payment OR advance-required at-venue
  const initStatus        = (safeMode === 'sslcommerz' || advRequired) ? 'pending_payment' : 'pending';
  // 5-minute lock: any booking that starts in 'pending_payment' gets an expiry timestamp.
  // For SSL gateway payments, the player should complete within 5 mins.
  // For advance-required at-venue, the advance payment window is also 2 mins.
  const PAYMENT_TIMEOUT_MS = 2 * 60 * 1000;

  const booking = await Booking.create({
    player:        playerId,
    ground:        groundId,
    date:          d,
    startHour:     +startHour,
    endHour:       +endHour,
    slotLabel:     slot?.label || `${startHour}:00-${endHour}:00`,
    groundName:    ground.name,
    sport:         ground.sport,
    city:          ground.city,
    amount,
    paymentMode:   safeMode,
    paymentStatus: initPaymentStatus,
    status:        initStatus,
    advancePayment: advConf?.enabled ? {
      required: true,
      amount:   advConf.amount,
      status:   advRequired ? 'pending' : 'not_required',
    } : { required: false, status: 'not_required' },
    ...(initStatus === 'pending_payment' ? { paymentExpiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MS) } : {}),
  });

  const advNote = advRequired ? ' (advance payment pending)' : '';
  await push(io, ground.owner._id, 'new_booking', 'New Booking',
    `${playerName} booked ${ground.name} on ${d.toDateString()} at ${startHour}:00${advNote}`,
    { bookingId: booking._id });

  // Notify owner dashboard in real-time
  emitBookingUpdate(io, booking, ground.owner._id);

  logger.info(`Booking created | id:${booking._id} | player:${playerId} | ground:${groundId} | status:${initStatus}`);
  return booking;
};

// ─────────────────────────────────────────────────────
// getPlayerBookings
// ─────────────────────────────────────────────────────
const getPlayerBookings = async (playerId, { status } = {}) => {
  const filter = { player: playerId };
  if (status) filter.status = status;
  return Booking.find(filter)
    .populate({ path: 'ground', select: 'name city sport images address advancePayment', populate: { path: 'owner', select: 'name email phone' } })
    .sort({ createdAt: -1 });
};

// ─────────────────────────────────────────────────────
// cancelBooking  (player cancels their own booking)
// ─────────────────────────────────────────────────────
const cancelBooking = async (bookingId, playerId, playerName, reason, io) => {
  // Atomic: find the booking AND assert it still belongs to this player
  // AND that the current status allows a player to cancel.
  // We use findOneAndUpdate with a status condition so two simultaneous
  // cancel requests cannot both succeed — only one will find the document.
  const validFromStatuses = Object.entries(require('../models/Booking').VALID_TRANSITIONS.player)
    .filter(([, tos]) => tos.includes('cancelled'))
    .map(([from]) => from);

  const b = await Booking.findOneAndUpdate(
    {
      _id:    bookingId,
      player: playerId,
      status: { $in: validFromStatuses },   // ← atomic guard
    },
    {
      $set: {
        status:       'cancelled',
        cancelledBy:  'player',
        cancelReason: reason || 'Cancelled by player',
      },
      $inc: { __v: 1 },                     // bump version
    },
    { new: true, populate: [{ path: 'ground', select: 'owner name' }] }
  );

  if (!b) {
    // Could not find — either wrong owner or status already changed (race condition won)
    const existing = await Booking.findById(bookingId);
    if (!existing) throw new AppError('Booking not found.', 404);
    if (existing.player.toString() !== playerId.toString())
      throw new AppError('You can only cancel your own bookings.', 403);
    // Status wasn't in the valid list — already cancelled/completed
    logger.warn(`Invalid cancel attempt | booking:${bookingId} | player:${playerId} | currentStatus:${existing.status}`);
    throw new AppError(`Cannot cancel a booking that is already "${existing.status}".`, 409);
  }

  // Notify owner
  if (b.ground?.owner) {
    await push(io, b.ground.owner, 'booking_cancelled', 'Booking Cancelled by Player',
      `${playerName} cancelled booking for ${b.groundName} on ${new Date(b.date).toDateString()} at ${b.startHour}:00. Reason: ${b.cancelReason}`,
      { bookingId: b._id });

    emitBookingUpdate(io, b, b.ground.owner);
  }

  logger.info(`Booking cancelled by player | id:${bookingId} | player:${playerId}`);
  return b;
};

// ─────────────────────────────────────────────────────
// addReview
// ─────────────────────────────────────────────────────
const addReview = async (bookingId, playerId, { rating, comment }) => {
  const b = await Booking.findById(bookingId);
  if (!b || b.player.toString() !== playerId.toString())
    throw new AppError('Access denied.', 403);
  if (b.status !== 'completed')
    throw new AppError('Can only review completed bookings.', 400);
  if (b.review?.rating)
    throw new AppError('Already reviewed.', 400);

  b.review = { rating: +rating, comment, createdAt: new Date() };
  await b.save();

  const stats = await Booking.aggregate([
    { $match: { ground: b.ground, 'review.rating': { $exists: true } } },
    { $group: { _id: null, avg: { $avg: '$review.rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Ground.findByIdAndUpdate(b.ground, {
      rating: Math.round(stats[0].avg * 10) / 10,
      totalReviews: stats[0].count,
    });
  }
  return b;
};

// ─────────────────────────────────────────────────────
// getOwnerBookings
// ─────────────────────────────────────────────────────
const getOwnerBookings = async (ownerId, { status, date, page = 1, limit = 20 } = {}) => {
  const groundIds = (await Ground.find({ owner: ownerId }).select('_id')).map(g => g._id);
  const filter = { ground: { $in: groundIds } };
  if (status) filter.status = status;
  if (date) filter.date = new Date(date);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('player', 'name email phone address')
      .populate('ground', 'name city')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
    Booking.countDocuments(filter),
  ]);
  return { bookings, total };
};

// ─────────────────────────────────────────────────────
// updateBookingStatus  (owner action: confirm / cancel / complete / no_show)
// ─────────────────────────────────────────────────────
const updateBookingStatus = async (bookingId, ownerId, { status: toStatus, reason }, io) => {
  // Step 1 — verify ownership first (cheap read, no lock)
  const ownership = await Booking.findById(bookingId).populate('ground', 'owner name');
  if (!ownership)
    throw new AppError('Booking not found.', 404);
  if (!ownership.ground || ownership.ground.owner.toString() !== ownerId.toString())
    throw new AppError('Access denied.', 403);

  const fromStatus = ownership.status;

  // Step 2 — validate transition against state machine
  if (!canTransition('owner', fromStatus, toStatus)) {
    logger.warn(
      `Invalid transition | booking:${bookingId} | owner:${ownerId} | ${fromStatus} → ${toStatus}`
    );
    throw new AppError(
      `Cannot move booking from "${fromStatus}" to "${toStatus}". ` +
      (fromStatus === 'cancelled'
        ? 'This booking was already cancelled.'
        : fromStatus === 'completed'
        ? 'This booking is already completed.'
        : `Allowed actions from "${fromStatus}": ${(canTransition.table?.owner?.[fromStatus] || []).join(', ') || 'none'}.`),
      409  // 409 Conflict — not a client input error, the state changed under them
    );
  }

  // Step 3 — atomic conditional update
  // Only succeeds if status is STILL what we just read (prevents race condition).
  const updateFields = {
    status: toStatus,
    ...(toStatus === 'completed' && { paymentStatus: 'paid' }),
    ...(toStatus === 'cancelled' && {
      cancelledBy:   'owner',
      cancelReason:  reason || 'Cancelled by owner',
      // If SSLCommerz session was open, close it
      ...(ownership.paymentStatus === 'pending' && { paymentStatus: 'cancelled' }),
    }),
  };

  const b = await Booking.findOneAndUpdate(
    {
      _id:    bookingId,
      status: fromStatus,   // ← race-condition guard: reject if status changed between our read and write
    },
    { $set: updateFields, $inc: { __v: 1 } },
    { new: true, populate: [{ path: 'ground', select: 'owner name' }] }
  );

  if (!b) {
    // Status changed between our read and the write — another request won the race
    const fresh = await Booking.findById(bookingId);
    logger.warn(
      `Race condition detected | booking:${bookingId} | expected:${fromStatus} | actual:${fresh?.status}`
    );
    throw new AppError(
      `Booking status changed while processing (now "${fresh?.status}"). Please refresh and try again.`,
      409
    );
  }

  // Step 4 — notify player
  const messages = {
    confirmed: ['Booking Confirmed', `Your booking at ${b.groundName} on ${new Date(b.date).toDateString()} at ${b.startHour}:00 is confirmed!`],
    cancelled: ['Booking Cancelled by Owner', `Your booking at ${b.groundName} was cancelled. Reason: ${reason || 'No reason provided'}`],
    completed: ['Session Completed', `Your session at ${b.groundName} is complete. Leave a review!`],
  };
  const [title, message] = messages[toStatus] || [];
  if (title) await push(io, b.player, `booking_${toStatus}`, title, message, { bookingId: b._id });

  // Step 5 — broadcast real-time update to ALL parties
  emitBookingUpdate(io, b, ownerId);

  logger.info(`Booking updated | id:${bookingId} | owner:${ownerId} | ${fromStatus} → ${toStatus}`);
  return b;
};

module.exports = {
  createBooking, getPlayerBookings, cancelBooking, addReview,
  getOwnerBookings, updateBookingStatus,
};
