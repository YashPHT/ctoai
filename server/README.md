# Assessli Backend Server

Node.js/Express backend server with MongoDB for the Assessli Smart Academic Mentor application.

## Features

- RESTful API architecture with full CRUD operations
- MongoDB integration with Mongoose ODM
- Connection pooling and retry logic
- Comprehensive data validation
- Query optimization with indexes
- CORS enabled for frontend integration
- Environment-based configuration
- Comprehensive error handling
- Request logging middleware
- Graceful shutdown handling
- Database seeding scripts
- Health check endpoint

## Tech Stack

- **Runtime**: Node.js (v14+)
- **Framework**: Express.js
- **Database**: MongoDB (v4.4+) with Mongoose ODM
- **Environment**: dotenv for configuration
- **Development**: Nodemon for hot-reloading

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection with retry logic
│   ├── models/
│   │   ├── index.js             # Model exports
│   │   ├── User.js              # User schema with profile and preferences
│   │   ├── Task.js              # Task schema with comprehensive fields
│   │   ├── Subject.js           # Subject schema with hours tracking
│   │   ├── Event.js             # Event schema for calendar
│   │   ├── Timetable.js         # Weekly timetable schema
│   │   ├── StudyPlan.js         # Study plan with daily schedules
│   │   ├── ChatHistory.js       # Chat conversation history
│   │   └── Assessment.js        # Assessment with score history
│   ├── controllers/
│   │   ├── taskController.js    # Task CRUD operations
│   │   ├── subjectsController.js # Subject management
│   │   ├── eventsController.js  # Event management
│   │   ├── timetableController.js # Timetable GET/PUT
│   │   ├── chatController.js    # Chat with Gemini integration
│   │   ├── studyPlanController.js # Study plan generation
│   │   ├── analyticsController.js # Analytics aggregations
│   │   ├── assessmentsController.js # Assessment management
│   │   └── motivationController.js # Motivational content
│   ├── services/
│   │   ├── geminiService.js     # Gemini API integration
│   │   └── intentExec.js        # Intent execution for chat
│   ├── routes/
│   │   ├── taskRoutes.js
│   │   ├── subjectRoutes.js
│   │   ├── eventRoutes.js
│   │   ├── timetableRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── studyPlanRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── assessmentsRoutes.js
│   │   └── motivationRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── requestLogger.js     # HTTP request logging
│   ├── scripts/
│   │   └── seed.js              # Database seeding script
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
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/assessli
   MONGODB_POOL_SIZE=10
   MONGODB_MIN_POOL_SIZE=2
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:8080
   
   # Gemini API (optional for chat features)
   GEMINI_API_KEY=your_api_key_here
   ```

### MongoDB Setup

#### Option 1: Local MongoDB

1. **Install MongoDB Community Edition:**
   - **macOS**: `brew install mongodb-community`
   - **Ubuntu**: Follow [official guide](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
   - **Windows**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

2. **Start MongoDB service:**
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Ubuntu
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

3. **Verify MongoDB is running:**
   ```bash
   mongosh
   # Should connect to MongoDB shell
   ```

#### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Set up database user credentials
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/assessli?retryWrites=true&w=majority
   ```

### Database Seeding

Populate the database with demo data:

```bash
npm run seed
```

This will create:
- 1 demo user
- 6 subjects (Mathematics, Biology, Chemistry, Physics, English, History)
- 4 sample tasks with various statuses
- 3 events (exams, quizzes)
- 2 assessments with score history
- 1 weekly timetable

## Running the Server

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
- `GET /` - API information and available endpoints
- `GET /api/health` - Server health status and MongoDB connection info

### Tasks
- `GET /api/tasks` - Get all tasks (supports filtering by status, subject, completed)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Task Schema Fields:**
```json
{
  "title": "string (required)",
  "description": "string",
  "subject": "string",
  "dueDate": "ISO date",
  "priority": "Low | Medium | High | Urgent",
  "urgency": "low | medium | high",
  "difficulty": "easy | moderate | hard",
  "status": "pending | in-progress | completed | overdue | cancelled",
  "completed": "boolean",
  "prepStatus": "not-started | in-progress | completed",
  "revisionStatus": "not-started | in-progress | completed",
  "priorityScore": "number (0-100)",
  "estimatedDuration": "number (minutes)",
  "actualDuration": "number (minutes)",
  "tags": ["string"],
  "notes": "string",
  "userId": "ObjectId"
}
```

### Subjects
- `GET /api/subjects` - Get all subjects
- `GET /api/subjects/:id` - Get subject by ID
- `POST /api/subjects` - Create new subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Events
- `GET /api/events` - Get all events (supports filtering by type, subject, upcoming)
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Timetable
- `GET /api/timetable` - Get weekly timetable
- `PUT /api/timetable` - Update timetable

### Chat
- `POST /api/chat` - Send chat message with Gemini AI
- `POST /api/chat/session` - Create new chat session
- `GET /api/chat/history/:sessionId` - Get chat history
- `DELETE /api/chat/history/:sessionId` - Delete chat history

