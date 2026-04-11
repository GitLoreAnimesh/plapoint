const Joi = require('joi');

const opts = { abortEarly: false, stripUnknown: true };

// ── Auth ──────────────────────────────────────────────
const registerSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(60).required(),
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).max(128).required(),
  role:     Joi.string().valid('player', 'owner').default('player'),
  phone:    Joi.string().allow('').max(20).default(''),
  address:  Joi.string().allow('').max(200).default(''),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

// ── Grounds ───────────────────────────────────────────
const groundSchema = Joi.object({
  name:          Joi.string().trim().min(2).max(100).required(),
  description:   Joi.string().allow('').max(1000).default(''),
  sport:         Joi.string().valid('badminton','futsal','basketball','tennis','volleyball').required(),
  city:          Joi.string().trim().min(2).max(80).required(),
  area:          Joi.string().allow('').max(80).default(''),
  address:       Joi.string().allow('').max(200).default(''),
  pricePerHour:  Joi.number().positive().required(),
  openHour:      Joi.number().integer().min(0).max(23).default(6),
  closeHour:     Joi.number().integer().min(1).max(24).default(23),
  amenities:     Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).default([]),
});

const advPaymentSchema = Joi.object({
  enabled:      Joi.boolean().required(),
  amount:       Joi.number().min(0).default(0),
  instructions: Joi.string().allow('').max(500).default(''),
});

// ── Bookings ──────────────────────────────────────────
const bookingSchema = Joi.object({
  groundId:    Joi.string().required(),
  date:        Joi.string().isoDate().required(),
  startHour:   Joi.number().integer().min(0).max(23).required(),
  endHour:     Joi.number().integer().min(1).max(24).required(),
  paymentMode: Joi.string().valid('sslcommerz','pay_at_venue').default('pay_at_venue'),
});

const reviewSchema = Joi.object({
  rating:  Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow('').max(500).default(''),
});

// ── Middleware factory ────────────────────────────────
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], opts);
  if (error) {
    const msg = error.details.map(d => d.message).join('; ');
    return res.status(422).json({ error: msg });
  }
  req[source] = value;
  next();
};

module.exports = {
  validate,
  registerSchema, loginSchema,
  groundSchema, advPaymentSchema,
  bookingSchema, reviewSchema,
};
