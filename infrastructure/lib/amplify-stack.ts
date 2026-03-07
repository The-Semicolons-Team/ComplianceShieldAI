import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';

export interface AmplifyStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  repositoryOwner: string;
  repositoryName: string;
  githubTokenSecretName: string;
  apiUrl?: string;
}

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, props);

    const env = props.environment;
    const prefix = `compliance-shield-${env}`;

    // ─── Amplify App ───
    const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
      name: `${prefix}-frontend`,
      repository: `https://github.com/${props.repositoryOwner}/${props.repositoryName}`,
      accessToken: cdk.SecretValue.secretsManager(
        props.githubTokenSecretName
      ).unsafeUnwrap(),
      environmentVariables: [
        { name: 'NEXT_PUBLIC_API_URL', value: props.apiUrl || '' },
        { name: 'NEXT_PUBLIC_AWS_REGION', value: 'ap-south-1' },
        { name: '_LIVE_UPDATES', value: '[{"name":"Node.js version","pkg":"node","type":"nvm","version":"20"}]' },
        { name: 'AMPLIFY_MONOREPO_APP_ROOT', value: 'frontend' },
      ],
      platform: 'WEB_COMPUTE',
    });

    // ─── Branch (all environments deploy from main) ───
    const branchName = 'main';

    const branch = new amplify.CfnBranch(this, 'AmplifyBranch', {
      appId: amplifyApp.attrAppId,
      branchName: branchName,
      enableAutoBuild: true,
      enablePullRequestPreview: env === 'dev',
      stage: env === 'prod' ? 'PRODUCTION' : 'DEVELOPMENT',
      environmentVariables: [
        { name: 'ENVIRONMENT', value: env },
      ],
    });

    // ─── Outputs ───
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'Amplify App ID',
    });

    new cdk.CfnOutput(this, 'AmplifyUrl', {
      value: `https://${branchName}.${amplifyApp.attrDefaultDomain}`,
      description: 'Amplify App URL',
    });

    // ─── Custom Domain (complianceshieldai.in via Route 53) ───
    const customDomain = new amplify.CfnDomain(this, 'AmplifyDomain', {
      appId: amplifyApp.attrAppId,
      domainName: 'complianceshieldai.in',
      subDomainSettings: [
        { prefix: '', branchName: 'main' },
        { prefix: 'www', branchName: 'main' },
      ],
      enableAutoSubDomain: false,
    });
    customDomain.addDependency(branch);

    new cdk.CfnOutput(this, 'CustomDomainUrl', {
      value: 'https://complianceshieldai.in',
      description: 'Custom Domain URL',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'ComplianceShield');
    cdk.Tags.of(this).add('Environment', env);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
