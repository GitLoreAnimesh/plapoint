const router = require('express').Router();
const ctrl   = require('../controllers/groundController');
const { protect, role } = require('../middleware/auth');
const { validate, groundSchema, advPaymentSchema } = require('../validators/schemas');
const multer = require('multer');
const path   = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

// Public
router.get('/',                    ctrl.search);
router.get('/:id',                 ctrl.getOne);
router.get('/:id/availability',    ctrl.getAvailability);

// Owner
router.post('/',                   protect, role('owner'), upload.array('images', 8), validate(groundSchema), ctrl.create);
router.put('/:id',                 protect, role('owner'), upload.array('images', 8), ctrl.update);


router.delete('/:id/images',       protect, role('owner'), ctrl.removeImage);

router.delete('/:id',              protect, role('owner'), ctrl.deleteGround);

router.post('/:id/slots',          protect, role('owner'), ctrl.updateSlots);
router.put('/:id/advance-payment', protect, role('owner'), validate(advPaymentSchema), ctrl.setAdvancePayment);

module.exports = router;
