require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const taskRoutes = require('./routes/taskRoutes');
const chatRoutes = require('./routes/chatRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const motivationRoutes = require('./routes/motivationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Assessli Smart Academic Mentor API',
    version: '1.0.0',
    endpoints: {
      tasks: '/api/tasks',
      chat: '/api/chat',
      studyPlans: '/api/study-plans',
      motivation: '/api/motivation'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/motivation', motivationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;
