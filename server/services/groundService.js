const Ground     = require('../models/Ground');
const Booking    = require('../models/Booking');
const { AppError } = require('../utils/appError');
const fs         = require('fs');
const path       = require('path');

const searchGrounds = async ({ sport, city, area, page = 1, limit = 12 }) => {
  const filter = { isApproved: true, isActive: true };
  if (sport) filter.sport = sport;
  if (city)  filter.city  = new RegExp(city, 'i');
  if (area)  filter.area  = new RegExp(area, 'i');

  const [grounds, total] = await Promise.all([
    Ground.find(filter)
      .populate('owner', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
    Ground.countDocuments(filter),
  ]);
  return { grounds, total, pages: Math.ceil(total / +limit) };
};

const getGroundById = async (id) => {
  const ground = await Ground.findById(id).populate('owner', 'name phone email');
  if (!ground) throw new AppError('Ground not found.', 404);
  return ground;
};

const getAvailability = async (groundId, date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const booked = await Booking.find({
    ground: groundId,
    date:   d,
    status: { $in: ['pending', 'confirmed'] },
  }).select('startHour endHour');
  return booked;
};

const createGround = async (ownerId, fields, files) => {
  // Ensure owner is approved before they can add grounds
  const User = require('../models/User');
  const owner = await User.findById(ownerId);
  if (!owner || !owner.isApproved) {
    throw new AppError('Your account must be approved by admin before you can add grounds.', 403);
  }

  const images = (files || []).map(f => '/uploads/' + f.filename);
  const amenities = fields.amenities
    ? (Array.isArray(fields.amenities) ? fields.amenities : fields.amenities.split(',').map(s => s.trim()).filter(Boolean))
    : [];
  return Ground.create({ owner: ownerId, ...fields, amenities, images });
};

const updateGround = async (groundId, ownerId, fields, files) => {
  const ground = await Ground.findOne({ _id: groundId, owner: ownerId });
  if (!ground) throw new AppError('Ground not found.', 404);

  const allowedFields = ['name','description','sport','city','area','address','pricePerHour','openHour','closeHour','isActive'];
  allowedFields.forEach(f => { if (fields[f] !== undefined) ground[f] = fields[f]; });

  if (fields.amenities) {
    ground.amenities = Array.isArray(fields.amenities)
      ? fields.amenities
      : fields.amenities.split(',').map(s => s.trim()).filter(Boolean);
  }
  // Append new images
  if (files?.length) ground.images = [...ground.images, ...files.map(f => '/uploads/' + f.filename)];

  return ground.save();
};

const removeGroundImage = async (groundId, ownerId, imageUrl) => {
  const ground = await Ground.findOne({ _id: groundId, owner: ownerId });
  if (!ground) throw new AppError('Ground not found.', 404);

  if (!ground.images.includes(imageUrl))
    throw new AppError('Image not found on this ground.', 404);

  ground.images = ground.images.filter(img => img !== imageUrl);
  await ground.save();

  // Delete physical file
  try {
    const filePath = path.join(__dirname, '..', imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    // Non-fatal — log but don't throw
    console.warn('Could not delete image file:', e.message);
  }

  return ground;
};

const deleteGround = async (groundId, ownerId) => {
  const ground = await Ground.findOne({ _id: groundId, owner: ownerId });
  if (!ground) throw new AppError('Ground not found.', 404);

  // Block deletion if there are active/upcoming bookings
  const activeBookings = await Booking.countDocuments({
    ground: groundId,
    status: { $in: ['pending_payment', 'pending', 'confirmed'] },
  });
  if (activeBookings > 0)
    throw new AppError(`Cannot delete ground with ${activeBookings} active booking(s). Cancel them first.`, 400);

  // Delete uploaded images
  for (const img of ground.images) {
    try {
      const filePath = path.join(__dirname, '..', img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('Could not delete image file:', e.message);
    }
  }

  await Ground.findByIdAndDelete(groundId);
  return { deleted: true };
};

const updateSlots = async (groundId, ownerId, slots) => {
  const ground = await Ground.findOne({ _id: groundId, owner: ownerId });
  if (!ground) throw new AppError('Ground not found.', 404);
  if (!Array.isArray(slots)) throw new AppError('slots must be an array.', 400);
  ground.slots = slots;
  return ground.save();
};

const setAdvancePayment = async (groundId, ownerId, config) => {
  const ground = await Ground.findOne({ _id: groundId, owner: ownerId });
  if (!ground) throw new AppError('Ground not found.', 404);
  ground.advancePayment = {
    enabled:      config.enabled,
    amount:       config.amount || 0,
    instructions: config.instructions || '',
  };
  return ground.save();
};

module.exports = {
  searchGrounds, getGroundById, getAvailability,
  createGround, updateGround, removeGroundImage, deleteGround,
  updateSlots, setAdvancePayment,
};
