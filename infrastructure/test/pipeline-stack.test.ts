import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { PipelineStack } from '../lib/pipeline-stack';

describe('PipelineStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const testEnv = { account: '123456789012', region: 'ap-south-1' };

    // Create a mock artifact bucket in the same environment
    const bucketStack = new cdk.Stack(app, 'BucketStack', { env: testEnv });
    const artifactBucket = new s3.Bucket(bucketStack, 'ArtifactBucket', {
      bucketName: 'test-artifact-bucket',
    });

    const stack = new PipelineStack(app, 'TestPipelineStack', {
      env: testEnv,
      artifactBucket,
      repositoryOwner: 'The-Semicolons-Team',
      repositoryName: 'ComplianceShieldAI',
      branchName: 'main',
      githubTokenSecretName: 'github-oauth-token',
    });
    template = Template.fromStack(stack);
  });

  test('creates CodePipeline', () => {
    template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  });

  test('creates CodeBuild projects', () => {
    // Build + 3 deploy projects (dev, staging, prod)
    const projects = template.findResources('AWS::CodeBuild::Project');
    expect(Object.keys(projects).length).toBeGreaterThanOrEqual(1);
  });

  test('creates approval SNS topic', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'ComplianceShield Pipeline Approvals',
    });
  });

  test('pipeline has source stage', () => {
    const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
    const pipelineKey = Object.keys(pipelines)[0];
    const stages = pipelines[pipelineKey].Properties.Stages;
    const stageNames = stages.map((s: any) => s.Name);
    expect(stageNames).toContain('Source');
  });
});
