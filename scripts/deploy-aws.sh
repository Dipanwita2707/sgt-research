#!/bin/bash

# SGT UMS - Production Deployment Script for AWS
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
PROJECT_NAME="sgt-ums"
ENVIRONMENT=${ENVIRONMENT:-"production"}

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check required tools
check_requirements() {
    print_step "Checking requirements..."
    
    local missing_tools=()
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi
    
    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install them and try again."
        exit 1
    fi
    
    print_status "All required tools are installed."
}

# Check AWS credentials
check_aws_credentials() {
    print_step "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid."
        print_error "Please run 'aws configure' and try again."
        exit 1
    fi
    
    print_status "AWS credentials are valid."
}

# Initialize Terraform backend
init_terraform() {
    print_step "Initializing Terraform..."
    
    cd terraform
    
    # Create S3 bucket for state if it doesn't exist
    if ! aws s3 ls "s3://${PROJECT_NAME}-terraform-state" &> /dev/null; then
        print_status "Creating Terraform state bucket..."
        aws s3 mb "s3://${PROJECT_NAME}-terraform-state" --region "$AWS_REGION"
        aws s3api put-bucket-versioning \
            --bucket "${PROJECT_NAME}-terraform-state" \
            --versioning-configuration Status=Enabled
    fi
    
    # Create DynamoDB table for state locking if it doesn't exist
    if ! aws dynamodb describe-table --table-name "${PROJECT_NAME}-terraform-locks" --region "$AWS_REGION" &> /dev/null; then
        print_status "Creating Terraform lock table..."
        aws dynamodb create-table \
            --table-name "${PROJECT_NAME}-terraform-locks" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region "$AWS_REGION"
        
        print_status "Waiting for DynamoDB table to be created..."
        aws dynamodb wait table-exists \
            --table-name "${PROJECT_NAME}-terraform-locks" \
            --region "$AWS_REGION"
    fi
    
    terraform init
    cd ..
}

# Plan and apply infrastructure
deploy_infrastructure() {
    print_step "Deploying infrastructure with Terraform..."
    
    cd terraform
    
    # Plan the deployment
    terraform plan -var="aws_region=$AWS_REGION" -var="environment=$ENVIRONMENT" -out=tfplan
    
    # Ask for confirmation
    echo ""
    print_warning "Review the Terraform plan above."
    read -p "Do you want to apply these changes? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Deployment cancelled by user."
        rm -f tfplan
        cd ..
        exit 0
    fi
    
    # Apply the changes
    terraform apply tfplan
    rm -f tfplan
    
    # Output important values
    print_status "Infrastructure deployed successfully!"
    echo ""
    print_status "Important outputs:"
    terraform output
    
    cd ..
}

# Build and push Docker images
build_and_push_images() {
    print_step "Building and pushing Docker images..."
    
    # Get ECR repository URLs
    ECR_BACKEND=$(aws ecr describe-repositories --repository-names sgt-ums-backend --region "$AWS_REGION" --query 'repositories[0].repositoryUri' --output text)
    ECR_FRONTEND=$(aws ecr describe-repositories --repository-names sgt-ums-frontend --region "$AWS_REGION" --query 'repositories[0].repositoryUri' --output text)
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_BACKEND"
    
    # Build and tag backend image
    print_status "Building backend image..."
    docker build -f Dockerfile.backend -t "${ECR_BACKEND}:latest" -t "${ECR_BACKEND}:${ENVIRONMENT}" --target production .
    
    # Build and tag frontend image
    print_status "Building frontend image..."
    docker build -f Dockerfile.frontend -t "${ECR_FRONTEND}:latest" -t "${ECR_FRONTEND}:${ENVIRONMENT}" --target production .
    
    # Push images
    print_status "Pushing backend image..."
    docker push "${ECR_BACKEND}:latest"
    docker push "${ECR_BACKEND}:${ENVIRONMENT}"
    
    print_status "Pushing frontend image..."
    docker push "${ECR_FRONTEND}:latest"
    docker push "${ECR_FRONTEND}:${ENVIRONMENT}"
    
    print_status "Docker images pushed successfully!"
}

# Deploy to ECS
deploy_to_ecs() {
    print_step "Deploying to ECS..."
    
    # Update ECS services to use new images
    CLUSTER_NAME="${PROJECT_NAME}-cluster"
    
    # Force new deployment to pick up new images
    print_status "Updating backend service..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "${PROJECT_NAME}-backend-service" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        > /dev/null
    
    print_status "Updating frontend service..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "${PROJECT_NAME}-frontend-service" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        > /dev/null
    
    print_status "ECS services updated. Deployments in progress..."
}

# Run database migrations
run_migrations() {
    print_step "Running database migrations..."
    
    # This would typically be done through ECS task or CI/CD pipeline
    print_warning "Database migrations should be run manually or through CI/CD."
    print_warning "Make sure to run 'npx prisma migrate deploy' in production environment."
}

# Main deployment function
main() {
    echo "🚀 SGT UMS Production Deployment to AWS"
    echo "======================================="
    echo ""
    
    check_requirements
    check_aws_credentials
    init_terraform
    deploy_infrastructure
    build_and_push_images
    deploy_to_ecs
    run_migrations
    
    echo ""
    print_status "🎉 Deployment completed successfully!"
    echo ""
    print_status "Next steps:"
    echo "1. Configure your domain DNS to point to the ALB"
    echo "2. Update SSL certificate ARN in terraform/variables.tf if needed"
    echo "3. Run database migrations if this is a fresh deployment"
    echo "4. Monitor the ECS services for successful deployment"
    echo ""
    print_status "Access your application via the ALB DNS name shown in Terraform outputs."
}

# Run main function
main "$@"