require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB, setupGracefulShutdown } = require('./config/database');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

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

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for correct rate-limit IPs behind proxies). Accept numeric or boolean-like env.
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv) {
  const val = /^\d+$/.test(trustProxyEnv) ? parseInt(trustProxyEnv, 10) : 1;
  app.set('trust proxy', val);
}

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  credentials: true
}));

// Body parsers with limits
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || '1mb' }));

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

app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'not connected'
    }
  });
});

app.use('/api/tasks', taskRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/study-plan', studyPlanComputeRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/motivation', motivationRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assessments', assessmentsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

async function start() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ MongoDB connection established');
    
    // Setup graceful shutdown handlers
    setupGracefulShutdown();
    console.log('✓ Graceful shutdown handlers configured');

    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API endpoints available at http://localhost:${PORT}/api`);
      console.log('='.repeat(50));
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

module.exports = app;
