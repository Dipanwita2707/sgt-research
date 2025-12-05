terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "sgt-ums-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
    
    # Enable state locking
    dynamodb_table = "sgt-ums-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SGT-UMS"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}