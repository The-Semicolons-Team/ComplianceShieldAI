import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class PipelineCoreStack extends cdk.Stack {
  public readonly artifactBucket: s3.Bucket;
  public readonly pipelineRole: iam.Role;
  public readonly codeBuildRole: iam.Role;
  public readonly codeDeployRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for pipeline artifacts with versioning and lifecycle policies
    this.artifactBucket = new s3.Bucket(this, 'PipelineArtifactBucket', {
      bucketName: `complianceshield-pipeline-artifacts-${cdk.Aws.ACCOUNT_ID}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DeleteOldArtifacts',
          enabled: true,
          expiration: cdk.Duration.days(90),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // IAM role for CodePipeline
    this.pipelineRole = new iam.Role(this, 'CodePipelineRole', {
      roleName: 'ComplianceShield-CodePipeline-Role',
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
      description: 'IAM role for ComplianceShield CodePipeline',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodePipeline_FullAccess'),
      ],
    });

    // Grant pipeline role access to artifact bucket
    this.artifactBucket.grantReadWrite(this.pipelineRole);

    // IAM role for CodeBuild
    this.codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      roleName: 'ComplianceShield-CodeBuild-Role',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      description: 'IAM role for ComplianceShield CodeBuild projects',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeBuildAdminAccess'),
      ],
    });

    // Grant CodeBuild role access to artifact bucket
    this.artifactBucket.grantReadWrite(this.codeBuildRole);

    // Grant CodeBuild role permissions for CloudFormation operations
    this.codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:*',
          'lambda:*',
          'dynamodb:*',
          'apigateway:*',
          'events:*',
          'sqs:*',
          'sns:*',
          'logs:*',
          'iam:PassRole',
          'iam:GetRole',
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
        ],
        resources: ['*'],
      })
    );

    // Grant CodeBuild role permissions for Secrets Manager
    this.codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['*'],
      })
    );

    // IAM role for CodeDeploy
    this.codeDeployRole = new iam.Role(this, 'CodeDeployRole', {
      roleName: 'ComplianceShield-CodeDeploy-Role',
      assumedBy: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
      description: 'IAM role for ComplianceShield CodeDeploy',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeDeployFullAccess'),
      ],
    });

    // Output the artifact bucket name for reference
    new cdk.CfnOutput(this, 'ArtifactBucketName', {
      value: this.artifactBucket.bucketName,
      description: 'S3 bucket for pipeline artifacts',
      exportName: 'ComplianceShield-ArtifactBucket',
    });

    // Output IAM role ARNs
    new cdk.CfnOutput(this, 'PipelineRoleArn', {
      value: this.pipelineRole.roleArn,
      description: 'IAM role ARN for CodePipeline',
      exportName: 'ComplianceShield-PipelineRole',
    });

    new cdk.CfnOutput(this, 'CodeBuildRoleArn', {
      value: this.codeBuildRole.roleArn,
      description: 'IAM role ARN for CodeBuild',
      exportName: 'ComplianceShield-CodeBuildRole',
    });

    new cdk.CfnOutput(this, 'CodeDeployRoleArn', {
      value: this.codeDeployRole.roleArn,
      description: 'IAM role ARN for CodeDeploy',
      exportName: 'ComplianceShield-CodeDeployRole',
    });
  }
}
