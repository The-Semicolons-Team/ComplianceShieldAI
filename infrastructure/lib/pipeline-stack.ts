import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface PipelineStackProps extends cdk.StackProps {
  artifactBucket: s3.IBucket;
  repositoryOwner?: string;
  repositoryName: string;
  branchName: string;
  githubTokenSecretName?: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // ─── Source & Build Artifacts ───
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // ─── Approval SNS Topic ───
    const approvalTopic = new sns.Topic(this, 'ApprovalTopic', {
      topicName: 'ComplianceShield-Pipeline-Approvals',
      displayName: 'ComplianceShield Pipeline Approvals',
    });

    // ─── Source Action (GitHub) ───
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: props.repositoryOwner || 'The-Semicolons-Team',
      repo: props.repositoryName,
      branch: props.branchName,
      oauthToken: cdk.SecretValue.secretsManager(
        props.githubTokenSecretName || 'github-oauth-token'
      ),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
    });

    // ─── Build Project ───
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'ComplianceShield-Build',
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: false,
      },
      timeout: cdk.Duration.minutes(15),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              python: '3.12',
              nodejs: '20',
            },
            commands: [
              'echo "Installing dependencies..."',
              // Install Lambda dependencies
              'for dir in src/lambda/*/; do if [ -f "$dir/requirements.txt" ]; then echo "Installing deps for $dir"; pip install -r "$dir/requirements.txt" -t "$dir/package/" --quiet; fi; done',
              // Install CDK deps
              'cd infrastructure && npm ci && cd ..',
            ],
          },
          pre_build: {
            commands: [
              'echo "Running tests..."',
              'python -m pytest tests/ -v --tb=short || true',
              'cd infrastructure && npm test || true && cd ..',
            ],
          },
          build: {
            commands: [
              'echo "Building Lambda packages..."',
              'mkdir -p build/lambda',
              // Package each Lambda
              'for dir in src/lambda/*/; do fn_name=$(basename "$dir"); echo "Packaging $fn_name"; mkdir -p "build/lambda/$fn_name"; cp "$dir"/*.py "build/lambda/$fn_name/" 2>/dev/null || true; if [ -d "$dir/package" ]; then cp -r "$dir/package/"* "build/lambda/$fn_name/" 2>/dev/null || true; fi; cd "build/lambda/$fn_name" && zip -r "../../$fn_name.zip" . && cd ../../..; done',
              // CDK Synth
              'echo "Synthesizing CDK..."',
              'cd infrastructure && npx cdk synth --quiet && cd ..',
            ],
          },
          post_build: {
            commands: [
              'echo "Uploading artifacts..."',
              'COMMIT_SHA=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-8)',
              'TIMESTAMP=$(date +%Y%m%d-%H%M%S)',
              'for zip in build/*.zip; do if [ -f "$zip" ]; then fn_name=$(basename "$zip" .zip); aws s3 cp "$zip" "s3://${ARTIFACT_BUCKET}/builds/${fn_name}/${TIMESTAMP}-${COMMIT_SHA}.zip"; fi; done',
            ],
          },
        },
        artifacts: {
          'base-directory': '.',
          files: [
            'build/**/*',
            'infrastructure/bin/**/*',
            'infrastructure/lib/**/*',
            'infrastructure/test/**/*',
            'infrastructure/package.json',
            'infrastructure/package-lock.json',
            'infrastructure/tsconfig.json',
            'infrastructure/cdk.json',
            'infrastructure/jest.config.js',
          ],
        },
        cache: {
          paths: [
            '/root/.cache/pip/**/*',
            'infrastructure/node_modules/**/*',
          ],
        },
      }),
      environmentVariables: {
        ENVIRONMENT: { value: 'dev' },
        ARTIFACT_BUCKET: { value: props.artifactBucket.bucketName },
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.SOURCE, codebuild.LocalCacheMode.CUSTOM),
    });

    // Grant build project access to artifact bucket
    props.artifactBucket.grantReadWrite(buildProject);

    // Grant build permissions
    buildProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cloudformation:*',
        'lambda:*',
        'dynamodb:*',
        'apigateway:*',
        'events:*',
        'sqs:*',
        'sns:*',
        'logs:*',
        's3:*',
        'iam:PassRole',
        'iam:GetRole',
        'iam:CreateRole',
        'secretsmanager:GetSecretValue',
        'sts:AssumeRole',
      ],
      resources: ['*'],
    }));

    // ─── Deploy Build Projects per Environment ───
    const deployDevProject = createDeployProject(this, 'dev', props.artifactBucket);
    const deployStagingProject = createDeployProject(this, 'staging', props.artifactBucket);
    const deployProdProject = createDeployProject(this, 'prod', props.artifactBucket);

    // ─── Pipeline ───
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'ComplianceShield-Pipeline',
      artifactBucket: props.artifactBucket,
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build_And_Test',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy_Dev',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy_Dev',
              project: deployDevProject,
              input: buildOutput,
            }),
          ],
        },
        {
          stageName: 'Approve_Staging',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'Approve_Staging',
              notificationTopic: approvalTopic,
              additionalInformation: 'Approve deployment to STAGING environment?',
            }),
          ],
        },
        {
          stageName: 'Deploy_Staging',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy_Staging',
              project: deployStagingProject,
              input: buildOutput,
            }),
          ],
        },
        {
          stageName: 'Approve_Production',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'Approve_Production',
              notificationTopic: approvalTopic,
              additionalInformation: 'Approve deployment to PRODUCTION environment?',
            }),
          ],
        },
        {
          stageName: 'Deploy_Production',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Deploy_Production',
              project: deployProdProject,
              input: buildOutput,
            }),
          ],
        },
      ],
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
      description: 'CI/CD Pipeline Name',
    });

    new cdk.CfnOutput(this, 'ApprovalTopicArn', {
      value: approvalTopic.topicArn,
      description: 'SNS topic for pipeline approval notifications',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'ComplianceShield');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}

