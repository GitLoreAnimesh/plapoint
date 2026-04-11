const bookingService = require('../services/bookingService');
const { asyncHandler } = require('../utils/appError');

exports.create = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(
    req.user._id, req.user.name, req.body, req.app.get('io')
  );
  res.status(201).json({ success: true, booking });
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getPlayerBookings(req.user._id, req.query);
  res.json({ success: true, bookings });
});

exports.getOne = asyncHandler(async (req, res) => {
  const Booking = require('../models/Booking');
  const b = await Booking.findById(req.params.id)
    .populate('player', 'name email phone address')
    .populate({ path: 'ground', populate: { path: 'owner', select: 'name email phone' } });
  if (!b) return res.status(404).json({ error: 'Not found.' });
  res.json({ success: true, booking: b });
});

exports.cancel = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id, req.user._id, req.user.name, req.body.reason, req.app.get('io')
  );
  res.json({ success: true, booking });
});

exports.review = asyncHandler(async (req, res) => {
  const booking = await bookingService.addReview(req.params.id, req.user._id, req.body);
  res.json({ success: true, booking });
});
