const SSLCommerzPayment = require('sslcommerz-lts');
const Booking           = require('../models/Booking');
const { push }          = require('./notificationService');
const { AppError }      = require('../utils/appError');
const logger            = require('../utils/logger');

const isLive      = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const storeId     = process.env.SSLCOMMERZ_STORE_ID     || '';
const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD || '';

const clientBase  = () => process.env.CLIENT_URL || 'http://localhost:3000';
const apiBase     = () => {
  const port = process.env.PORT || 5000;
  return process.env.API_BASE_URL || `http://localhost:${port}`;
};

const generateTranId = (bookingId, prefix = 'PP') =>
  `${prefix}-${bookingId}-${Date.now()}`;


const initiatePayment = async (bookingId, player) => {
  const booking = await Booking.findById(bookingId).populate('ground', 'name city');
  if (!booking)
    throw new AppError('Booking not found.', 404);
  if (booking.player.toString() !== player._id.toString())
    throw new AppError('Access denied.', 403);
  if (booking.paymentMode !== 'sslcommerz')
    throw new AppError('This booking does not use SSLCommerz.', 400);
  if (booking.paymentStatus === 'paid')
    throw new AppError('Already paid.', 400);

  const tranId = generateTranId(bookingId, 'PP');
  const base   = apiBase();
  const cb     = clientBase();

  const data = {
    total_amount:     booking.amount,
    currency:         'BDT',
    tran_id:          tranId,
    success_url:      `${base}/api/payment/ssl/success`,
    fail_url:         `${base}/api/payment/ssl/fail`,
    cancel_url:       `${base}/api/payment/ssl/cancel`,
    ipn_url:          `${base}/api/payment/ssl/ipn`,
    shipping_method:  'NO',
    product_name:     `${booking.groundName} — ${booking.slotLabel}`,
    product_category: 'Sports Booking',
    product_profile:  'non-physical-goods',
    cus_name:         player.name  || 'Customer',
    cus_email:        player.email || 'customer@example.com',
    cus_add1:         player.address || 'Dhaka',
    cus_city:         booking.city || 'Dhaka',
    cus_country:      'Bangladesh',
    cus_phone:        player.phone || '01700000000',
    value_a:          bookingId.toString(),
    value_b:          player._id.toString(),
    value_c:          cb,
    value_d:          'full',       
  };

  const sslcz = new SSLCommerzPayment(storeId, storePasswd, isLive);
  let apiResponse;
  try {
    apiResponse = await sslcz.init(data);
  } catch (err) {
    logger.error('SSLCommerz init error: ' + err.message);
    throw new AppError('Payment gateway unreachable. Please try again.', 502);
  }

  if (!apiResponse || apiResponse.status === 'FAILED' || !apiResponse.GatewayPageURL) {
    logger.error('SSLCommerz init failed: ' + JSON.stringify(apiResponse));
    throw new AppError(
      apiResponse?.failedreason || 'Payment gateway error. Check SSLCommerz credentials.',
      502
    );
  }

  booking.sslPayment.tranId         = tranId;
  booking.sslPayment.sessionKey     = apiResponse.sessionkey || '';
  booking.sslPayment.gatewayPageUrl = apiResponse.GatewayPageURL;
  booking.paymentStatus             = 'pending';
  booking.status                    = 'pending_payment';
  await booking.save();

  logger.info(`SSLCommerz session | booking:${bookingId} | tran:${tranId}`);
  return { gatewayUrl: apiResponse.GatewayPageURL, tranId };
};

