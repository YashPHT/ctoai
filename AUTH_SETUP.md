# JWT Authentication System - Setup Guide

This document provides a comprehensive guide for the JWT authentication system implemented in Assessli.

## Overview

The authentication system includes:
- **JWT (JSON Web Token)** based authentication
- **Bcrypt** password hashing for security
- **Rate limiting** on authentication endpoints (5 attempts per 15 minutes)
- **User data isolation** - each user can only access their own data
- **Protected API routes** - all data endpoints require authentication
- **Frontend authentication flow** with login/register pages

## Quick Start

### 1. Backend Setup

Navigate to the server directory and ensure dependencies are installed:

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Make sure your `.env` file includes JWT configuration:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=30d
```

**Important**: Generate a secure JWT secret for production:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start MongoDB

Ensure MongoDB is running locally or use MongoDB Atlas:

```bash
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

### 4. Create First User (Optional)

Run the migration script to create a default admin user:

```bash
npm run migrate
```

This creates:
- Email: `admin@assessli.com`
- Password: `admin123`

**⚠️ Important**: Change this password immediately after first login!

### 5. Start the Backend Server

```bash
npm run dev
```

The server should now be running on `http://localhost:5000`

### 6. Test the Authentication

Run the test script:

```bash
./test-auth.sh
```

This will test:
- User registration
- Login
- Protected routes
- Token validation

## Frontend Usage

### Login Page

Users can access the login page at:
```
http://localhost:8080/login.html
```

### Register Page

New users can register at:
```
http://localhost:8080/register.html
```

### Authentication Flow

1. User logs in or registers
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. All subsequent API calls include token in Authorization header
5. Backend validates token and returns user-specific data

### Protected Pages

All main application pages (dashboard, assignments, calendar, etc.) are protected:
- Users must be logged in to access
- Automatic redirect to login page if not authenticated
- Token refresh on page load
- 401 responses trigger automatic logout and redirect

## API Endpoints

### Public Endpoints (No Authentication Required)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token

### Protected Endpoints (Authentication Required)

All other API endpoints require JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Protected routes include:
- `/api/auth/me` - Get current user profile
- `/api/tasks` - Task management
- `/api/subjects` - Subject management
- `/api/events` - Event management
- `/api/assessments` - Assessment management
- `/api/timetable` - Timetable management
- `/api/analytics` - Analytics data
- `/api/chat` - Chat with AI mentor
- `/api/study-plans` - Study plan management

## Security Features

### Password Security
- Passwords are hashed using bcrypt with 10 salt rounds
- Never stored in plain text
- Minimum length: 6 characters

### Rate Limiting
- Authentication endpoints limited to 5 requests per 15 minutes
- Prevents brute force attacks
- Returns 429 status when limit exceeded

### Token Security
- JWT tokens expire after 30 days (configurable)
- Tokens include user ID payload
- Signed with secret key
- Verified on every protected request

### Data Isolation
- All database queries filter by user ID
- Users can only access their own data
- No cross-user data leakage

## Troubleshooting

### "Token expired" errors
- User needs to log in again
- Consider reducing JWT_EXPIRE time for testing

### "Invalid credentials" on login
- Check email and password
- Passwords are case-sensitive
- Ensure user account exists

### Protected routes return 401
- Token might be missing or invalid
- Check localStorage for 'token' key
- Verify token format: `Bearer <token>`

### Rate limit exceeded
- Wait 15 minutes or restart server
- Adjust rate limit in server configuration

## Development Tips

### Testing with cURL

Register a user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Access protected route:
```bash
curl http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Browser Console Testing

```javascript
// Register
const registerData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'test123',
  firstName: 'Test',
  lastName: 'User'
};

await authService.register(registerData);

// Login
await authService.login('test@example.com', 'test123');

// Check authentication
console.log(authService.isAuthenticated());

// Get current user
console.log(authService.getUser());

// Logout
authService.logout();
```

## Architecture

### Backend Components

1. **Models** (`server/src/models/User.js`)
   - User schema with password hashing
   - Pre-save hook for password encryption
   - matchPassword method for validation

2. **Middleware** (`server/src/middleware/auth.js`)
   - JWT token verification
   - User extraction from token
   - Error handling for expired/invalid tokens

3. **Controllers** (`server/src/controllers/authController.js`)
   - Register: Create new user and return token
   - Login: Validate credentials and return token
   - GetMe: Return current user profile

4. **Routes** (`server/src/routes/authRoutes.js`)
   - Rate limiting configuration
   - Route definitions

### Frontend Components

1. **Auth Service** (`public/js/auth.js`)
   - Register/login/logout methods
   - Token management (localStorage)
   - User profile caching

2. **Auth Check** (`public/js/auth-check.js`)
   - Automatic redirect for unauthenticated users
   - User info display
   - Logout button handler

3. **API Client** (`public/js/api.js`)
   - Automatic Authorization header injection
   - 401 response handling

## Migration from Existing Data

If you have existing JSON data files, use the migration script:

```bash
cd server
npm run migrate
```

This will:
1. Create a default admin user
2. Import all existing data
3. Associate data with the admin user

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong, random value
- [ ] Set JWT_EXPIRE to appropriate duration
- [ ] Change default admin password
- [ ] Enable HTTPS
- [ ] Configure CORS_ORIGIN properly
- [ ] Set up proper MongoDB authentication
- [ ] Configure rate limits appropriately
- [ ] Enable logging and monitoring
- [ ] Set up backup strategy
- [ ] Review and test security measures

## Support

For issues or questions:
1. Check this guide first
2. Review server logs in terminal
3. Check browser console for errors
4. Verify environment variables are set
5. Ensure MongoDB is running

## Future Enhancements

Potential improvements to consider:
- Refresh token mechanism
- Email verification
- Password reset functionality
- Two-factor authentication
- Session management
- Role-based access control (RBAC)
- OAuth integration (Google, GitHub, etc.)
