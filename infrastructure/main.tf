# AI Compliance Monitoring System - Terraform Infrastructure
# Main configuration file

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    # Configure backend for state management
    # bucket = "compliance-shield-terraform-state"
    # key    = "infrastructure/terraform.tfstate"
    # region = "ap-south-1"
    # encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "AI-Compliance-Monitoring"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for deployment (must be India region)"
  type        = string
  default     = "ap-south-1"
  
  validation {
    condition     = contains(["ap-south-1", "ap-south-2"], var.aws_region)
    error_message = "Region must be ap-south-1 (Mumbai) or ap-south-2 (Hyderabad) for data residency compliance."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "compliance-shield"
}

# Outputs
output "dynamodb_table_names" {
  description = "Names of created DynamoDB tables"
  value = {
    compliance_metadata        = module.dynamodb.compliance_metadata_table_name
    user_integrations         = module.dynamodb.user_integrations_table_name
    processed_emails          = module.dynamodb.processed_emails_table_name
    notification_preferences  = module.dynamodb.notification_preferences_table_name
  }
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_url
}

output "lambda_function_arns" {
  description = "ARNs of Lambda functions"
  value = {
    email_retrieval        = module.lambda.email_retrieval_function_arn
    compliance_extraction  = module.lambda.compliance_extraction_function_arn
    risk_assessment       = module.lambda.risk_assessment_function_arn
    notification_handler  = module.lambda.notification_handler_function_arn
  }
}

# Modules
module "dynamodb" {
  source = "./modules/dynamodb"
  
  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = module.kms.dynamodb_key_arn
}

module "kms" {
  source = "./modules/kms"
  
  project_name = var.project_name
  environment  = var.environment
}

module "iam" {
  source = "./modules/iam"
  
  project_name                    = var.project_name
  environment                     = var.environment
  compliance_metadata_table_arn   = module.dynamodb.compliance_metadata_table_arn
  user_integrations_table_arn     = module.dynamodb.user_integrations_table_arn
  processed_emails_table_arn      = module.dynamodb.processed_emails_table_arn
  notification_preferences_table_arn = module.dynamodb.notification_preferences_table_arn
}

module "sqs" {
  source = "./modules/sqs"
  
  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = module.kms.sqs_key_arn
}

module "lambda" {
  source = "./modules/lambda"
  
  project_name = var.project_name
  environment  = var.environment
  
  # IAM roles
  email_retrieval_role_arn       = module.iam.email_retrieval_role_arn
  compliance_extraction_role_arn = module.iam.compliance_extraction_role_arn
  risk_assessment_role_arn       = module.iam.risk_assessment_role_arn
  notification_handler_role_arn  = module.iam.notification_handler_role_arn
  
  # SQS queues
  email_processing_queue_url = module.sqs.email_processing_queue_url
}

module "api_gateway" {
  source = "./modules/api_gateway"
  
  project_name = var.project_name
  environment  = var.environment
}

module "eventbridge" {
  source = "./modules/eventbridge"
  
  project_name                   = var.project_name
  environment                    = var.environment
  email_retrieval_function_arn   = module.lambda.email_retrieval_function_arn
  notification_handler_function_arn = module.lambda.notification_handler_function_arn
}

module "cognito" {
  source = "./modules/cognito"
  
  project_name = var.project_name
  environment  = var.environment
}

module "cloudwatch" {
  source = "./modules/cloudwatch"
  
  project_name = var.project_name
  environment  = var.environment
}
