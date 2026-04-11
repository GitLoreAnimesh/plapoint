const router = require('express').Router();
const ctrl   = require('../controllers/ownerController');
const { protect, role } = require('../middleware/auth');
const { validate, advPaymentSchema } = require('../validators/schemas');

router.use(protect, role('owner'));

router.get('/dashboard',                         ctrl.getDashboard);
router.get('/bookings',                          ctrl.getBookings);
router.put('/bookings/:id',                      ctrl.updateBooking);
router.get('/grounds',                           ctrl.getGrounds);
router.delete('/grounds/:id',                    ctrl.deleteGround);
router.put('/grounds/:id/advance-payment',       validate(advPaymentSchema), ctrl.setAdvancePayment);
router.get('/analytics',                         ctrl.getAnalytics);

module.exports = router;
