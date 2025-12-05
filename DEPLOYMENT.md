# SGT UMS - Docker & AWS Deployment Guide

## Overview
This guide covers Docker containerization and AWS deployment for the SGT University Management System (UMS) with integrated IPR module and collaborative editing features.

## Architecture

### Local Development
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   Database      │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │  (Caching)      │
                    │   Port: 6379    │
                    └─────────────────┘
```

### AWS Production Architecture
```
Internet → ALB → ECS Fargate → RDS PostgreSQL
            │         │              │
            │         └──── EFS ─────┘
            │               │
            └─── CloudFront ── S3 Assets
```

## Prerequisites

### Local Development
- Docker & Docker Compose
- Node.js 18+ (optional for local development)
- PostgreSQL (optional, can use Docker)

### AWS Production
- AWS CLI configured
- Terraform >= 1.0
- Docker
- Domain name (optional)
- SSL Certificate in AWS Certificate Manager (optional)

## Quick Start

### 1. Local Development with Docker

```bash
# Clone and navigate to project
git clone <repository-url>
cd sgt-ums

# Make scripts executable
chmod +x scripts/*.sh

# Setup development environment
./scripts/setup-dev.sh

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# Database: localhost:5432 (postgres/postgres_password)
```

### 2. Production Deployment to AWS

```bash
# Configure AWS credentials
aws configure

# Deploy infrastructure and application
./scripts/deploy-aws.sh

# Or build and deploy images only
./scripts/build-and-deploy.sh
```

## Docker Configuration

### Development Environment

**docker-compose.dev.yml**
- Hot reload for both frontend and backend
- Local PostgreSQL database
- Volume mounts for source code
- Redis for caching

**Services:**
- `backend-dev`: Node.js development server with Prisma
- `frontend-dev`: Next.js development server
- `database`: PostgreSQL with development data
- `redis-dev`: Redis for session management

### Production Environment

**docker-compose.yml**
- Optimized production builds
- Multi-stage Docker builds
- Health checks
- Nginx reverse proxy
- Security hardening

**Services:**
- `backend`: Production Node.js server
- `frontend`: Production Next.js server
- `database`: PostgreSQL with production configuration
- `nginx`: Reverse proxy with SSL
- `redis`: Redis with persistence

## AWS Infrastructure

### Components Deployed
1. **VPC & Networking**
   - Public/Private/Database subnets across 2 AZs
   - NAT Gateways for private subnet internet access
   - Security groups with least privilege

2. **Compute (ECS Fargate)**
   - Auto-scaling ECS cluster
   - Separate services for frontend/backend
   - Task definitions with health checks

3. **Database (RDS PostgreSQL)**
   - Multi-AZ deployment for high availability
   - Automated backups and point-in-time recovery
   - Enhanced monitoring and performance insights

4. **Storage**
   - EFS for shared file uploads
   - S3 for static assets and backups
   - CloudFront CDN for global distribution

5. **Load Balancing**
   - Application Load Balancer with SSL termination
   - Path-based routing (/api/* → backend)
   - Health checks and auto-failover

6. **Security**
   - AWS Secrets Manager for sensitive data
   - IAM roles with minimal permissions
   - VPC Flow Logs and CloudTrail

### Cost Optimization
- t3.micro RDS instance (can be upgraded)
- Fargate Spot for development environments
- S3 Lifecycle policies for log retention
- CloudWatch log retention policies

## Environment Configuration

### Backend Environment Variables
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-super-secret-key
FRONTEND_URL=https://yourdomain.com
AWS_REGION=us-east-1
S3_BUCKET=your-s3-bucket
```

### Frontend Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_NAME=SGT UMS
```

## CI/CD Pipeline

### GitHub Actions Workflow
1. **Code Quality**
   - ESLint for code quality
   - Security vulnerability scanning
   - Dependency auditing

2. **Testing**
   - Unit tests for backend
   - Frontend build verification
   - Integration tests

3. **Build & Deploy**
   - Multi-platform Docker builds
   - Push to ECR repositories
   - Deploy to ECS services
   - Database migrations

4. **Monitoring**
   - Slack notifications
   - CloudWatch alerts
   - Health check monitoring

### Deployment Triggers
- **main branch**: Production deployment
- **develop branch**: Staging deployment
- **Pull Requests**: Testing and validation

## Database Management

### Migrations
```bash
# Development
docker-compose -f docker-compose.dev.yml exec backend-dev npx prisma migrate dev

# Production (automated in CI/CD)
npx prisma migrate deploy
```

### Backups
- Automated RDS backups (7-day retention)
- Point-in-time recovery
- Manual snapshots before major updates

### Seeding
```bash
# Seed development data
docker-compose -f docker-compose.dev.yml exec backend-dev npm run seed

# Production seeding (one-time)
# Use ECS task or connect directly to production database
```

## File Storage

### Local Development
- Files stored in `backend/uploads/`
- Volume mounted in Docker containers

### Production
- EFS mounted to all backend containers
- Automatic scaling and high availability
- Backup to S3 (optional)

## Monitoring & Logging

### Application Logs
- CloudWatch Logs for all services
- Structured JSON logging
- Log aggregation and searching

### Metrics
- ECS service metrics
- RDS performance metrics
- Application Load Balancer metrics
- Custom application metrics

### Alerting
- CloudWatch Alarms for critical metrics
- SNS notifications
- Slack integration via GitHub Actions

## Security

### Network Security
- Private subnets for application and database
- Security groups with minimal access
- VPC Flow Logs for network monitoring

### Application Security
- JWT-based authentication
- Rate limiting on API endpoints
- SQL injection protection via Prisma
- XSS protection headers

### Data Security
- Encryption at rest (RDS, EFS, S3)
- Encryption in transit (TLS 1.2+)
- Secrets managed via AWS Secrets Manager
- Regular security updates

## Scaling

### Horizontal Scaling
```bash
# Scale ECS services
aws ecs update-service \
    --cluster sgt-ums-cluster \
    --service sgt-ums-backend-service \
    --desired-count 4
```

### Auto Scaling
- ECS Service Auto Scaling based on CPU/Memory
- RDS Auto Scaling for storage
- ALB automatically handles load distribution

### Performance Optimization
- CloudFront CDN for static assets
- Redis for session caching
- Database connection pooling
- Efficient Docker images with multi-stage builds

## Troubleshooting

### Common Issues

**Backend not connecting to database:**
```bash
# Check database connectivity
docker-compose -f docker-compose.dev.yml exec backend-dev npx prisma db pull
```

**Frontend build failures:**
```bash
# Clear Next.js cache
docker-compose -f docker-compose.dev.yml exec frontend-dev rm -rf .next
docker-compose -f docker-compose.dev.yml restart frontend-dev
```

**ECS Service not starting:**
```bash
# Check ECS service events
aws ecs describe-services \
    --cluster sgt-ums-cluster \
    --services sgt-ums-backend-service \
    --query 'services[0].events'
```

### Debugging Commands

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f backend-dev
docker-compose -f docker-compose.dev.yml logs -f frontend-dev

# Execute commands in containers
docker-compose -f docker-compose.dev.yml exec backend-dev bash
docker-compose -f docker-compose.dev.yml exec frontend-dev sh

# Database access
docker-compose -f docker-compose.dev.yml exec database psql -U postgres sgt_ums_dev
```

## Maintenance

### Regular Tasks
1. **Security Updates**
   - Update base Docker images monthly
   - Apply security patches to dependencies
   - Rotate secrets annually

2. **Database Maintenance**
   - Monitor performance metrics
   - Analyze slow queries
   - Update statistics and reindex

3. **Cost Optimization**
   - Review CloudWatch costs
   - Optimize resource utilization
   - Clean up old resources

### Backup & Recovery
1. **Database Recovery**
   ```bash
   # Restore from RDS snapshot
   aws rds restore-db-instance-from-db-snapshot \
       --db-instance-identifier sgt-ums-restore \
       --db-snapshot-identifier sgt-ums-snapshot-2024
   ```

2. **Application Recovery**
   - Rollback to previous ECS task definition
   - Deploy from previous ECR image tag
   - Restore files from EFS backup

## Support

### Documentation
- API Documentation: `/api/docs`
- Prisma Studio: `npx prisma studio`
- AWS Documentation: https://docs.aws.amazon.com/

### Contacts
- **Development Team**: development@sgt.edu
- **DevOps Team**: devops@sgt.edu
- **AWS Support**: [Your AWS Support Plan]

---

## Quick Commands Reference

### Development
```bash
# Start development environment
./scripts/setup-dev.sh

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Rebuild images
docker-compose -f docker-compose.dev.yml build --no-cache

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production
```bash
# Deploy to AWS
./scripts/deploy-aws.sh

# Build and push images
./scripts/build-and-deploy.sh

# Update ECS services
aws ecs update-service --cluster sgt-ums-cluster --service sgt-ums-backend-service --force-new-deployment
```

### Database
```bash
# Run migrations
npx prisma migrate deploy

# Generate client
npx prisma generate

# Seed database
npm run seed

# Open Prisma Studio
npx prisma studio
```