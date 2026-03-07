import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PipelineCoreStack } from '../lib/infrastructure-stack';

describe('PipelineCoreStack', () => {
  test('S3 Artifact Bucket Created with Versioning', () => {
    const app = new cdk.App();
    const stack = new PipelineCoreStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
    });
    const template = Template.fromStack(stack);

    // Verify S3 bucket exists with versioning enabled
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  test('S3 Bucket has 90-day Lifecycle Policy', () => {
    const app = new cdk.App();
    const stack = new PipelineCoreStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
    });
    const template = Template.fromStack(stack);

    // Verify lifecycle rule exists
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: [
          {
            ExpirationInDays: 90,
            Status: 'Enabled',
          },
        ],
      },
    });
  });

  test('IAM Roles Created for Pipeline Services', () => {
    const app = new cdk.App();
    const stack = new PipelineCoreStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
    });
    const template = Template.fromStack(stack);

    // Verify CodePipeline role exists
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'ComplianceShield-CodePipeline-Role',
      Description: 'IAM role for ComplianceShield CodePipeline',
    });

    // Verify CodeBuild role exists
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'ComplianceShield-CodeBuild-Role',
      Description: 'IAM role for ComplianceShield CodeBuild projects',
    });

    // Verify CodeDeploy role exists
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'ComplianceShield-CodeDeploy-Role',
      Description: 'IAM role for ComplianceShield CodeDeploy',
    });
  });

  test('Stack Outputs Defined', () => {
    const app = new cdk.App();
    const stack = new PipelineCoreStack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-south-1' },
    });
    const template = Template.fromStack(stack);

    // Verify outputs exist
    template.hasOutput('ArtifactBucketName', {});
    template.hasOutput('PipelineRoleArn', {});
    template.hasOutput('CodeBuildRoleArn', {});
    template.hasOutput('CodeDeployRoleArn', {});
  });
});
