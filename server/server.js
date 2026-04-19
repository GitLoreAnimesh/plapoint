require('dotenv').config();
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const mongoose     = require('mongoose');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const path         = require('path');
const fs           = require('fs');

const logger       = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// ── Setup ──────────────────────────────────────────────
// Sanitize CLIENT_URL — handle single OR multiple comma-separated URLs
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim().replace(/^["']|["']$/g, ''))
  .filter(Boolean);

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

// Ensure directories exist
['logs', path.join(__dirname, 'uploads')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Middleware ─────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin:      CLIENT_URL,
  credentials: true,
  methods:     ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Socket.IO ─────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    logger.debug(`Socket joined room user_${userId}`);
  });
});
app.set('io', io);

// ── Background Tasks ──────────────────────────────────
setInterval(async () => {
  try {
    const Booking = require('./models/Booking');
    const Ground  = require('./models/Ground');
    // Fetch expired pending_payment bookings
    const expiredIds = await Booking.find({
      status: 'pending_payment',
      paymentExpiresAt: { $lt: new Date() }
    }).select('_id player ground');

    for (const b of expiredIds) {
      // Use findOneAndUpdate to bypass pre('save') anti-double-booking guard
      await Booking.findOneAndUpdate(
        { _id: b._id, status: 'pending_payment' },
        { $set: { status: 'cancelled', cancelReason: 'Payment timeout (5 mins)', cancelledBy: 'system' } }
      );

      const groundId = b.ground.toString();
      const payload  = { bookingId: b._id.toString(), status: 'cancelled', groundId };

      // Notify player
      io.to(`user_${b.player}`).emit('bookingUpdated', payload);
      window?.dispatchEvent?.(new CustomEvent('pp-booking-updated', { detail: payload }));

      // Notify owner
      const ground = await Ground.findById(b.ground).select('owner');
      if (ground?.owner) io.to(`user_${ground.owner}`).emit('bookingUpdated', payload);

      logger.info(`Payment timeout: cancelled booking ${b._id}`);
    }
  } catch (err) {
    logger.error('Error in interval booking cleanup: ' + err.message);
  }
}, 30000);

// ── Static uploads ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API routes ────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/grounds',       require('./routes/grounds'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/owner',         require('./routes/owner'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payment',       require('./routes/payment'));

// Root health check (for Render's default health ping)
app.get('/', (_, res) => res.json({ status: 'ok', message: 'PlayPoint API is running.' }));

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date(), env: process.env.NODE_ENV }));

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` }));

// ── Centralized error handler ─────────────────────────
app.use(errorHandler);

// ── Database + start ──────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
  })
  .catch(err => { logger.error(`MongoDB connection failed: ${err.message}`); process.exit(1); });

// ── Safety nets ────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
