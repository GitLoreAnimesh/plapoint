const router = require('express').Router();
const ctrl   = require('../controllers/bookingController');
const { protect, role } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');
const { validate, bookingSchema, reviewSchema } = require('../validators/schemas');

router.post('/',            protect, role('player'), bookingLimiter, validate(bookingSchema), ctrl.create);
router.get('/my',           protect, role('player'), ctrl.getMyBookings);
router.get('/:id',          protect, ctrl.getOne);
router.put('/:id/cancel',   protect, role('player'), ctrl.cancel);
router.post('/:id/review',  protect, role('player'), validate(reviewSchema), ctrl.review);

module.exports = router;