const initiateAdvancePayment = async (bookingId, player) => {
  const booking = await Booking.findById(bookingId).populate('ground', 'name city advancePayment');
  if (!booking)
    throw new AppError('Booking not found.', 404);
  if (booking.player.toString() !== player._id.toString())
    throw new AppError('Access denied.', 403);
  if (!booking.advancePayment?.required)
    throw new AppError('No advance payment required for this booking.', 400);
  if (booking.advancePayment.status === 'paid')
    throw new AppError('Advance already paid.', 400);

  const advAmount = booking.advancePayment.amount;
  if (!advAmount || advAmount <= 0)
    throw new AppError('Invalid advance amount.', 400);

  const tranId = generateTranId(bookingId, 'ADV');
  const base   = apiBase();
  const cb     = clientBase();

  const data = {
    total_amount:     advAmount,
    currency:         'BDT',
    tran_id:          tranId,
    success_url:      `${base}/api/payment/ssl/success`,
    fail_url:         `${base}/api/payment/ssl/fail`,
    cancel_url:       `${base}/api/payment/ssl/cancel`,
    ipn_url:          `${base}/api/payment/ssl/ipn`,
    shipping_method:  'NO',
    product_name:     `Advance — ${booking.groundName}`,
    product_category: 'Sports Booking Advance',
    product_profile:  'non-physical-goods',
    cus_name:         player.name  || 'Customer',
    cus_email:        player.email || 'customer@example.com',
    cus_add1:         player.address || 'Dhaka',
    cus_city:         booking.city || 'Dhaka',
    cus_country:      'Bangladesh',
    cus_phone:        player.phone || '01700000000',
    value_a:          bookingId.toString(),
    value_b:          player._id.toString(),
    value_c:          cb,
    value_d:          'advance',        
  };

  const sslcz = new SSLCommerzPayment(storeId, storePasswd, isLive);
  let apiResponse;
  try {
    apiResponse = await sslcz.init(data);
  } catch (err) {
    logger.error('SSLCommerz advance init error: ' + err.message);
    throw new AppError('Payment gateway unreachable. Please try again.', 502);
  }

  if (!apiResponse || apiResponse.status === 'FAILED' || !apiResponse.GatewayPageURL) {
    logger.error('SSLCommerz advance init failed: ' + JSON.stringify(apiResponse));
    throw new AppError(
      apiResponse?.failedreason || 'Payment gateway error.',
      502
    );
  }

  booking.advancePayment.tranId  = tranId;
  booking.advancePayment.status  = 'pending';
  await booking.save();

  logger.info(`SSLCommerz advance session | booking:${bookingId} | tran:${tranId}`);
  return { gatewayUrl: apiResponse.GatewayPageURL, tranId };
};


const handleSuccess = async (body, io) => {
  const {
    val_id, tran_id, amount, bank_tran_id, card_type,
    value_a: bookingId, value_c: cb, value_d: payType,
  } = body;

  if (!tran_id || !bookingId) throw new AppError('Invalid callback.', 400);

  const booking = await Booking.findById(bookingId).populate('ground', 'name city owner').populate('player', 'name');
  if (!booking) throw new AppError('Booking not found.', 404);

  const sslcz = new SSLCommerzPayment(storeId, storePasswd, isLive);
  let validation;
  try {
    validation = await sslcz.validate({ val_id });
  } catch (err) {
    logger.error('SSLCommerz validate error: ' + err.message);
    throw new AppError('Payment validation failed.', 502);
  }

  if (validation?.status !== 'VALID' && validation?.status !== 'VALIDATED') {
    logger.error(`Validation failed val_id:${val_id} — ${JSON.stringify(validation)}`);
    booking.paymentStatus = 'failed';
    booking.status        = 'cancelled';
    booking.cancelledBy   = 'system';
    booking.cancelReason  = 'Payment validation failed';
    await booking.save();
    throw new AppError('Payment could not be verified.', 402);
  }

  const paidAmount = parseFloat(amount);

  if (payType === 'advance') {
    if (booking.advancePayment.status === 'paid') return { booking, cb: cb || clientBase() };

    booking.advancePayment.status   = 'paid';
    booking.advancePayment.valId    = val_id    || '';
    booking.advancePayment.cardType = card_type || '';
    booking.advancePayment.paidAt   = new Date();
    booking.advancePayment.ipnRaw   = body;
    booking.status                  = 'confirmed';
    await booking.save();

    await push(io, booking.player._id, 'advance_paid', 'Advance Payment Confirmed!',
      `Your advance of ৳${paidAmount} for ${booking.groundName} is confirmed. Booking active!`,
      { bookingId: booking._id });

    if (booking.ground?.owner) {
      await push(io, booking.ground.owner, 'advance_paid', 'Advance Received',
        `${booking.player?.name || 'A player'} paid ৳${paidAmount} advance for ${booking.groundName}.`,
        { bookingId: booking._id });
      const advPayload = {
        bookingId: booking._id.toString(),
        status:    booking.status,
        groundId:  booking.ground._id?.toString() || booking.ground.toString(),
      };
      io.to('user_' + booking.ground.owner.toString()).emit('bookingUpdated', advPayload);
      io.to('user_' + booking.player._id?.toString()).emit('bookingUpdated', advPayload);
    }

    logger.info(`Advance paid | booking:${bookingId} | val_id:${val_id}`);
    return { booking, cb: cb || clientBase(), payType: 'advance' };

  } else {
    if (booking.paymentStatus === 'paid') return { booking, cb: cb || clientBase() };

    if (Math.abs(paidAmount - booking.amount) > 1) {
      logger.error(`Amount mismatch | booking:${bookingId} | expected:${booking.amount} | got:${paidAmount}`);
      booking.paymentStatus = 'failed';
      await booking.save();
      throw new AppError('Payment amount mismatch.', 402);
    }

    booking.paymentStatus         = 'paid';
    booking.status                = 'pending'; 
    booking.sslPayment.valId      = val_id      || '';
    booking.sslPayment.bankTranId = bank_tran_id || '';
    booking.sslPayment.cardType   = card_type   || '';
    booking.sslPayment.amount     = paidAmount;
    booking.sslPayment.paidAt     = new Date();
    booking.sslPayment.ipnRaw     = body;
    await booking.save();

    await push(io, booking.player._id, 'payment_success', 'Payment Received!',
      `Your payment of ৳${paidAmount} for ${booking.groundName} on ${new Date(booking.date).toDateString()} at ${booking.startHour}:00 has been received. Awaiting owner confirmation.`,
      { bookingId: booking._id });

    if (booking.ground?.owner) {
      await push(io, booking.ground.owner, 'payment_success', 'Full Payment Received',
        `${booking.player?.name || 'A player'} paid ৳${paidAmount} for ${booking.groundName}.`,
        { bookingId: booking._id });
      const fullPayload = {
        bookingId: booking._id.toString(),
        status:    booking.status,
        groundId:  booking.ground._id?.toString() || booking.ground.toString(),
      };
      io.to('user_' + booking.ground.owner.toString()).emit('bookingUpdated', fullPayload);
      io.to('user_' + booking.player._id?.toString()).emit('bookingUpdated', fullPayload);
    }

    logger.info(`Full payment received | booking:${bookingId} | val_id:${val_id}`);
    return { booking, cb: cb || clientBase(), payType: 'full' };
  }
};


