# MongoDB Migration Guide

This guide documents the migration from JSON file storage to MongoDB with Mongoose.

## What Changed

### Storage Layer
- **Before**: JSON files in `/server/data/` directory
- **After**: MongoDB database with Mongoose ODM

### Key Improvements
1. **Performance**: Database indexes on frequently queried fields (userId, status, date, subject)
2. **Scalability**: Connection pooling and automatic retry logic
3. **Data Integrity**: Mongoose schema validation and constraints
4. **Features**: Automatic priority score calculation, timestamps on all documents
5. **Reliability**: Graceful shutdown handlers and connection monitoring

## Data Models

### Collections
1. **tasks** - Task management with priority scoring
2. **subjects** - Academic subjects with metadata
3. **events** - Calendar events (exams, classes, etc.)
4. **timetables** - Weekly schedules (one per user)
5. **assessments** - Assessment tracking with score history
6. **chathistories** - Chat conversations with AI
7. **studyplans** - Study plans (future implementation)
8. **users** - User profiles (future implementation)

### ID Format Change
- **Before**: String IDs like `'t_123'`, `'s1'`, `'e1'`
- **After**: MongoDB ObjectIDs internally, converted to `id` field in responses
- **Backward Compatibility**: All API responses include `id` field (without `_id` and `__v`)

## Migration Steps

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Set Up MongoDB
Choose either local MongoDB or MongoDB Atlas (cloud):

**Local MongoDB:**
```bash
# Install and start MongoDB
# macOS: brew services start mongodb-community
# Ubuntu: sudo systemctl start mongod
```

**MongoDB Atlas:**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create cluster and get connection string

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env and set MONGODB_URI
```

### 4. Seed Database
```bash
npm run seed
```

### 5. Start Server
```bash
npm run dev
```

## API Changes

### No Breaking Changes
The API contract remains the same. All endpoints return the same JSON structure.

### Enhanced Features
- **Filtering**: Tasks, Events, and Assessments support query parameter filtering
- **Sorting**: Results are sorted by priority score (tasks) or date (events, assessments)
- **Validation**: Better error messages with field-level validation errors

## Data Format Differences

### Dates
- **Before**: ISO strings only
- **After**: ISO strings (Date objects stored internally)

### IDs
- **Before**: Custom string IDs
- **After**: MongoDB ObjectIDs (24-character hex strings)

### Example Response
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [{
    "id": "507f1f77bcf86cd799439011",
    "title": "Complete Math Assignment",
    "priorityScore": 75,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }],
  "count": 1
}
```

## Migrating Existing JSON Data

If you have existing JSON data in `/server/data/`, you can migrate it manually:

1. Start MongoDB and the server
2. Use the API to create new records from your JSON data
3. Or modify the seed script to include your data

## Rollback (If Needed)

The old datastore module is still in the codebase. To rollback:

1. Stop the server
2. Revert changes to controllers and server.js
3. Remove mongoose from dependencies
4. Start the server

## Environment Variables

### New Variables
```env
MONGODB_URI=mongodb://localhost:27017/assessli
MONGODB_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_SERVER_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000
```

### Removed Variables
```env
DATA_DIR=./data  # No longer needed
```

## Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response includes database status:
```json
{
  "success": true,
  "database": {
    "status": "connected",
    "name": "assessli"
  }
}
```

### Test CRUD Operations
```bash
# Create a task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Task", "priority": "High"}'

# Get all tasks
curl http://localhost:5000/api/tasks

# Update task (use ID from create response)
curl -X PUT http://localhost:5000/api/tasks/[ID] \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Delete task
curl -X DELETE http://localhost:5000/api/tasks/[ID]
```

## Performance Considerations

### Indexes
The following indexes are automatically created:
- Tasks: userId, status, dueDate, priority, subject, priorityScore
- Subjects: userId, name, isActive
- Events: userId, date, subject, type, status
- Assessments: userId, date, subject, status
- Timetable: userId (unique)
- ChatHistory: sessionId (unique), userId, lastMessageAt

### Connection Pool
- Default: 10 max connections, 2 min connections
- Adjust via environment variables if needed

## Troubleshooting

### Connection Errors
```
MongooseError: Connection failed
```
**Solution**: Check MongoDB is running and MONGODB_URI is correct

### Validation Errors
```
ValidationError: Path `title` is required
```
**Solution**: Check required fields in request payload

### CastError
```
CastError: Cast to ObjectId failed
```
**Solution**: Use valid MongoDB ObjectID format (24 hex characters)

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify MongoDB connection with `mongosh`
3. Review the README.md for setup instructions
