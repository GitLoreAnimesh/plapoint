const User    = require('../models/User');
const Ground  = require('../models/Ground');
const Booking = require('../models/Booking');
const { asyncHandler, AppError } = require('../utils/appError');

exports.getStats = asyncHandler(async (req, res) => {
  const [players, totalOwners, liveGrounds, totalBookings, revenue, pendingOwners, pendingGrounds] = await Promise.all([
    User.countDocuments({ role: 'player' }),
    User.countDocuments({ role: 'owner' }),
    Ground.countDocuments({ isApproved: true }),
    Booking.countDocuments(),
    Booking.aggregate([
      { $match: { status: { $in: ['confirmed','completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ role: 'owner', isApproved: false, isBanned: { $ne: true } }),
    Ground.countDocuments({ isApproved: false, isActive: true }),
  ]);
  res.json({
    success: true,
    stats: {
      players,
      owners:        totalOwners,
      grounds:       liveGrounds,
      bookings:      totalBookings,
      totalRevenue:  revenue[0]?.total || 0,
      pendingOwners,
      pendingGrounds,
    },
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const filter = { role: 'player' };
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, total });
});

exports.banUser = asyncHandler(async (req, res) => {
  const { isBanned, banReason } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBanned, banReason: banReason || '' },
    { new: true }
  );
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, user });
});

exports.getOwners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, approved } = req.query;
  const filter = { role: 'owner' };
  // approved query param: 'true' → approved only, 'false' → pending only
  if (approved === 'true')  filter.isApproved = true;
  if (approved === 'false') filter.isApproved = false;
  const [owners, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, owners, total });
});

exports.approveOwner = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;
  if (isApproved === undefined) throw new AppError('isApproved is required.', 400);
  const owner = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'owner' },
    { isApproved },
    { new: true }
  );
  if (!owner) throw new AppError('Owner not found.', 404);
  res.json({ success: true, owner });
});

exports.getGrounds = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, approved } = req.query;
  const filter = {};
  // approved query param: 'true' → live only, 'false' → pending only
  if (approved === 'true')  filter.isApproved = true;
  if (approved === 'false') filter.isApproved = false;
  const [grounds, total] = await Promise.all([
    Ground.find(filter).populate('owner','name email').sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit),
    Ground.countDocuments(filter),
  ]);
  res.json({ success: true, grounds, total });
});

exports.approveGround = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;
  if (isApproved === undefined) throw new AppError('isApproved is required.', 400);
  const ground = await Ground.findByIdAndUpdate(
    req.params.id,
    { isApproved },
    { new: true }
  );
  if (!ground) throw new AppError('Ground not found.', 404);
  res.json({ success: true, ground });
});

exports.deleteGround = asyncHandler(async (req, res) => {
  const ground = await Ground.findByIdAndDelete(req.params.id);
  if (!ground) throw new AppError('Ground not found.', 404);
  res.json({ success: true });
});

exports.getBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('player','name email phone address')
      .populate('ground','name city sport')
      .sort({ createdAt: -1 }).skip((+page-1)*+limit).limit(+limit),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, bookings, total });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const b = await Booking.findById(req.params.id);
  if (!b) throw new AppError('Booking not found.', 404);
  if (['cancelled','completed'].includes(b.status))
    throw new AppError('Booking is already ' + b.status + '.', 400);
  b.status       = 'cancelled';
  b.cancelledBy  = 'admin';
  b.cancelReason = reason || 'Cancelled by admin';
  await b.save();
  res.json({ success: true, booking: b });
});
