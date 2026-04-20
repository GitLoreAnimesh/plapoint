const router = require('express').Router();
const ctrl   = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/initiate',         protect, ctrl.initiate);
router.post('/initiate-advance', protect, ctrl.initiateAdvance);

router.post('/ssl/success', ctrl.sslSuccess);
router.post('/ssl/fail',    ctrl.sslFail);
router.post('/ssl/cancel',  ctrl.sslCancel);
router.post('/ssl/ipn',     ctrl.sslIPN);

router.get('/status/:bookingId', protect, ctrl.getStatus);

module.exports = router;