**Chat Request:**
```json
{
  "message": "string (required)",
  "sessionId": "string (optional)",
  "userId": "string (optional)"
}
```

### Study Plans
- `GET /api/study-plans` - Get all study plans
- `GET /api/study-plans/:id` - Get study plan by ID
- `POST /api/study-plans` - Create new study plan
- `PUT /api/study-plans/:id` - Update study plan
- `DELETE /api/study-plans/:id` - Delete study plan
- `GET /api/study-plan?dailyHours=4&windowDays=7` - Generate AI-optimized study plan

### Analytics
- `GET /api/analytics?period=week` - Get comprehensive analytics
  - Supports periods: day, week, month
  - Returns task statistics, subject breakdown, upcoming deadlines, time series data

### Assessments
- `GET /api/assessments` - Get all assessments
- `GET /api/assessments/:id` - Get assessment by ID
- `POST /api/assessments` - Create new assessment
- `PUT /api/assessments/:id` - Update assessment
- `DELETE /api/assessments/:id` - Delete assessment

### Motivation
- `GET /api/motivation/message` - Get random motivational message
- `GET /api/motivation/quote` - Get daily quote
- `GET /api/motivation/tip` - Get study tip

## Database Models

### User Model
- Profile information (username, email, firstName, lastName)
- Role-based access (student, teacher, admin)
- Preferences (theme, notifications, study hours)
- Profile details (avatar, bio, grade, school)

### Task Model
- Comprehensive task management with validation
- Multiple priority and difficulty levels
- Status tracking with automatic completed flag
- Support for tags, notes, and durations
- Indexed fields: userId, subject, status, dueDate, completed

### Subject Model
- Subject management with color coding
- Hours spent tracking
- Unique constraint on subject name
- Indexed by name and userId

### Event Model
- Calendar event management
- Type categorization (exam, quiz, assignment, project, presentation)
- Location and duration tracking
- Indexed by date, type, subject, userId

### Timetable Model
- Weekly schedule with blocks for each day
- Time validation (HH:MM format)
- Color coding for subjects
- Notes support for each block

### StudyPlan Model
- Daily schedule generation
- Progress tracking (hours, completion percentage)
- Status management (draft, active, completed, cancelled)
- Task-based study blocks with hours allocation

### ChatHistory Model
- Session-based conversation storage
- Message history with role tracking (user, assistant, system)
- Metadata support for intent and payload
- Auto-archiving of old sessions
- Indexed by sessionId, userId, lastMessageAt

### Assessment Model
- Assessment tracking with score history
- Weight-based grading support
- Resource attachments (links, documents)
- Status tracking (upcoming, in-progress, completed, cancelled)
- Methods for calculating average and latest scores

## Database Features

### Indexes
All models include strategic indexes for query optimization:
- Single-field indexes on commonly queried fields
- Compound indexes for multi-field queries
- Unique indexes where appropriate

### Validation
- Mongoose schema validation with custom error messages
- Enum validation for status fields
- Range validation for numeric fields
- Email and URL format validation

### Connection Management
- Automatic retry logic (5 attempts with 5-second delays)
- Connection pooling for optimal performance
- Graceful shutdown handling
- Event-based connection monitoring

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
    "priority": "High",
    "difficulty": "moderate"
  }'

# Get analytics
curl "http://localhost:5000/api/analytics?period=week"

# Generate study plan
curl "http://localhost:5000/api/study-plan?dailyHours=4&windowDays=7"
```

### Using the Test Script

```bash
chmod +x test-api.sh
./test-api.sh
```

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
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:8080 |
| `GEMINI_API_KEY` | Gemini API key for chat | - |
| `GEMINI_MODEL` | Gemini model to use | gemini-1.5-flash |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | 100 |

## Troubleshooting

### MongoDB Connection Issues

1. **Connection Refused**: Ensure MongoDB is running
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod  # Linux
   brew services list  # macOS
   ```

2. **Authentication Failed**: Check username/password in connection string

3. **Network Error**: Verify IP whitelist in MongoDB Atlas

4. **Timeout Error**: Increase `MONGODB_SERVER_TIMEOUT` in `.env`

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

### Database Seeding Issues

```bash
# Clear database and reseed
npm run seed
```

## Development Guidelines

### Adding New Features

1. **Create Model** in `/src/models/` with proper schema and indexes
2. **Create Controller** in `/src/controllers/` with business logic
3. **Create Routes** in `/src/routes/` linking to controller methods
4. **Register Routes** in `src/server.js`
5. **Update README** with new endpoints and model documentation

### Code Style

- Use async/await for asynchronous operations
- Include comprehensive error handling
- Add logging for database operations
- Use `.lean()` for read-only queries (better performance)
- Validate input data before database operations

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use MongoDB Atlas or managed MongoDB service
3. Enable authentication and authorization
4. Set up HTTPS with SSL certificates
5. Configure proper CORS origins
6. Enable rate limiting
7. Set up monitoring and logging
8. Regular database backups
9. Use process manager (PM2, forever)

## License

MIT