const handleFail = async (body) => {
  const { tran_id, value_a: bookingId, value_c: cb, value_d: payType } = body;
  if (!bookingId) return { cb: cb || clientBase() };

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.paymentStatus === 'paid') return { cb: cb || clientBase() };

  if (payType === 'advance') {
    booking.advancePayment.status = 'failed';
    booking.advancePayment.ipnRaw = body;
    booking.status                = 'cancelled';
    booking.cancelledBy           = 'system';
    booking.cancelReason          = 'Advance payment failed at gateway';
  } else {
    booking.paymentStatus    = 'failed';
    booking.status           = 'cancelled';
    booking.cancelledBy      = 'system';
    booking.cancelReason     = 'Payment failed at gateway';
    booking.sslPayment.ipnRaw = body;
  }
  await booking.save();
  logger.info(`Payment failed | booking:${bookingId} | tran:${tran_id}`);
  return { cb: cb || clientBase() };
};

const handleCancel = async (body) => {
  const { tran_id, value_a: bookingId, value_c: cb, value_d: payType } = body;
  if (!bookingId) return { cb: cb || clientBase() };

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.paymentStatus === 'paid') return { cb: cb || clientBase() };

  if (payType === 'advance') {
    booking.advancePayment.status = 'failed';
    booking.advancePayment.ipnRaw = body;
    booking.status                = 'cancelled';
    booking.cancelledBy           = 'player';
    booking.cancelReason          = 'Advance payment cancelled by player';
  } else {
    booking.paymentStatus    = 'cancelled';
    booking.status           = 'cancelled';
    booking.cancelledBy      = 'player';
    booking.cancelReason     = 'Payment cancelled by player';
    booking.sslPayment.ipnRaw = body;
  }
  await booking.save();
  logger.info(`Payment cancelled | booking:${bookingId} | tran:${tran_id}`);
  return { cb: cb || clientBase() };
};


const handleIPN = async (body, io) => {
  const { status, value_a: bookingId } = body;
  if (!bookingId) return;
  logger.info(`IPN | booking:${bookingId} | status:${status}`);
  try {
    if (status === 'VALID' || status === 'VALIDATED') {
      await handleSuccess(body, io);
    } else if (status === 'FAILED') {
      await handleFail(body);
    } else if (status === 'CANCELLED') {
      await handleCancel(body);
    }
  } catch (err) {
    logger.error('IPN processing error: ' + err.message);
  }
};

module.exports = {
  initiatePayment,
  initiateAdvancePayment,
  handleSuccess,
  handleFail,
  handleCancel,
  handleIPN,
};
