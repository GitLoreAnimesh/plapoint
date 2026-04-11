const Ground         = require('../models/Ground');
const Booking        = require('../models/Booking');
const bookingService = require('../services/bookingService');
const groundService  = require('../services/groundService');
const { asyncHandler } = require('../utils/appError');

exports.getDashboard = asyncHandler(async (req, res) => {
  const grounds   = await Ground.find({ owner: req.user._id }).select('_id name isApproved isActive');
  const groundIds = grounds.map(g => g._id);
  const today     = new Date(); today.setHours(0,0,0,0);
  const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const monthAgo  = new Date(today); monthAgo.setDate(today.getDate() - 30);

  const [todayCount, pendingCount, todayBookings, weekRev, monthRev] = await Promise.all([
    Booking.countDocuments({ ground: { $in: groundIds }, date: { $gte: today, $lt: tomorrow } }),
    Booking.countDocuments({ ground: { $in: groundIds }, status: 'pending' }),
    Booking.find({ ground: { $in: groundIds }, date: { $gte: today, $lt: tomorrow } })
      .populate('player', 'name phone email')
      .sort({ startHour: 1 }),
    Booking.aggregate([
      { $match: { ground: { $in: groundIds }, status: { $in: ['confirmed','completed'] }, createdAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.aggregate([
      { $match: { ground: { $in: groundIds }, status: { $in: ['confirmed','completed'] }, createdAt: { $gte: monthAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    success: true,
    grounds,
    todayBookings,
    stats: {
      todayCount,
      pendingCount,
      weekRevenue:  weekRev[0]?.total  || 0,
      monthRevenue: monthRev[0]?.total || 0,
    },
  });
});

exports.getBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getOwnerBookings(req.user._id, req.query);
  res.json({ success: true, ...result });
});

exports.updateBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id, req.user._id, req.body, req.app.get('io')
  );
  res.json({ success: true, booking });
});

exports.getGrounds = asyncHandler(async (req, res) => {
  const grounds = await Ground.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, grounds });
});

exports.deleteGround = asyncHandler(async (req, res) => {
  const result = await groundService.deleteGround(req.params.id, req.user._id);
  res.json({ success: true, ...result });
});

exports.setAdvancePayment = asyncHandler(async (req, res) => {
  const ground = await groundService.setAdvancePayment(req.params.id, req.user._id, req.body);
  res.json({ success: true, ground });
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const groundIds = (await Ground.find({ owner: req.user._id }).select('_id')).map(g => g._id);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year   = new Date().getFullYear();
  const [monthly, bySport] = await Promise.all([
    Booking.aggregate([
      { $match: { ground: { $in: groundIds }, status: { $in: ['confirmed','completed'] }, date: { $gte: new Date(`${year}-01-01`) } } },
      { $group: { _id: { $month: '$date' }, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { ground: { $in: groundIds }, status: { $in: ['confirmed','completed'] } } },
      { $group: { _id: '$sport', revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const monthlyMap = MONTHS.map((m, i) => {
    const f = monthly.find(x => x._id === i + 1);
    return { month: m, revenue: f?.revenue || 0, bookings: f?.count || 0 };
  });
  res.json({ success: true, monthly: monthlyMap, bySport });
});
