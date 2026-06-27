require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const topicRoutes = require('./routes/topics');
const searchRoutes = require('./routes/search');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');
const githubRoutes = require('./routes/githubRoutes');
const discussionRoutes = require('./routes/discussion');
const githubScheduler = require('./github/github.scheduler');

// Connect DB
connectDB();

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render) to fix rate limiting

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'https://alloteme-tech.netlify.app',
  'https://tech.alloteme.online',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Don't throw an error that crashes the app, just disallow
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Passport ────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/github', githubRoutes);
app.use('/api/discussion', discussionRoutes);
app.use('/api/payment', require('./routes/payment'));


// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AlloteMe Tech API is running', timestamp: new Date() });
});

// ─── Public Stats ─────────────────────────────────────────────────────────────
app.get('/api/public-stats', async (req, res) => {
  try {
    const Problem = require('./models/Problem');
    const Company = require('./models/Company');
    const Topic = require('./models/Topic');
    const User = require('./models/User');

    const [problems, companies, topics, users] = await Promise.all([
      Problem.countDocuments(),
      Company.countDocuments(),
      Topic.countDocuments(),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      data: { problems, companies, topics, users }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

app.set('io', io);

const activeConnections = new Map(); // socket.id -> userId (or 'guest')
const typingUsers = new Map(); // socket.id -> { userId, name }

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  activeConnections.set(socket.id, userId || 'guest');

  const getOnlineCount = () => {
    const uniqueUsers = new Set();
    let guestCount = 0;
    for (const val of activeConnections.values()) {
      if (val === 'guest') {
        guestCount++;
      } else {
        uniqueUsers.add(val);
      }
    }
    return uniqueUsers.size + guestCount;
  };

  // Broadcast online count to everyone
  io.emit('discussion:online_count', getOnlineCount());

  // Allow client to request current count immediately on mount
  socket.on('discussion:get_online_count', () => {
    socket.emit('discussion:online_count', getOnlineCount());
  });

  if (userId) {
    socket.join(userId);
  }

  socket.on('discussion:typing:start', (payload) => {
    if (payload?.userId && payload?.name) {
      typingUsers.set(socket.id, { userId: payload.userId, name: payload.name });
      io.emit('discussion:typing:update', Array.from(typingUsers.values()));
    }
  });

  socket.on('discussion:typing:stop', () => {
    if (typingUsers.has(socket.id)) {
      typingUsers.delete(socket.id);
      io.emit('discussion:typing:update', Array.from(typingUsers.values()));
    }
  });

  socket.on('disconnect', () => {
    activeConnections.delete(socket.id);
    typingUsers.delete(socket.id);
    io.emit('discussion:online_count', getOnlineCount());
    io.emit('discussion:typing:update', Array.from(typingUsers.values()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[SERVER] AlloteMe Tech API & Socket running on http://localhost:${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
  
  // Start the background cron jobs
  githubScheduler.init();
});

module.exports = { app, server };
