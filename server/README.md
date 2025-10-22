# Assessli Backend Server

Node.js/Express backend server with MongoDB for the Assessli Smart Academic Mentor application.

## Features

- RESTful API architecture
- MongoDB integration with Mongoose ODM
- Comprehensive data models with validation
- Automatic priority score calculation for tasks
- Connection pooling and retry logic
- Graceful shutdown handling
- Database indexes for performance optimization
- CORS enabled for frontend integration
- Environment-based configuration
- Comprehensive error handling
- Request logging middleware
- Rate limiting
- Modular route structure
- Database seeding script for demo data

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Environment**: dotenv for configuration
- **Development**: Nodemon for hot-reloading

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection configuration
│   ├── models/
│   │   ├── User.js              # User schema with preferences and stats
│   │   ├── Task.js              # Task schema with urgency, difficulty, status
│   │   ├── StudyPlan.js         # Study plan with sessions and goals
│   │   └── ChatHistory.js       # Chat conversation history
│   ├── controllers/
│   │   ├── taskController.js    # Task management logic
│   │   ├── chatController.js    # Chat API logic
│   │   ├── studyPlanController.js  # Study plan management
│   │   └── motivationController.js # Motivational content
│   ├── routes/
│   │   ├── taskRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── studyPlanRoutes.js
│   │   └── motivationRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── requestLogger.js     # HTTP request logging
│   └── server.js                # Application entry point
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher) - Local installation or MongoDB Atlas account
- npm or yarn package manager

### Setup Steps

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit the `.env` file with your configuration:**
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/assessli
   CORS_ORIGIN=http://localhost:8000
   ```

### MongoDB Setup

#### Option 1: Local MongoDB

1. Install MongoDB Community Edition:
   - **macOS**: `brew install mongodb-community`
   - **Ubuntu**: Follow [official guide](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
   - **Windows**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Ubuntu
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

3. Verify MongoDB is running:
   ```bash
   mongosh
   ```

#### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Set up database user credentials
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/assessli?retryWrites=true&w=majority
   ```

## Running the Server

### Seed the Database (First Time Setup)

After setting up MongoDB, seed the database with demo data:

```bash
npm run seed
```

This will:
- Clear existing data
- Create sample subjects (Mathematics, Biology, Chemistry, Physics, English, History)
- Create sample tasks with various priorities and statuses
- Create sample events and assessments
- Set up a default weekly timetable

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on the configured port (default: 5000).

## API Endpoints

### Health Check
- `GET /` - API information
- `GET /api/health` - Server health status

### Tasks
- `GET /api/tasks` - Get all tasks (supports filtering by status, subject, priority)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Task Schema Fields:**
- `title`, `description`, `subject`, `dueDate`
- `priority`: Low, Medium, High, Urgent
- `urgency`: low, medium, high, critical
- `difficulty`: easy, moderate, challenging, difficult
- `preparation`: none, minimal, moderate, extensive
- `revision`: number (revision count)
- `priorityScore`: computed priority score (0-100)
- `status`: pending, in-progress, completed, overdue, cancelled
- `estimatedDuration`, `actualDuration`, `tags`, `notes`

### Subjects
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject by ID
- `POST /api/subjects` - Create new subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Events
- `GET /api/events` - Get all events (supports filtering by status, subject, type, date range)
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Timetable
- `GET /api/timetable` - Get weekly timetable
- `PUT /api/timetable` - Update/create timetable

### Assessments
- `GET /api/assessments` - Get all assessments (supports filtering)
- `GET /api/assessments/:id` - Get assessment by ID
- `POST /api/assessments` - Create new assessment
- `PUT /api/assessments/:id` - Update assessment
- `DELETE /api/assessments/:id` - Delete assessment

### Analytics
- `GET /api/analytics` - Get comprehensive analytics (task statistics, subject breakdown, trends)

### Chat
- `POST /api/chat` - Send chat message
- `POST /api/chat/session` - Create new chat session
- `GET /api/chat/history/:sessionId` - Get chat history
- `DELETE /api/chat/history/:sessionId` - Delete chat history

