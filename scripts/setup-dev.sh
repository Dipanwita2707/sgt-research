#!/bin/bash

# SGT UMS - Local Development Setup Script
set -e

echo "🚀 Setting up SGT UMS for local development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker and try again."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose and try again."
    exit 1
fi

# Create environment files if they don't exist
print_status "Creating environment files..."

if [ ! -f backend/.env ]; then
    print_status "Creating backend .env file..."
    cp backend/.env.example backend/.env
    print_warning "Please update backend/.env with your configuration"
fi

if [ ! -f frontend/.env.local ]; then
    print_status "Creating frontend .env.local file..."
    cp frontend/.env.example frontend/.env.local
    print_warning "Please update frontend/.env.local with your configuration"
fi

# Build and start development environment
print_status "Building and starting development environment..."

# Use docker-compose if available, otherwise use docker compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Stop any existing containers
print_status "Stopping existing containers..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down

# Build and start services
print_status "Building images..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml build

print_status "Starting services..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up -d

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec backend-dev npm run prisma:migrate

# Generate Prisma client
print_status "Generating Prisma client..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec backend-dev npm run prisma:generate

# Seed database
print_status "Seeding database..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec backend-dev npm run seed

print_status "Development environment is ready!"
echo ""
echo "📝 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000/api/v1"
echo "   Database: localhost:5432"
echo ""
echo "🔐 Test Credentials:"
echo "   Admin: admin / admin123"
echo "   Student: 123456789 / student123"
echo "   Staff: 12345 / staff123"
echo ""
echo "📊 Useful Commands:"
echo "   View logs: $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml logs -f"
echo "   Stop services: $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down"
echo "   Rebuild: $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml build --no-cache"