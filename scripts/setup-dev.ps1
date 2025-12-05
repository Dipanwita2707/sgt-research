# SGT UMS - Windows Development Setup Script
param(
    [string]$Environment = "development"
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow" 
$Red = "Red"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

Write-Host "🚀 Setting up SGT UMS for local development..." -ForegroundColor Cyan
Write-Host "=" * 50

# Check prerequisites
Write-Status "Checking prerequisites..."

if (-not (Test-Command "docker")) {
    Write-Error "Docker is not installed. Please install Docker Desktop and try again."
    exit 1
}

# Check if Docker is running
try {
    docker info | Out-Null
}
catch {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# Check for Docker Compose
$dockerComposeCmd = ""
if (Test-Command "docker-compose") {
    $dockerComposeCmd = "docker-compose"
}
elseif (docker compose version 2>$null) {
    $dockerComposeCmd = "docker compose"
}
else {
    Write-Error "Docker Compose is not available. Please install Docker Compose and try again."
    exit 1
}

Write-Status "Docker and Docker Compose are available."

# Create environment files
Write-Status "Creating environment files..."

if (-not (Test-Path "backend\.env")) {
    Write-Status "Creating backend .env file..."
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Warning "Please update backend\.env with your configuration"
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Status "Creating frontend .env.local file..."
    Copy-Item "frontend\.env.example" "frontend\.env.local"
    Write-Warning "Please update frontend\.env.local with your configuration"
}

# Stop existing containers
Write-Status "Stopping existing containers..."
& $dockerComposeCmd -f docker-compose.dev.yml down 2>$null

# Build and start services
Write-Status "Building images..."
& $dockerComposeCmd -f docker-compose.dev.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build Docker images."
    exit 1
}

Write-Status "Starting services..."
& $dockerComposeCmd -f docker-compose.dev.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start services."
    exit 1
}

# Wait for database
Write-Status "Waiting for database to be ready..."
Start-Sleep -Seconds 10

# Run migrations
Write-Status "Running database migrations..."
& $dockerComposeCmd -f docker-compose.dev.yml exec backend-dev npm run prisma:migrate

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Database migration failed. You may need to run it manually."
}

# Generate Prisma client
Write-Status "Generating Prisma client..."
& $dockerComposeCmd -f docker-compose.dev.yml exec backend-dev npm run prisma:generate

# Seed database
Write-Status "Seeding database..."
& $dockerComposeCmd -f docker-compose.dev.yml exec backend-dev npm run seed

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Database seeding failed. You may need to run it manually."
}

Write-Host ""
Write-Status "Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000"
Write-Host "   Backend API: http://localhost:5000/api/v1"
Write-Host "   Database: localhost:5432"
Write-Host ""
Write-Host "🔐 Test Credentials:" -ForegroundColor Cyan
Write-Host "   Admin: admin / admin123"
Write-Host "   Student: 123456789 / student123"
Write-Host "   Staff: 12345 / staff123"
Write-Host ""
Write-Host "📊 Useful Commands:" -ForegroundColor Cyan
Write-Host "   View logs: $dockerComposeCmd -f docker-compose.dev.yml logs -f"
Write-Host "   Stop services: $dockerComposeCmd -f docker-compose.dev.yml down"
Write-Host "   Rebuild: $dockerComposeCmd -f docker-compose.dev.yml build --no-cache"
Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green