import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

export interface AppStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
}

export class AppStack extends cdk.Stack {
  public readonly apiUrl: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const env = props.environment;
    const prefix = `compliance-shield-${env}`;

    // ─── KMS Key ───
    const encryptionKey = new kms.Key(this, 'EncryptionKey', {
      alias: `${prefix}-key`,
      description: `ComplianceShield ${env} encryption key`,
      enableKeyRotation: true,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ─── DynamoDB Tables ───
    const complianceTable = new dynamodb.Table(this, 'ComplianceMetadataTable', {
      tableName: `${prefix}-compliance-metadata`,
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'notice_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    complianceTable.addGlobalSecondaryIndex({
      indexName: 'risk-level-index',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'risk_level', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const userIntegrationsTable = new dynamodb.Table(this, 'UserIntegrationsTable', {
      tableName: `${prefix}-user-integrations`,
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const processedEmailsTable = new dynamodb.Table(this, 'ProcessedEmailsTable', {
      tableName: `${prefix}-processed-emails`,
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'email_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      timeToLiveAttribute: 'ttl',
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const notificationPrefsTable = new dynamodb.Table(this, 'NotificationPreferencesTable', {
      tableName: `${prefix}-notification-preferences`,
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ─── SQS Queues ───
    const emailDlq = new sqs.Queue(this, 'EmailProcessingDLQ', {
      queueName: `${prefix}-email-processing-dlq`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
    });

    const emailQueue = new sqs.Queue(this, 'EmailProcessingQueue', {
      queueName: `${prefix}-email-processing`,
      visibilityTimeout: cdk.Duration.minutes(6),
      retentionPeriod: cdk.Duration.days(4),
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
      deadLetterQueue: {
        queue: emailDlq,
        maxReceiveCount: 3,
      },
    });

    // ─── SNS Topics ───
    const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `${prefix}-notifications`,
      displayName: `ComplianceShield ${env} Notifications`,
      masterKey: encryptionKey,
    });

    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${prefix}-alerts`,
      displayName: `ComplianceShield ${env} Alerts`,
      masterKey: encryptionKey,
    });

    // ─── S3 Temp Bucket ───
    const tempBucket = new s3.Bucket(this, 'TempAttachmentBucket', {
      bucketName: `${prefix}-temp-attachments-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ expiration: cdk.Duration.days(1) }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ─── Common Lambda Props ───
    const commonLambdaProps = {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(1),
      memorySize: 512,
      environment: {
        ENVIRONMENT: env,
        LOG_LEVEL: env === 'prod' ? 'WARNING' : 'INFO',
        COMPLIANCE_METADATA_TABLE: complianceTable.tableName,
        USER_INTEGRATIONS_TABLE: userIntegrationsTable.tableName,
        PROCESSED_EMAILS_TABLE: processedEmailsTable.tableName,
        NOTIFICATION_PREFERENCES_TABLE: notificationPrefsTable.tableName,
        EMAIL_PROCESSING_QUEUE_URL: emailQueue.queueUrl,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
        TEMP_ATTACHMENT_BUCKET: tempBucket.bucketName,
        BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
      logRetention: logs.RetentionDays.THREE_MONTHS,
    };

    // ─── Lambda Functions ───

    // Email Retrieval
    const emailRetrievalFn = new lambda.Function(this, 'EmailRetrievalFunction', {
      ...commonLambdaProps,
      functionName: `${prefix}-email-retrieval`,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/email-retrieval')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      description: 'Retrieves government emails via OAuth and sends to SQS',
    });

    // Compliance Extraction
    const complianceExtractionFn = new lambda.Function(this, 'ComplianceExtractionFunction', {
      ...commonLambdaProps,
      functionName: `${prefix}-compliance-extraction`,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/compliance-extraction')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 3008,
      description: 'Extracts compliance info using Bedrock, Textract, Comprehend',
    });

    // Risk Assessment
    const riskAssessmentFn = new lambda.Function(this, 'RiskAssessmentFunction', {
      ...commonLambdaProps,
      functionName: `${prefix}-risk-assessment`,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/risk-assessment')),
      description: 'Calculates risk levels for compliance notices',
    });

    // Notification Handler
    const notificationHandlerFn = new lambda.Function(this, 'NotificationHandlerFunction', {
      ...commonLambdaProps,
      functionName: `${prefix}-notification-handler`,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/notification-handler')),
      description: 'Multi-channel notification delivery (Email, SMS, WhatsApp)',
    });

    // API Handler
    const apiHandlerFn = new lambda.Function(this, 'ApiHandlerFunction', {
      ...commonLambdaProps,
      functionName: `${prefix}-api-handler`,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/lambda/api-handler')),
      description: 'REST API handler for compliance data queries',
    });

    // ─── DynamoDB Permissions ───
    const allTables = [complianceTable, userIntegrationsTable, processedEmailsTable, notificationPrefsTable];
    const allFunctions = [emailRetrievalFn, complianceExtractionFn, riskAssessmentFn, notificationHandlerFn, apiHandlerFn];

    for (const fn of allFunctions) {
      for (const table of allTables) {
        table.grantReadWriteData(fn);
      }
    }

    // ─── SQS Permissions ───
    emailQueue.grantSendMessages(emailRetrievalFn);
    emailQueue.grantConsumeMessages(complianceExtractionFn);

    // ─── SNS Permissions ───
    notificationTopic.grantPublish(riskAssessmentFn);
    notificationTopic.grantPublish(notificationHandlerFn);

    // ─── S3 Permissions ───
    tempBucket.grantReadWrite(complianceExtractionFn);

    // ─── Bedrock Permissions ───
    complianceExtractionFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // ─── Textract & Comprehend Permissions ───
    complianceExtractionFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['textract:DetectDocumentText', 'textract:StartDocumentTextDetection', 'textract:GetDocumentTextDetection'],
      resources: ['*'],
    }));
    complianceExtractionFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['comprehend:DetectEntities', 'comprehend:DetectKeyPhrases'],
      resources: ['*'],
    }));

    // ─── SES & SNS (SMS) Permissions ───
    notificationHandlerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));
    notificationHandlerFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
    }));

    // ─── Secrets Manager Permissions ───
    for (const fn of [emailRetrievalFn, notificationHandlerFn]) {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue', 'secretsmanager:PutSecretValue'],
        resources: ['*'],
      }));
    }

    // ─── KMS Permissions ───
    encryptionKey.grantEncryptDecrypt(emailRetrievalFn);
    encryptionKey.grantEncryptDecrypt(complianceExtractionFn);
    encryptionKey.grantEncryptDecrypt(notificationHandlerFn);

    // ─── Event Sources ───

    // SQS triggers Compliance Extraction
    complianceExtractionFn.addEventSource(
      new lambda_event_sources.SqsEventSource(emailQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.minutes(1),
      })
    );

    // DynamoDB Stream triggers Risk Assessment (on new compliance metadata)
    riskAssessmentFn.addEventSource(
      new lambda_event_sources.DynamoEventSource(complianceTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 10,
        retryAttempts: 3,
      })
    );

    // SNS triggers Notification Handler
    notificationTopic.addSubscription(
      new sns_subscriptions.LambdaSubscription(notificationHandlerFn)
    );

    // ─── EventBridge Schedules ───

    // Email retrieval every 4 hours
    new events.Rule(this, 'EmailRetrievalSchedule', {
      ruleName: `${prefix}-email-retrieval-schedule`,
      schedule: events.Schedule.rate(cdk.Duration.hours(4)),
      targets: [new targets.LambdaFunction(emailRetrievalFn)],
      description: 'Trigger email retrieval every 4 hours',
    });

    // Daily reminder check at 9 AM IST (3:30 AM UTC)
    new events.Rule(this, 'DailyReminderSchedule', {
      ruleName: `${prefix}-daily-reminder-schedule`,
      schedule: events.Schedule.cron({ minute: '30', hour: '3' }),
      targets: [new targets.LambdaFunction(notificationHandlerFn)],
      description: 'Daily deadline reminder check at 9 AM IST',
    });

    // Daily risk re-assessment at 6 AM IST (12:30 AM UTC)
    new events.Rule(this, 'DailyRiskReassessment', {
      ruleName: `${prefix}-daily-risk-reassessment`,
      schedule: events.Schedule.cron({ minute: '30', hour: '0' }),
      targets: [new targets.LambdaFunction(riskAssessmentFn)],
      description: 'Daily risk re-assessment at 6 AM IST',
    });

    // ─── API Gateway ───
    const api = new apigateway.RestApi(this, 'ComplianceApi', {
      restApiName: `${prefix}-api`,
      description: `ComplianceShield ${env} REST API`,
      deployOptions: {
        stageName: env,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(apiHandlerFn);

    // API routes
    const health = api.root.addResource('health');
    health.addMethod('GET', lambdaIntegration);

    const notices = api.root.addResource('notices');
    notices.addMethod('GET', lambdaIntegration);

    const noticeById = notices.addResource('{noticeId}');
    noticeById.addMethod('GET', lambdaIntegration);

    const acknowledge = noticeById.addResource('acknowledge');
    acknowledge.addMethod('POST', lambdaIntegration);

    const deadlines = api.root.addResource('deadlines');
    deadlines.addMethod('GET', lambdaIntegration);

    const preferences = api.root.addResource('preferences');
    const notifPrefs = preferences.addResource('notifications');
    notifPrefs.addMethod('GET', lambdaIntegration);
    notifPrefs.addMethod('PUT', lambdaIntegration);

    const integrations = api.root.addResource('integrations');
    integrations.addMethod('GET', lambdaIntegration);
    integrations.addMethod('POST', lambdaIntegration);

    const dashboard = api.root.addResource('dashboard');
    const stats = dashboard.addResource('stats');
    stats.addMethod('GET', lambdaIntegration);

    // ─── CloudWatch Dashboard ───
    const dashboardWidget = new cloudwatch.Dashboard(this, 'AppDashboard', {
      dashboardName: `${prefix}-dashboard`,
    });

    dashboardWidget.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        left: allFunctions.map(fn => fn.metricErrors()),
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        left: allFunctions.map(fn => fn.metricDuration()),
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations',
        left: allFunctions.map(fn => fn.metricInvocations()),
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'SQS Messages',
        left: [
          emailQueue.metricApproximateNumberOfMessagesVisible(),
          emailQueue.metricNumberOfMessagesSent(),
          emailDlq.metricApproximateNumberOfMessagesVisible(),
        ],
        width: 12,
      }),
    );

    // ─── CloudWatch Alarms ───
    for (const fn of allFunctions) {
      new cloudwatch.Alarm(this, `${fn.node.id}ErrorAlarm`, {
        metric: fn.metricErrors(),
        threshold: 5,
        evaluationPeriods: 2,
        alarmDescription: `High error rate on ${fn.functionName}`,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      });
    }

    // DLQ alarm
    new cloudwatch.Alarm(this, 'DLQAlarm', {
      metric: emailDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Messages in email processing DLQ',
    });

    // ─── Outputs ───
    this.apiUrl = new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: `${prefix}-api-url`,
    });

    new cdk.CfnOutput(this, 'ComplianceTableName', {
      value: complianceTable.tableName,
      exportName: `${prefix}-compliance-table`,
    });

    new cdk.CfnOutput(this, 'EmailQueueUrl', {
      value: emailQueue.queueUrl,
      exportName: `${prefix}-email-queue-url`,
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      exportName: `${prefix}-notification-topic-arn`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'ComplianceShield');
    cdk.Tags.of(this).add('Environment', env);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
