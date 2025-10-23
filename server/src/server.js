require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const database = require('./config/database');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const configurePassport = require('./config/passport');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const studyPlanComputeRoutes = require('./routes/studyPlanComputeRoutes');
const motivationRoutes = require('./routes/motivationRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const assessmentsRoutes = require('./routes/assessmentsRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const eventRoutes = require('./routes/eventRoutes');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

configurePassport(passport);

// Trust proxy (for correct rate-limit IPs behind proxies). Accept numeric or boolean-like env.
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  const val = /^\d+$/.test(trustProxyEnv) ? parseInt(trustProxyEnv, 10) : 1;
  app.set('trust proxy', val);
}

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  credentials: true
}));

// Body parsers with limits
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || '1mb' }));

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.warn('[Server] SESSION_SECRET is not set. Using a temporary secret for development.');
}

const parsedSessionMaxAge = parseInt(process.env.SESSION_COOKIE_MAX_AGE || `${24 * 60 * 60 * 1000}`, 10);
const sessionMaxAge = Number.isNaN(parsedSessionMaxAge) ? 24 * 60 * 60 * 1000 : parsedSessionMaxAge;

app.use(session({
  name: 'assessli.sid',
  secret: sessionSecret || 'assessli-insecure-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionMaxAge
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Basic rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Assessli Smart Academic Mentor API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tasks: '/api/tasks',
      subjects: '/api/subjects',
      events: '/api/events',
      chat: '/api/chat',
      studyPlan: '/api/study-plan',
      studyPlans: '/api/study-plans',
      motivation: '/api/motivation',
      timetable: '/api/timetable',
      analytics: '/api/analytics',
      assessments: '/api/assessments'
    }
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = database.getConnectionStatus();
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: {
      status: dbStatus.readyState,
      connected: dbStatus.isConnected,
      host: dbStatus.host,
      name: dbStatus.name,
      models: dbStatus.models
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', auth, taskRoutes);
app.use('/api/subjects', auth, subjectRoutes);
app.use('/api/events', auth, eventRoutes);
app.use('/api/chat', auth, chatRoutes);
app.use('/api/study-plan', auth, studyPlanComputeRoutes);
app.use('/api/study-plans', auth, studyPlanRoutes);
app.use('/api/motivation', auth, motivationRoutes);
app.use('/api/timetable', auth, timetableRoutes);
app.use('/api/analytics', auth, analyticsRoutes);
app.use('/api/assessments', auth, assessmentsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

async function start() {
  try {
    // Setup database event handlers
    database.setupEventHandlers();
    
    // Connect to MongoDB
    await database.connect();
    console.log('[Server] MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`[Server] Server is running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[Server] API endpoints available at http://localhost:${PORT}/api`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Server] Received SIGINT, shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Received SIGTERM, shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

start();

module.exports = app;
