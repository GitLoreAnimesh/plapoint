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
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
});

// Ensure directories exist
['logs', path.join(__dirname, 'uploads')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Middleware ─────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
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
