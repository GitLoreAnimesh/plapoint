const groundService  = require('../services/groundService');
const { asyncHandler } = require('../utils/appError');

exports.search = asyncHandler(async (req, res) => {
  const result = await groundService.searchGrounds(req.query);
  res.json({ success: true, ...result });
});

exports.getOne = asyncHandler(async (req, res) => {
  const ground = await groundService.getGroundById(req.params.id);
  res.json({ success: true, ground });
});

exports.getAvailability = asyncHandler(async (req, res) => {
  const booked = await groundService.getAvailability(req.params.id, req.query.date);
  res.json({ success: true, booked });
});

exports.create = asyncHandler(async (req, res) => {
  const ground = await groundService.createGround(req.user._id, req.body, req.files);
  res.status(201).json({ success: true, ground });
});

exports.update = asyncHandler(async (req, res) => {
  const ground = await groundService.updateGround(req.params.id, req.user._id, req.body, req.files);
  res.json({ success: true, ground });
});

exports.removeImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required.' });
  }
  const ground = await groundService.removeGroundImage(req.params.id, req.user._id, imageUrl);
  res.json({ success: true, ground });
});

exports.deleteGround = asyncHandler(async (req, res) => {
  const result = await groundService.deleteGround(req.params.id, req.user._id);
  res.json({ success: true, ...result });
});

exports.updateSlots = asyncHandler(async (req, res) => {
  const ground = await groundService.updateSlots(req.params.id, req.user._id, req.body.slots);
  res.json({ success: true, ground });
});

exports.setAdvancePayment = asyncHandler(async (req, res) => {
  const ground = await groundService.setAdvancePayment(req.params.id, req.user._id, req.body);
  res.json({ success: true, ground });
});
