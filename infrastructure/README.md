# ComplianceShield CI/CD Pipeline Infrastructure

This directory contains the AWS CDK infrastructure code for the ComplianceShield CI/CD pipeline.

## Overview

The infrastructure is built using AWS CDK (Cloud Development Kit) with TypeScript and provisions the following resources:

- **S3 Artifact Bucket**: Versioned bucket for storing pipeline artifacts with 90-day retention lifecycle policy
- **IAM Roles**: Service roles for CodePipeline, CodeBuild, and CodeDeploy with appropriate permissions
- **CloudFormation Outputs**: Exported values for bucket name and role ARNs for reference by other stacks

## Prerequisites

- Node.js 18+ and npm
- AWS CDK CLI (`npm install -g aws-cdk`)
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create IAM roles, S3 buckets, and CloudFormation stacks

## Project Structure

```
infrastructure/
├── bin/
│   └── infrastructure.ts       # CDK app entry point
├── lib/
│   └── infrastructure-stack.ts # Core pipeline infrastructure stack
├── test/
│   └── infrastructure.test.ts  # Unit tests for infrastructure
├── cdk.json                    # CDK configuration
├── package.json                # Node.js dependencies
└── tsconfig.json               # TypeScript configuration
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Build TypeScript

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Synthesize CloudFormation Template

```bash
cdk synth
```

This generates the CloudFormation template without deploying.

### Deploy to AWS

```bash
cdk deploy
```

This deploys the stack to AWS India region (ap-south-1).

### Destroy Stack

```bash
cdk destroy
```

**Note**: The S3 artifact bucket has a `RETAIN` deletion policy and will not be deleted automatically.

## Stack Details

### PipelineCoreStack

**Stack Name**: `ComplianceShield-Pipeline-Core`

**Region**: `ap-south-1` (AWS India - Mumbai)

**Resources**:

1. **S3 Artifact Bucket**
   - Name: `complianceshield-pipeline-artifacts-{ACCOUNT_ID}`
   - Versioning: Enabled
   - Encryption: S3-managed (AES256)
   - Public Access: Blocked
   - Lifecycle Policy: Delete objects after 90 days, non-current versions after 30 days
   - Deletion Policy: Retain

2. **CodePipeline IAM Role**
   - Name: `ComplianceShield-CodePipeline-Role`
   - Managed Policy: `AWSCodePipelineFullAccess`
   - Permissions: Read/write access to artifact bucket

3. **CodeBuild IAM Role**
   - Name: `ComplianceShield-CodeBuild-Role`
   - Managed Policy: `AWSCodeBuildAdminAccess`
   - Permissions:
     - Read/write access to artifact bucket
     - CloudFormation operations
     - Lambda, DynamoDB, API Gateway, EventBridge, SQS, SNS operations
     - IAM role management (for creating service roles)
     - Secrets Manager read access

4. **CodeDeploy IAM Role**
   - Name: `ComplianceShield-CodeDeploy-Role`
   - Managed Policy: `AWSCodeDeployRoleForLambda`
   - Permissions: Lambda deployment with traffic shifting

**Outputs**:

- `ArtifactBucketName`: S3 bucket name (exported as `ComplianceShield-ArtifactBucket`)
- `PipelineRoleArn`: CodePipeline role ARN (exported as `ComplianceShield-PipelineRole`)
- `CodeBuildRoleArn`: CodeBuild role ARN (exported as `ComplianceShield-CodeBuildRole`)
- `CodeDeployRoleArn`: CodeDeploy role ARN (exported as `ComplianceShield-CodeDeployRole`)

## Testing

The infrastructure includes comprehensive unit tests using Jest and CDK assertions:

- **S3 Bucket Tests**: Verify versioning and lifecycle policies
- **IAM Role Tests**: Verify all required roles are created with correct names
- **Output Tests**: Verify CloudFormation outputs are defined

Run tests with:

```bash
npm test
```

## Useful CDK Commands

- `npm run build`   - Compile TypeScript to JavaScript
- `npm run watch`   - Watch for changes and compile
- `npm run test`    - Run Jest unit tests
- `cdk deploy`      - Deploy stack to AWS account/region
- `cdk diff`        - Compare deployed stack with current state
- `cdk synth`       - Emit synthesized CloudFormation template
- `cdk destroy`     - Remove stack from AWS

## Requirements Validation

This infrastructure satisfies the following requirements from the CI/CD Pipeline specification:

- **Requirement 2.4**: Deployment artifacts uploaded to versioned artifact repository
- **Requirement 9.6**: Deployment artifacts preserved for at least 90 days to enable rollbacks

## Next Steps

After deploying the core infrastructure, the following components will be added:

1. Source stage integration (GitHub/CodeCommit)
2. Build stage with security scanning
3. Test stage (unit, property-based, integration tests)
4. Multi-environment deployment stages (dev, staging, production)
5. Lambda deployment with traffic shifting
6. Rollback capabilities
7. Monitoring and alerting
8. Secrets management
9. Frontend deployment via AWS Amplify

## Tags

All resources are tagged with:

- `Project`: ComplianceShield
- `Environment`: shared
- `ManagedBy`: CDK

## Security Considerations

- All S3 buckets have public access blocked
- IAM roles follow principle of least privilege
- Artifact bucket uses server-side encryption
- Secrets are retrieved from AWS Secrets Manager (not hardcoded)
- All resources are deployed in AWS India region for data residency compliance

## Support

For issues or questions, please refer to the main project documentation or contact the DevOps team.
