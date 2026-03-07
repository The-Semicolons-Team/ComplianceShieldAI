import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AppStack } from '../lib/app-stack';

describe('AppStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new AppStack(app, 'TestAppStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
      environment: 'dev',
    });
    template = Template.fromStack(stack);
  });

  test('creates DynamoDB tables', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 4);
  });

  test('compliance-metadata table has correct keys', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'user_id', KeyType: 'HASH' },
        { AttributeName: 'notice_id', KeyType: 'RANGE' },
      ],
    });
  });

  test('creates Lambda functions', () => {
    // 5 app Lambdas + log retention custom resource Lambdas
    const fns = template.findResources('AWS::Lambda::Function');
    expect(Object.keys(fns).length).toBeGreaterThanOrEqual(5);
  });

  test('Lambda functions use Python 3.12', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.12',
    });
  });

  test('creates API Gateway REST API', () => {
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  test('creates SQS queue with DLQ', () => {
    // Main queue + DLQ = 2
    template.resourceCountIs('AWS::SQS::Queue', 2);
  });

  test('creates SNS topics', () => {
    template.resourceCountIs('AWS::SNS::Topic', 2);
  });

  test('creates EventBridge rules for scheduled tasks', () => {
    const rules = template.findResources('AWS::Events::Rule');
    expect(Object.keys(rules).length).toBeGreaterThan(0);
  });

  test('creates KMS key', () => {
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('creates CloudWatch dashboard', () => {
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
  });

  test('outputs API URL', () => {
    template.hasOutput('ApiUrl', {});
  });
});
