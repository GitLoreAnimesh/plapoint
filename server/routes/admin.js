const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { protect, role } = require('../middleware/auth');

router.use(protect, role('admin'));

router.get('/stats',                  ctrl.getStats);
router.get('/users',                  ctrl.getUsers);
router.put('/users/:id/ban',          ctrl.banUser);
router.get('/owners',                 ctrl.getOwners);
router.put('/owners/:id/approve',     ctrl.approveOwner);
router.get('/grounds',                ctrl.getGrounds);
router.put('/grounds/:id/approve',    ctrl.approveGround);
router.delete('/grounds/:id',         ctrl.deleteGround);
router.get('/bookings',               ctrl.getBookings);
router.put('/bookings/:id/cancel',     ctrl.cancelBooking);

module.exports = router;
