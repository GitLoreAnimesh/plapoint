const router = require('express').Router();
const ctrl   = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',           ctrl.get);
router.put('/read-all',   ctrl.markAllRead);

module.exports = router;
