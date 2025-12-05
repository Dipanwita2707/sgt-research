# SGT UMS - Makefile for Docker and AWS operations

# Variables
PROJECT_NAME := sgt-ums
AWS_REGION := us-east-1
ENVIRONMENT := production

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

.PHONY: help dev-setup dev-start dev-stop dev-logs dev-rebuild prod-build prod-deploy aws-init clean

# Default target
help: ## Show this help message
	@echo "$(GREEN)SGT UMS - Docker & AWS Commands$(NC)"
	@echo "=================================="
	@echo ""
	@echo "Development Commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /dev-/ {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Production Commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /prod-/ {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "AWS Commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /aws-/ {printf "  $(RED)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Utility Commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && !/dev-|prod-|aws-/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development Commands
dev-setup: ## Setup development environment with Docker
	@echo "$(GREEN)Setting up development environment...$(NC)"
	@chmod +x scripts/*.sh
	@./scripts/setup-dev.sh

dev-start: ## Start development containers
	@echo "$(GREEN)Starting development containers...$(NC)"
	@docker-compose -f docker-compose.dev.yml up -d

dev-stop: ## Stop development containers
	@echo "$(YELLOW)Stopping development containers...$(NC)"
	@docker-compose -f docker-compose.dev.yml down

dev-logs: ## View development logs
	@docker-compose -f docker-compose.dev.yml logs -f

dev-rebuild: ## Rebuild development containers
	@echo "$(YELLOW)Rebuilding development containers...$(NC)"
	@docker-compose -f docker-compose.dev.yml down
	@docker-compose -f docker-compose.dev.yml build --no-cache
	@docker-compose -f docker-compose.dev.yml up -d

dev-db-migrate: ## Run database migrations in development
	@echo "$(GREEN)Running database migrations...$(NC)"
	@docker-compose -f docker-compose.dev.yml exec backend-dev npx prisma migrate dev

dev-db-seed: ## Seed development database
	@echo "$(GREEN)Seeding development database...$(NC)"
	@docker-compose -f docker-compose.dev.yml exec backend-dev npm run seed

dev-db-studio: ## Open Prisma Studio
	@echo "$(GREEN)Opening Prisma Studio...$(NC)"
	@docker-compose -f docker-compose.dev.yml exec backend-dev npx prisma studio

dev-shell-backend: ## Access backend container shell
	@docker-compose -f docker-compose.dev.yml exec backend-dev bash

dev-shell-frontend: ## Access frontend container shell
	@docker-compose -f docker-compose.dev.yml exec frontend-dev sh

dev-shell-db: ## Access database container
	@docker-compose -f docker-compose.dev.yml exec database psql -U postgres sgt_ums_dev

# Production Commands
prod-build: ## Build production Docker images
	@echo "$(YELLOW)Building production images...$(NC)"
	@docker build -f Dockerfile.backend --target production -t $(PROJECT_NAME)-backend:latest .
	@docker build -f Dockerfile.frontend --target production -t $(PROJECT_NAME)-frontend:latest .

prod-start: ## Start production containers locally
	@echo "$(YELLOW)Starting production containers...$(NC)"
	@docker-compose up -d

prod-stop: ## Stop production containers
	@echo "$(YELLOW)Stopping production containers...$(NC)"
	@docker-compose down

prod-logs: ## View production logs
	@docker-compose logs -f

prod-deploy: ## Deploy to AWS production
	@echo "$(RED)Deploying to AWS production...$(NC)"
	@chmod +x scripts/deploy-aws.sh
	@./scripts/deploy-aws.sh

# AWS Commands
aws-init: ## Initialize AWS infrastructure with Terraform
	@echo "$(RED)Initializing AWS infrastructure...$(NC)"
	@cd terraform && terraform init
	@cd terraform && terraform plan -var="aws_region=$(AWS_REGION)" -var="environment=$(ENVIRONMENT)"

aws-plan: ## Plan Terraform changes
	@echo "$(RED)Planning Terraform changes...$(NC)"
	@cd terraform && terraform plan -var="aws_region=$(AWS_REGION)" -var="environment=$(ENVIRONMENT)"

aws-apply: ## Apply Terraform changes
	@echo "$(RED)Applying Terraform changes...$(NC)"
	@cd terraform && terraform apply -var="aws_region=$(AWS_REGION)" -var="environment=$(ENVIRONMENT)"

aws-destroy: ## Destroy AWS infrastructure (WARNING: Destructive)
	@echo "$(RED)WARNING: This will destroy all AWS resources!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	@cd terraform && terraform destroy -var="aws_region=$(AWS_REGION)" -var="environment=$(ENVIRONMENT)"

aws-build-push: ## Build and push images to ECR
	@echo "$(RED)Building and pushing to ECR...$(NC)"
	@chmod +x scripts/build-and-deploy.sh
	@./scripts/build-and-deploy.sh

aws-logs: ## View ECS service logs
	@echo "$(RED)Fetching ECS service logs...$(NC)"
	@aws logs filter-log-events --log-group-name "/ecs/$(PROJECT_NAME)-backend" --start-time $$(date -d '1 hour ago' +%s)000
	@aws logs filter-log-events --log-group-name "/ecs/$(PROJECT_NAME)-frontend" --start-time $$(date -d '1 hour ago' +%s)000

aws-status: ## Check AWS deployment status
	@echo "$(RED)Checking AWS deployment status...$(NC)"
	@aws ecs describe-services --cluster $(PROJECT_NAME)-cluster --services $(PROJECT_NAME)-backend-service $(PROJECT_NAME)-frontend-service
	@aws rds describe-db-instances --db-instance-identifier $(PROJECT_NAME)-database

# Database Commands
db-backup: ## Backup production database
	@echo "$(YELLOW)Creating database backup...$(NC)"
	@aws rds create-db-snapshot --db-instance-identifier $(PROJECT_NAME)-database --db-snapshot-identifier $(PROJECT_NAME)-backup-$$(date +%Y%m%d-%H%M%S)

db-migrate-prod: ## Run production database migrations
	@echo "$(RED)Running production database migrations...$(NC)"
	@echo "This should typically be done through CI/CD pipeline"
	@echo "Manual command: npx prisma migrate deploy"

# Utility Commands
clean: ## Clean up Docker resources
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	@docker system prune -f
	@docker volume prune -f
	@docker network prune -f

clean-all: ## Clean up all Docker resources (including images)
	@echo "$(RED)WARNING: This will remove all Docker images!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	@docker system prune -a -f
	@docker volume prune -f

security-scan: ## Run security scan on Docker images
	@echo "$(YELLOW)Running security scans...$(NC)"
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image $(PROJECT_NAME)-backend:latest
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image $(PROJECT_NAME)-frontend:latest

lint: ## Run linting for both frontend and backend
	@echo "$(GREEN)Running linting...$(NC)"
	@cd backend && npm run lint --if-present
	@cd frontend && npm run lint

test: ## Run tests for both frontend and backend
	@echo "$(GREEN)Running tests...$(NC)"
	@cd backend && npm test --if-present
	@cd frontend && npm test --if-present

install: ## Install dependencies for both frontend and backend
	@echo "$(GREEN)Installing dependencies...$(NC)"
	@cd backend && npm install
	@cd frontend && npm install

update-deps: ## Update dependencies
	@echo "$(YELLOW)Updating dependencies...$(NC)"
	@cd backend && npm update
	@cd frontend && npm update

check-env: ## Check environment configuration
	@echo "$(GREEN)Checking environment configuration...$(NC)"
	@echo "Backend .env exists: $$(test -f backend/.env && echo 'Yes' || echo 'No')"
	@echo "Frontend .env.local exists: $$(test -f frontend/.env.local && echo 'Yes' || echo 'No')"
	@echo "Docker installed: $$(command -v docker > /dev/null 2>&1 && echo 'Yes' || echo 'No')"
	@echo "AWS CLI installed: $$(command -v aws > /dev/null 2>&1 && echo 'Yes' || echo 'No')"
	@echo "Terraform installed: $$(command -v terraform > /dev/null 2>&1 && echo 'Yes' || echo 'No')"