### Study Plans
- `GET /api/study-plans` - Get all study plans
- `GET /api/study-plans/:id` - Get study plan by ID
- `POST /api/study-plans` - Create new study plan
- `PUT /api/study-plans/:id` - Update study plan
- `DELETE /api/study-plans/:id` - Delete study plan
- `POST /api/study-plans/:id/sessions` - Add study session

### Motivation
- `GET /api/motivation/message` - Get random motivational message
- `GET /api/motivation/quote` - Get daily quote
- `GET /api/motivation/tip` - Get study tip

## Database Models

### User Model
- Authentication and profile information
- User preferences (theme, notifications)
- Statistics (tasks completed, study hours, streak)

### Task Model
- Comprehensive task management
- Multiple priority and difficulty levels
- Preparation and revision tracking
- Automatic priority score calculation (0-100)
- Status tracking with timestamps
- Support for tags and notes
- Indexed fields for optimized queries

### Subject Model
- Subject information with color coding
- Hours per week tracking
- Active/inactive status

### Event Model
- Calendar event management
- Support for exams, quizzes, labs, etc.
- Recurring event support
- Location and timing information

### Timetable Model
- Weekly schedule management
- Time blocks per day
- Version control for conflict detection

### Assessment Model
- Assessment tracking (exams, quizzes, assignments)
- Score history and grade tracking
- Resource links
- Weight-based grading support

### StudyPlan Model
- Multi-subject study planning
- Study sessions with time tracking
- Goals and milestones
- Progress calculation methods

### ChatHistory Model
- Conversation history with role-based messages
- Context preservation for multi-step flows
- Metadata support for AI integration
- Session management

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Get all tasks
curl http://localhost:5000/api/tasks

# Create a task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Study Math",
    "description": "Complete chapter 5",
    "subject": "Mathematics",
    "dueDate": "2024-12-31",
    "priority": "High"
  }'

# Get motivational message
curl http://localhost:5000/api/motivation/message
```

### Using Postman or Thunder Client

Import the following base URL: `http://localhost:5000/api`

## Development Notes

### Current Implementation Status

The current implementation provides:
- ✅ Complete folder structure
- ✅ All required dependencies
- ✅ MongoDB connection helper
- ✅ Comprehensive Mongoose schemas
- ✅ Route scaffolds with placeholder responses
- ✅ Error handling and logging middleware

### Next Steps for Production

1. **Authentication & Authorization**
   - Implement JWT-based authentication
   - Add user registration and login endpoints
   - Protect routes with auth middleware

2. **Real Database Operations**
   - Replace placeholder responses with actual database queries
   - Implement data validation
   - Add pagination and filtering

3. **AI Integration**
   - Integrate with AI service (OpenAI, etc.)
   - Implement intelligent chat responses
   - Add task and study plan recommendations

4. **Testing**
   - Add unit tests (Jest, Mocha)
   - Integration tests for API endpoints
   - Database testing with test fixtures

5. **Security**
   - Input validation and sanitization
   - Rate limiting
   - HTTPS configuration
   - Security headers (helmet.js)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/assessli |
| `MONGODB_POOL_SIZE` | Maximum connection pool size | 10 |
| `MONGODB_MIN_POOL_SIZE` | Minimum connection pool size | 2 |
| `MONGODB_SERVER_TIMEOUT` | Server selection timeout (ms) | 5000 |
| `MONGODB_SOCKET_TIMEOUT` | Socket timeout (ms) | 45000 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:8000 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 900000 |
| `RATE_LIMIT_MAX` | Max requests per window | 100 |
| `GEMINI_API_KEY` | Gemini API key for AI features | - |

## Troubleshooting

### MongoDB Connection Issues

1. **Connection Refused**: Ensure MongoDB is running
2. **Authentication Failed**: Check username/password in connection string
3. **Network Error**: Verify IP whitelist in MongoDB Atlas

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

When adding new features:
1. Follow the existing folder structure
2. Create models in `/models`
3. Create controllers in `/controllers`
4. Create routes in `/routes`
5. Update this README with new endpoints

## License

MIT
