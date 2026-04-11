const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema, loginSchema } = require('../validators/schemas');

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login',    authLimiter, validate(loginSchema),    ctrl.login);
router.post('/logout',   ctrl.logout);
router.post('/refresh',  ctrl.refresh);
router.get('/me',        protect, ctrl.getMe);
router.put('/profile',   protect, ctrl.updateProfile);

module.exports = router;
