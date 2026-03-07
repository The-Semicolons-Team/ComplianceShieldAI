#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineCoreStack } from '../lib/infrastructure-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { AppStack } from '../lib/app-stack';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();

const awsEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-south-1',
};

const repositoryOwner = process.env.REPOSITORY_OWNER || 'The-Semicolons-Team';
const repositoryName = process.env.REPOSITORY_NAME || 'ComplianceShieldAI';
const githubTokenSecretName = process.env.GITHUB_TOKEN_SECRET_NAME || 'github-oauth-token';

// ─── Core Pipeline Infrastructure (S3 artifacts, IAM roles) ───
const coreStack = new PipelineCoreStack(app, 'ComplianceShield-Pipeline-Core', {
  env: awsEnv,
  description: 'Core infrastructure for ComplianceShield CI/CD Pipeline',
  tags: { Project: 'ComplianceShield', Environment: 'shared', ManagedBy: 'CDK' },
});

// ─── App Stacks per Environment ───
new AppStack(app, 'ComplianceShield-App-Dev', {
  env: awsEnv,
  environment: 'dev',
  description: 'ComplianceShield Dev environment',
  tags: { Project: 'ComplianceShield', Environment: 'dev', ManagedBy: 'CDK' },
});

new AppStack(app, 'ComplianceShield-App-Staging', {
  env: awsEnv,
  environment: 'staging',
  description: 'ComplianceShield Staging environment',
  tags: { Project: 'ComplianceShield', Environment: 'staging', ManagedBy: 'CDK' },
});

new AppStack(app, 'ComplianceShield-App-Prod', {
  env: awsEnv,
  environment: 'prod',
  description: 'ComplianceShield Production environment',
  tags: { Project: 'ComplianceShield', Environment: 'prod', ManagedBy: 'CDK' },
});

// ─── CI/CD Pipeline ───
new PipelineStack(app, 'ComplianceShield-Pipeline', {
  env: awsEnv,
  description: 'CI/CD pipeline for ComplianceShield',
  tags: { Project: 'ComplianceShield', ManagedBy: 'CDK' },
  artifactBucket: coreStack.artifactBucket,
  repositoryOwner,
  repositoryName,
  branchName: 'main',
  githubTokenSecretName,
});

// ─── Amplify Frontend ───
new AmplifyStack(app, 'ComplianceShield-Amplify-Dev', {
  env: awsEnv,
  environment: 'dev',
  repositoryOwner,
  repositoryName,
  githubTokenSecretName,
  apiUrl: 'https://50bbw55bjh.execute-api.ap-south-1.amazonaws.com/dev/',
  description: 'ComplianceShield Frontend (Dev)',
  tags: { Project: 'ComplianceShield', Environment: 'dev', ManagedBy: 'CDK' },
});
