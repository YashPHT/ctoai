#!/bin/bash

BASE_URL="http://localhost:5000"

echo "=== Testing JWT Authentication System ==="
echo ""

# Test 1: Health check
echo "1. Testing health check endpoint (public)..."
curl -s "${BASE_URL}/api/health" | jq '.success' || echo "Failed"
echo ""

# Test 2: Register new user
echo "2. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123456",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "$REGISTER_RESPONSE" | jq '.' || echo "$REGISTER_RESPONSE"

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
  echo "Registration failed or user already exists. Trying to login instead..."
  
  # Test 3: Login with existing user
  echo ""
  echo "3. Testing login..."
  LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "test123456"
    }')
  
  echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')
fi

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Exiting."
  exit 1
fi

echo ""
echo "Got JWT token: ${TOKEN:0:20}..."
echo ""

# Test 4: Access protected route without token
echo "4. Testing protected route WITHOUT token (should fail)..."
curl -s "${BASE_URL}/api/tasks" | jq '.' || echo "Failed as expected"
echo ""

# Test 5: Access protected route with token
echo "5. Testing protected route WITH token (should succeed)..."
curl -s "${BASE_URL}/api/tasks" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.' || echo "Failed"
echo ""

# Test 6: Get current user profile
echo "6. Testing /api/auth/me endpoint..."
curl -s "${BASE_URL}/api/auth/me" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.' || echo "Failed"
echo ""

# Test 7: Create a task
echo "7. Testing task creation (protected)..."
curl -s -X POST "${BASE_URL}/api/tasks" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task from Auth System",
    "description": "This task was created to test the auth system",
    "priority": "Medium",
    "status": "pending"
  }' | jq '.' || echo "Failed"
echo ""

echo "=== Auth Test Complete ==="
