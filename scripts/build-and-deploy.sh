#!/bin/bash

# SGT UMS - Production Build and Push Script
set -e

# Configuration
PROJECT_NAME="sgt-ums"
AWS_REGION=${AWS_REGION:-"us-east-1"}
IMAGE_TAG=${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get ECR repository URLs
get_ecr_urls() {
    print_status "Getting ECR repository URLs..."
    
    ECR_BACKEND=$(aws ecr describe-repositories \
        --repository-names "${PROJECT_NAME}-backend" \
        --region "$AWS_REGION" \
        --query 'repositories[0].repositoryUri' \
        --output text 2>/dev/null || echo "")
    
    ECR_FRONTEND=$(aws ecr describe-repositories \
        --repository-names "${PROJECT_NAME}-frontend" \
        --region "$AWS_REGION" \
        --query 'repositories[0].repositoryUri' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$ECR_BACKEND" ] || [ -z "$ECR_FRONTEND" ]; then
        print_error "ECR repositories not found. Please deploy infrastructure first."
        exit 1
    fi
    
    print_status "Backend ECR: $ECR_BACKEND"
    print_status "Frontend ECR: $ECR_FRONTEND"
}

# Login to ECR
ecr_login() {
    print_status "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "${ECR_BACKEND%%/*}"
}

# Build images
build_images() {
    print_status "Building Docker images..."
    
    # Build backend image
    print_status "Building backend image with tag: $IMAGE_TAG"
    docker build \
        -f Dockerfile.backend \
        --target production \
        -t "${ECR_BACKEND}:${IMAGE_TAG}" \
        -t "${ECR_BACKEND}:latest" \
        -t "${ECR_BACKEND}:${ENVIRONMENT}" \
        .
    
    # Build frontend image
    print_status "Building frontend image with tag: $IMAGE_TAG"
    docker build \
        -f Dockerfile.frontend \
        --target production \
        -t "${ECR_FRONTEND}:${IMAGE_TAG}" \
        -t "${ECR_FRONTEND}:latest" \
        -t "${ECR_FRONTEND}:${ENVIRONMENT}" \
        .
}

# Push images
push_images() {
    print_status "Pushing Docker images to ECR..."
    
    # Push backend images
    print_status "Pushing backend images..."
    docker push "${ECR_BACKEND}:${IMAGE_TAG}"
    docker push "${ECR_BACKEND}:latest"
    docker push "${ECR_BACKEND}:${ENVIRONMENT}"
    
    # Push frontend images
    print_status "Pushing frontend images..."
    docker push "${ECR_FRONTEND}:${IMAGE_TAG}"
    docker push "${ECR_FRONTEND}:latest"
    docker push "${ECR_FRONTEND}:${ENVIRONMENT}"
}

# Update ECS services
update_services() {
    print_status "Updating ECS services..."
    
    CLUSTER_NAME="${PROJECT_NAME}-cluster"
    
    # Update backend service
    print_status "Updating backend service..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "${PROJECT_NAME}-backend-service" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        > /dev/null
    
    # Update frontend service
    print_status "Updating frontend service..."
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "${PROJECT_NAME}-frontend-service" \
        --force-new-deployment \
        --region "$AWS_REGION" \
        > /dev/null
}

# Wait for deployment
wait_for_deployment() {
    print_status "Waiting for deployment to complete..."
    
    CLUSTER_NAME="${PROJECT_NAME}-cluster"
    
    # Wait for backend service
    print_status "Waiting for backend service..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "${PROJECT_NAME}-backend-service" \
        --region "$AWS_REGION"
    
    # Wait for frontend service
    print_status "Waiting for frontend service..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "${PROJECT_NAME}-frontend-service" \
        --region "$AWS_REGION"
}

# Main function
main() {
    echo "🐳 SGT UMS - Build and Deploy Script"
    echo "===================================="
    echo ""
    echo "Image Tag: $IMAGE_TAG"
    echo "Environment: $ENVIRONMENT"
    echo "Region: $AWS_REGION"
    echo ""
    
    get_ecr_urls
    ecr_login
    build_images
    push_images
    update_services
    wait_for_deployment
    
    print_status "🎉 Deployment completed successfully!"
    print_status "Images pushed with tag: $IMAGE_TAG"
}

# Check if required tools are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is required but not installed."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is required but not installed."
    exit 1
fi

# Run main function
main "$@"