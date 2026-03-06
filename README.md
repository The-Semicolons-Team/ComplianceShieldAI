# AI Compliance Monitoring System for Indian MSMEs

A secure, stateless, serverless AI compliance monitoring system designed for Indian Micro, Small, and Medium Enterprises (MSMEs). The system integrates with email services to automatically extract government compliance notices, identify deadlines, assess risk levels, and store structured metadata using AWS-native services exclusively.

## Architecture

The system is built on AWS serverless architecture with the following key components:

- **Email Integration Service**: OAuth-based integration with Gmail and Outlook
- **Compliance Extraction Engine**: AI-powered extraction using AWS Bedrock, Textract, and Comprehend
- **Risk Assessment Service**: Intelligent risk scoring based on deadlines, penalties, and history
- **Notification Service**: Multi-channel notifications (Email, SMS, WhatsApp)
- **REST API**: Secure API for querying compliance data and managing preferences
- **Data Storage**: DynamoDB for metadata, Secrets Manager for OAuth tokens

## Technology Stack

- **Node.js 20.x (ARM64)**: Email retrieval, notifications, API handlers
- **Python 3.12 (ARM64)**: Compliance extraction, risk assessment
- **AWS Services**: Lambda, DynamoDB, Bedrock, Textract, Comprehend, SES, SNS, API Gateway, EventBridge, Secrets Manager, KMS, CloudWatch, X-Ray
- **Infrastructure as Code**: Terraform
- **Testing**: Jest + fast-check (Node.js), pytest + Hypothesis (Python)

## Project Structure

```
.
├── src/
│   ├── lambda/
│   │   ├── email-retrieval/       # Email retrieval Lambda function (Node.js)
│   │   ├── compliance-extraction/ # Compliance extraction Lambda function (Python)
│   │   ├── risk-assessment/       # Risk assessment Lambda function (Python)
│   │   ├── notification-handler/  # Notification Lambda function (Node.js)
│   │   └── api-handler/           # API Gateway Lambda handlers (Node.js)
│   └── shared/
│       ├── models.py              # Shared Python data models
│       └── types.ts               # Shared TypeScript interfaces
├── infrastructure/
│   ├── main.tf                    # Main Terraform configuration
│   └── modules/                   # Terraform modules
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── property/                  # Property-based tests
├── docs/
│   └── images/                    # Architecture diagrams
├── requirements.md                # Requirements document
├── design.md                      # Design document
└── .kiro/specs/                   # Spec files
    └── ai-compliance-monitoring-msme/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Prerequisites

- Node.js 20.x or higher
- Python 3.12 or higher
- AWS CLI configured with appropriate credentials
- Terraform 1.6.0 or higher
- AWS Account with access to India regions (ap-south-1, ap-south-2)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-compliance-monitoring-msme
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   cd src/lambda/email-retrieval && npm install && cd ../../..
   cd src/lambda/notification-handler && npm install && cd ../../..
   cd src/lambda/api-handler && npm install && cd ../../..
   ```

3. **Install Python dependencies**
   ```bash
   cd src/lambda/compliance-extraction
   pip install -r requirements.txt
   cd ../risk-assessment
   pip install -r requirements.txt
   cd ../../..
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS account details and configuration
   ```

5. **Initialize Terraform**
   ```bash
   npm run infra:init
   ```

## Development

### Running Tests

```bash
# Run all tests
npm run test:all

# Run Node.js tests only
npm test

# Run Python tests only
npm run test:python

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Infrastructure Management

```bash
# Validate Terraform configuration
npm run infra:validate

# Plan infrastructure changes
npm run infra:plan

# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

## Deployment

The system uses Terraform for infrastructure as code. Deployment is automated through the CI/CD pipeline.

### Manual Deployment

1. **Validate infrastructure configuration**
   ```bash
   npm run infra:validate
   ```

2. **Review planned changes**
   ```bash
   npm run infra:plan
   ```

3. **Deploy to environment**
   ```bash
   npm run deploy:dev  # or deploy:staging, deploy:prod
   ```

## Testing Strategy

The system uses a comprehensive testing approach:

- **Unit Tests**: Test individual functions and components
- **Property-Based Tests**: Validate universal correctness properties (49 properties)
- **Integration Tests**: Test end-to-end workflows
- **Load Tests**: Validate performance under load
- **Security Tests**: Validate security controls
- **Compliance Tests**: Validate regulatory compliance

### Property-Based Testing

All 49 correctness properties are validated using:
- **fast-check** for Node.js Lambda functions
- **Hypothesis** for Python Lambda functions

Each property test runs a minimum of 100 iterations with randomized inputs.

## Compliance

The system complies with:
- **DPDP Act 2023**: Digital Personal Data Protection Act
- **IT Act 2000**: Information Technology Act
- **Data Residency**: All data stored in AWS India regions (Mumbai, Hyderabad)
- **Encryption**: All data encrypted at rest (KMS) and in transit (TLS 1.3)
- **Audit Logging**: All operations logged to CloudTrail

## Monitoring

The system includes comprehensive monitoring:
- **CloudWatch Logs**: Structured logging for all operations
- **CloudWatch Dashboards**: Key metrics visualization
- **CloudWatch Alarms**: Automated alerting for anomalies
- **X-Ray Tracing**: Distributed tracing for debugging
- **Custom Metrics**: Business metrics tracking

## Security

Security features include:
- OAuth 2.0 for email provider authentication
- AWS KMS for encryption key management
- IAM roles with least privilege permissions
- AWS WAF for API protection
- VPC endpoints for private AWS service communication
- Multi-factor authentication for administrative access
- Log sanitization to redact sensitive information

## Cost Optimization

Cost optimization strategies:
- ARM64 Graviton processors for Lambda functions
- DynamoDB on-demand capacity mode
- Intelligent email filtering (government domains only)
- S3 Intelligent-Tiering for temporary storage
- CloudWatch Logs retention policies (90 days)
- AWS Bedrock on-demand pricing

## Support

For issues, questions, or contributions, please refer to the project documentation in the `docs/` directory.

## License

MIT License - See LICENSE file for details