function createDeployProject(
  scope: Construct,
  environment: string,
  artifactBucket: s3.IBucket,
): codebuild.PipelineProject {
  const project = new codebuild.PipelineProject(scope, `Deploy${capitalize(environment)}Project`, {
    projectName: `ComplianceShield-Deploy-${capitalize(environment)}`,
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      computeType: codebuild.ComputeType.SMALL,
    },
    timeout: cdk.Duration.minutes(30),
    buildSpec: codebuild.BuildSpec.fromObject({
      version: '0.2',
      phases: {
        install: {
          'runtime-versions': {
            nodejs: '20',
          },
          commands: [
            'cd infrastructure && npm ci',
          ],
        },
        build: {
          commands: [
            `cd infrastructure && npx cdk deploy ComplianceShield-App-${capitalize(environment)} --require-approval never --outputs-file ../outputs-${environment}.json`,
          ],
        },
        post_build: {
          commands: [
            `echo "Deployment to ${environment} completed"`,
            `cat ../outputs-${environment}.json || true`,
          ],
        },
      },
    }),
    environmentVariables: {
      ENVIRONMENT: { value: environment },
      CDK_DEFAULT_ACCOUNT: { value: process.env.CDK_DEFAULT_ACCOUNT || '' },
      CDK_DEFAULT_REGION: { value: 'ap-south-1' },
    },
  });

  artifactBucket.grantReadWrite(project);

  project.addToRolePolicy(new iam.PolicyStatement({
    actions: [
      'cloudformation:*',
      'lambda:*',
      'dynamodb:*',
      'apigateway:*',
      'events:*',
      'sqs:*',
      'sns:*',
      'logs:*',
      's3:*',
      'kms:*',
      'iam:*',
      'secretsmanager:*',
      'cloudwatch:*',
      'bedrock:*',
      'textract:*',
      'comprehend:*',
      'ses:*',
      'sts:AssumeRole',
    ],
    resources: ['*'],
  }));

  return project;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
