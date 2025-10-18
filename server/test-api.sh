#!/bin/bash
# Test script for Assessli Backend API

BASE_URL="http://localhost:5000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "Assessli Backend API Test Suite"
echo "======================================"
echo ""

# Test root endpoint
echo "Testing: GET /"
RESPONSE=$(curl -s "$BASE_URL/")
if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ Root endpoint working${NC}"
else
    echo -e "${RED}✗ Root endpoint failed${NC}"
fi
echo ""

# Test health endpoint
echo "Testing: GET /api/health"
RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$RESPONSE" | grep -q "Server is running"; then
    echo -e "${GREEN}✓ Health endpoint working${NC}"
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
fi
echo ""

# Test tasks endpoint
echo "Testing: GET /api/tasks"
RESPONSE=$(curl -s "$BASE_URL/api/tasks")
if echo "$RESPONSE" | grep -q "Tasks retrieved successfully"; then
    echo -e "${GREEN}✓ Tasks endpoint working${NC}"
else
    echo -e "${RED}✗ Tasks endpoint failed${NC}"
fi
echo ""

# Test chat endpoint
echo "Testing: POST /api/chat"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello"}')
if echo "$RESPONSE" | grep -q "Smart Academic Mentor"; then
    echo -e "${GREEN}✓ Chat endpoint working${NC}"
else
    echo -e "${RED}✗ Chat endpoint failed${NC}"
fi
echo ""

# Test study plans endpoint
echo "Testing: GET /api/study-plans"
RESPONSE=$(curl -s "$BASE_URL/api/study-plans")
if echo "$RESPONSE" | grep -q "Study plans retrieved successfully"; then
    echo -e "${GREEN}✓ Study plans endpoint working${NC}"
else
    echo -e "${RED}✗ Study plans endpoint failed${NC}"
fi
echo ""

# Test motivation endpoint
echo "Testing: GET /api/motivation/message"
RESPONSE=$(curl -s "$BASE_URL/api/motivation/message")
if echo "$RESPONSE" | grep -q "Motivational message retrieved successfully"; then
    echo -e "${GREEN}✓ Motivation endpoint working${NC}"
else
    echo -e "${RED}✗ Motivation endpoint failed${NC}"
fi
echo ""

# Test motivation quote endpoint
echo "Testing: GET /api/motivation/quote"
RESPONSE=$(curl -s "$BASE_URL/api/motivation/quote")
if echo "$RESPONSE" | grep -q "Daily quote retrieved successfully"; then
    echo -e "${GREEN}✓ Motivation quote endpoint working${NC}"
else
    echo -e "${RED}✗ Motivation quote endpoint failed${NC}"
fi
echo ""

# Test motivation tip endpoint
echo "Testing: GET /api/motivation/tip"
RESPONSE=$(curl -s "$BASE_URL/api/motivation/tip")
if echo "$RESPONSE" | grep -q "Study tip retrieved successfully"; then
    echo -e "${GREEN}✓ Motivation tip endpoint working${NC}"
else
    echo -e "${RED}✗ Motivation tip endpoint failed${NC}"
fi
echo ""

echo "======================================"
echo "Test Suite Complete"
echo "======================================"
