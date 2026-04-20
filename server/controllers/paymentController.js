const paymentService = require('../services/paymentService');
const { asyncHandler, AppError } = require('../utils/appError');
const logger = require('../utils/logger');

const DEFAULT_CLIENT = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * POST /api/payment/initiate
 * Player initiates full SSLCommerz payment → returns gateway URL.
 */
exports.initiate = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) throw new AppError('bookingId is required.', 400);
  const result = await paymentService.initiatePayment(bookingId, req.user);
  res.json({ success: true, ...result });
});


exports.initiateAdvance = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) throw new AppError('bookingId is required.', 400);
  const result = await paymentService.initiateAdvancePayment(bookingId, req.user);
  res.json({ success: true, ...result });
});


exports.sslSuccess = asyncHandler(async (req, res) => {
  try {
    const { booking, cb, payType } = await paymentService.handleSuccess(req.body, req.app.get('io'));
    const redirectPath = payType === 'advance' ? 'advance_success' : 'success';
    return res.redirect(`${cb}/bookings?payment=${redirectPath}&bookingId=${booking._id}`);
  } catch (err) {
    logger.error('SSL success handler error: ' + err.message);
    const cb = req.body?.value_c || DEFAULT_CLIENT;
    return res.redirect(`${cb}/bookings?payment=failed&reason=${encodeURIComponent(err.message)}`);
  }
});


exports.sslFail = asyncHandler(async (req, res) => {
  const { cb } = await paymentService.handleFail(req.body);
  res.redirect(`${cb}/bookings?payment=failed`);
});


exports.sslCancel = asyncHandler(async (req, res) => {
  const { cb } = await paymentService.handleCancel(req.body);
  res.redirect(`${cb}/bookings?payment=cancelled`);
});


exports.sslIPN = asyncHandler(async (req, res) => {
  res.status(200).json({ received: true });
  paymentService.handleIPN(req.body, req.app.get('io')).catch(err =>
    logger.error('IPN async error: ' + err.message)
  );
});


exports.getStatus = asyncHandler(async (req, res) => {
  const Booking = require('../models/Booking');
  const b = await Booking.findById(req.params.bookingId)
    .select('status paymentStatus paymentMode sslPayment advancePayment amount groundName slotLabel');
  if (!b) throw new AppError('Booking not found.', 404);
  res.json({ success: true, booking: b });
});
