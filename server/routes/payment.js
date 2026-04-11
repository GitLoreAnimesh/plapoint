const router = require('express').Router();
const ctrl   = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Player initiates payment — requires auth
router.post('/initiate',         protect, ctrl.initiate);
router.post('/initiate-advance', protect, ctrl.initiateAdvance);

// SSLCommerz callbacks — NO auth (called by SSLCommerz server/browser)
router.post('/ssl/success', ctrl.sslSuccess);
router.post('/ssl/fail',    ctrl.sslFail);
router.post('/ssl/cancel',  ctrl.sslCancel);
router.post('/ssl/ipn',     ctrl.sslIPN);

// Player polls for final status after gateway redirect
router.get('/status/:bookingId', protect, ctrl.getStatus);

module.exports = router;
