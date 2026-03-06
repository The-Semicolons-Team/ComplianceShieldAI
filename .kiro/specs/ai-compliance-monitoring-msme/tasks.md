# Implementation Plan: AI Compliance Monitoring System for Indian MSMEs

## Overview

This implementation plan breaks down the AI Compliance Monitoring System into discrete coding tasks. The system is built on AWS serverless architecture using Node.js (Lambda functions for API/email/notifications) and Python (Lambda functions for AI/ML extraction and risk assessment). The implementation follows an incremental approach where each task builds on previous work, with property-based tests integrated throughout to validate correctness properties early.

## Tasks

- [x] 1. Set up project structure and infrastructure foundation
  - Create directory structure for Lambda functions (email-retrieval, compliance-extraction, risk-assessment, notification-handler)
  - Set up package.json for Node.js functions and requirements.txt for Python functions
  - Configure AWS CDK or Terraform infrastructure as code project
  - Define shared TypeScript interfaces and Python data models for compliance metadata
  - Set up testing frameworks (Jest, pytest, fast-check, Hypothesis)
  - Create .env.example files with required environment variables
  - _Requirements: 6.2, 8.1, 14.1_

- [ ] 2. Implement AWS infrastructure with CDK/Terraform
  - [ ] 2.1 Create DynamoDB tables with encryption and indexes
    - Define compliance_metadata table with partition key (user_id) and sort key (notice_id)
    - Create Global Secondary Indexes (DeadlineIndex, RiskLevelIndex, CategoryIndex)
    - Define user_integrations, processed_emails, notification_preferences tables
    - Enable point-in-time recovery and TTL configuration
    - Configure AWS KMS customer-managed keys for encryption
    - _Requirements: 6.1, 6.4, 6.7, 7.2, 15.1, 15.3_

  - [ ]* 2.2 Write property test for DynamoDB table configuration
    - **Property 24: UUID Generation Uniqueness**
    - **Property 25: TTL Configuration**
    - **Validates: Requirements 6.4, 6.7**

  - [ ] 2.3 Create IAM roles and policies with least privilege
    - Define Lambda execution roles for each function
    - Create policies for DynamoDB access (read/write per function)
    - Create policies for Secrets Manager, KMS, S3, SQS, SNS, SES access
    - Configure VPC endpoints for AWS service communication
    - _Requirements: 7.3, 7.7_

  - [ ] 2.4 Set up AWS Secrets Manager for OAuth tokens
    - Create secret structure for OAuth tokens with encryption
    - Configure automatic rotation Lambda function (45-day cycle)
    - _Requirements: 1.4, 7.2_


  - [ ] 2.5 Create SQS queues and dead letter queues
    - Create email-processing-queue with DLQ
    - Create notification-queue with DLQ
    - Configure visibility timeout and message retention
    - _Requirements: 8.6, 10.2_

  - [ ] 2.6 Set up EventBridge rules for scheduled triggers
    - Create rule for email retrieval (every 4 hours)
    - Create rule for deadline reminder checks (daily at 9 AM IST)
    - _Requirements: 2.2_

  - [ ] 2.7 Configure Amazon Cognito user pool
    - Create user pool with MFA enabled
    - Configure password policies and account recovery
    - Set up OAuth 2.0 app clients for API access
    - _Requirements: 7.8_

  - [ ] 2.8 Set up API Gateway with authentication
    - Create REST API with Cognito authorizer
    - Define API resources and methods (OAuth, compliance notices, deadlines, preferences, health)
    - Configure request validation and CORS
    - Implement rate limiting (1000 requests/hour per user)
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 2.9 Write property test for API rate limiting
    - **Property 40: API Rate Limiting**
    - **Validates: Requirements 13.3**

  - [ ] 2.10 Configure AWS WAF for API Gateway
    - Attach AWS Managed Rules for OWASP Top 10
    - Configure rate-based rules
    - _Requirements: 7.4_

  - [ ] 2.11 Set up CloudWatch Logs and X-Ray tracing
    - Create log groups for each Lambda function
    - Configure log retention (90 days)
    - Enable X-Ray tracing for distributed tracing
    - _Requirements: 2.7, 9.5, 14.1, 14.5_

- [ ] 3. Checkpoint - Verify infrastructure deployment
  - Ensure all infrastructure deploys successfully, ask the user if questions arise.

- [ ] 4. Implement OAuth integration and email retrieval service
  - [ ] 4.1 Create OAuth initiation endpoint (Node.js)
    - Implement /oauth/initiate endpoint in API Gateway Lambda
    - Generate state token and store in DynamoDB with expiration
    - Build authorization URLs for Gmail and Outlook
    - Return authorization URL to client
    - _Requirements: 1.1, 1.2_

  - [ ] 4.2 Create OAuth callback handler (Node.js)
    - Implement /oauth/callback endpoint
    - Validate state token against DynamoDB
    - Exchange authorization code for access/refresh tokens
    - Encrypt tokens using AWS KMS
    - Store encrypted tokens in Secrets Manager
    - Create user_integrations record in DynamoDB
    - _Requirements: 1.3, 1.4, 1.8_

  - [ ]* 4.3 Write property test for OAuth token encryption
    - **Property 1: OAuth Token Encryption**
    - **Validates: Requirements 1.3, 1.8**

  - [ ] 4.4 Implement email retrieval Lambda function (Node.js)
    - Create email-retrieval-handler function triggered by EventBridge
    - Retrieve OAuth tokens from Secrets Manager
    - Implement Gmail API client for email fetching
    - Implement Microsoft Graph API client for Outlook
    - Filter emails by government domains (.gov.in, .nic.in)
    - Query processed_emails table to get last processed email ID
    - Fetch only unprocessed emails since last run
    - Batch emails into groups of 100
    - Send batches to SQS queue
    - Update last_sync_timestamp in user_integrations table
    - _Requirements: 2.1, 2.3, 2.4, 2.8, 9.2_

  - [ ]* 4.5 Write property test for government domain filtering
    - **Property 3: Government Domain Email Filtering**
    - **Validates: Requirements 2.1, 9.2**

  - [ ]* 4.6 Write property test for email deduplication
    - **Property 4: Email Deduplication**
    - **Validates: Requirements 2.3, 2.5**

  - [ ]* 4.7 Write property test for batch size limits
    - **Property 5: Email Batch Size Limit**
    - **Validates: Requirements 2.4**

  - [ ]* 4.8 Write property test for email field extraction
    - **Property 7: Email Field Extraction Completeness**
    - **Validates: Requirements 2.8**

  - [ ] 4.9 Implement OAuth token refresh logic (Node.js)
    - Create token refresh function called before API requests
    - Check token expiration time
    - Use refresh token to get new access token
    - Update Secrets Manager with new tokens
    - Handle refresh failures with user notification
    - _Requirements: 1.5, 1.6_

  - [ ]* 4.10 Write property test for OAuth auto-refresh
    - **Property 2: OAuth Token Auto-Refresh**
    - **Validates: Requirements 1.5, 1.6**

  - [ ] 4.11 Implement error handling and retry logic
    - Add exponential backoff for API rate limiting
    - Implement retry logic (3 attempts) for network errors
    - Send failed operations to DLQ
    - Log all errors to CloudWatch with structured format
    - _Requirements: 2.6, 10.1, 10.2_

  - [ ]* 4.12 Write property test for exponential backoff retry
    - **Property 6: Exponential Backoff Retry**
    - **Validates: Requirements 2.6, 10.1, 10.2**

- [ ] 5. Checkpoint - Test email retrieval end-to-end
  - Ensure OAuth flow works, emails are retrieved and batched correctly, ask the user if questions arise.


- [ ] 6. Implement compliance extraction engine with AI/ML
  - [ ] 6.1 Create compliance extraction Lambda function (Python)
    - Set up Lambda function triggered by SQS (batch size: 10)
    - Implement email message parsing from SQS
    - Download attachments to /tmp directory
    - Integrate AWS Textract for PDF/image text extraction
    - Upload attachments to S3 with 24-hour lifecycle policy
    - Implement async Textract processing with polling
    - Combine email body and attachment text
    - _Requirements: 3.7, 8.8_

  - [ ]* 6.2 Write property test for attachment text extraction
    - **Property 11: Attachment Text Extraction**
    - **Validates: Requirements 3.7**

  - [ ]* 6.3 Write property test for temporary storage cleanup
    - **Property 29: Temporary Attachment Storage Cleanup**
    - **Validates: Requirements 8.8**

  - [ ] 6.2 Integrate AWS Bedrock for compliance analysis (Python)
    - Configure Bedrock client for Claude 3 Sonnet model
    - Create structured prompt for Indian government compliance notices
    - Define JSON schema for extraction output
    - Send combined text to Bedrock with prompt
    - Parse and validate Bedrock JSON response
    - Handle invalid JSON responses with error logging
    - _Requirements: 3.1, 3.2_

  - [ ] 6.3 Integrate AWS Comprehend for entity extraction (Python)
    - Call DetectEntities API for organization, date, location extraction
    - Call DetectKeyPhrases API for additional context
    - Merge Comprehend results with Bedrock output
    - Enhance deadline detection using Comprehend dates
    - _Requirements: 4.1_

  - [ ] 6.4 Implement compliance notice classification (Python)
    - Extract issuing authority, subject matter, reference numbers
    - Classify compliance type and category (Tax, Labor, Environmental, Corporate, Trade, Other)
    - Extract required actions and applicable regulations
    - Extract penalty information (amount, currency, description)
    - Identify and classify all dates (issue, effective, deadline)
    - Normalize dates to ISO 8601 format
    - Handle multiple deadlines separately
    - Flag notices without explicit deadlines for manual review
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.7_

  - [ ]* 6.5 Write property test for structured extraction
    - **Property 8: Compliance Notice Structured Extraction**
    - **Validates: Requirements 3.3, 3.4, 6.2**

  - [ ]* 6.6 Write property test for penalty extraction
    - **Property 9: Penalty Information Extraction**
    - **Validates: Requirements 3.5**

  - [ ]* 6.7 Write property test for category classification
    - **Property 10: Compliance Category Classification**
    - **Validates: Requirements 3.6**

  - [ ]* 6.8 Write property test for date extraction and classification
    - **Property 13: Date Extraction and Classification**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 6.9 Write property test for multiple deadline handling
    - **Property 14: Multiple Deadline Handling**
    - **Validates: Requirements 4.3**

  - [ ]* 6.10 Write property test for date normalization
    - **Property 15: Date Format Normalization**
    - **Validates: Requirements 4.4**

  - [ ]* 6.11 Write property test for missing deadline flagging
    - **Property 18: Missing Deadline Flagging**
    - **Validates: Requirements 4.7**

  - [ ] 6.12 Store structured metadata in DynamoDB (Python)
    - Generate UUID v4 for notice_id
    - Create compliance_metadata record with all extracted fields
    - Calculate and set TTL (7 years from creation)
    - Write to DynamoDB with encryption
    - Create processed_emails record to prevent reprocessing
    - Delete temporary files from /tmp and S3
    - Delete SQS message on success
    - _Requirements: 3.8, 6.2, 6.3, 6.4, 6.7_

  - [ ]* 6.13 Write property test for data minimization
    - **Property 12: Data Minimization**
    - **Validates: Requirements 3.8, 6.3**

  - [ ] 6.14 Implement extraction error handling (Python)
    - Handle Bedrock throttling with exponential backoff
    - Handle Textract timeouts by skipping attachments
    - Handle invalid JSON with error logging and manual review flag
    - Handle Comprehend errors gracefully
    - Implement circuit breaker for external services
    - Send failed extractions to DLQ after retries
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 6.15 Implement extraction performance optimization (Python)
    - Optimize Lambda memory allocation (3GB)
    - Implement parallel processing for batch items
    - Add performance logging for extraction duration
    - Ensure average extraction time under 30 seconds
    - _Requirements: 8.3_

  - [ ]* 6.16 Write property test for extraction performance
    - **Property 28: Extraction Performance**
    - **Validates: Requirements 8.3**

- [ ] 7. Checkpoint - Test compliance extraction pipeline
  - Ensure emails are extracted correctly, metadata stored in DynamoDB, ask the user if questions arise.


- [ ] 8. Implement risk assessment service
  - [ ] 8.1 Create risk assessment Lambda function (Python)
    - Set up Lambda function triggered after extraction completes
    - Retrieve compliance notice from DynamoDB
    - Query historical compliance data for user
    - Calculate days remaining until deadline
    - _Requirements: 4.5, 5.1_

  - [ ]* 8.2 Write property test for days remaining calculation
    - **Property 16: Days Remaining Calculation**
    - **Validates: Requirements 4.5**

  - [ ] 8.3 Implement risk score calculation algorithm (Python)
    - Calculate deadline proximity score (≤7 days: +40, ≤14 days: +30, ≤30 days: +20, else: +10)
    - Calculate penalty severity score (≥₹100k: +30, ≥₹50k: +20, ≥₹10k: +10, else: +5)
    - Apply category weight multiplier (Tax: 1.2, Corporate: 1.15, Labor: 1.1, Environmental/Trade: 1.0)
    - Add historical adjustment (+15 for missed deadlines, +10 for repeat violations)
    - Calculate total risk score
    - Determine risk level (Critical: ≥70, High: ≥50, Medium: ≥30, Low: <30)
    - Handle cases without penalty information
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.4 Write property test for risk level calculation
    - **Property 20: Risk Level Calculation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ]* 8.5 Write property test for risk assessment without penalty
    - **Property 21: Risk Assessment Without Penalty**
    - **Validates: Requirements 5.6**

  - [ ]* 8.6 Write property test for historical risk adjustment
    - **Property 22: Historical Risk Adjustment**
    - **Validates: Requirements 5.7**

  - [ ] 8.7 Update metadata and trigger notifications (Python)
    - Update compliance_metadata with risk_level and risk_score
    - Store risk_factors array with calculation details
    - Trigger immediate notification for Critical risk level
    - Schedule reminder notifications based on risk level
    - _Requirements: 5.8, 12.5_

  - [ ]* 8.8 Write property test for dynamic risk updates
    - **Property 23: Dynamic Risk Updates**
    - **Validates: Requirements 5.8**

  - [ ] 8.9 Implement scheduled risk re-assessment (Python)
    - Create EventBridge rule for daily risk re-assessment
    - Query all active compliance notices
    - Recalculate risk scores as deadlines approach
    - Update risk levels and trigger notifications on changes
    - Mark expired deadlines
    - _Requirements: 4.8, 5.8_

  - [ ]* 8.10 Write property test for deadline expiration marking
    - **Property 19: Deadline Expiration Marking**
    - **Validates: Requirements 4.8**

- [ ] 9. Implement notification service with multi-channel support
  - [ ] 9.1 Create notification handler Lambda function (Node.js)
    - Set up Lambda function with multiple trigger sources (direct invocation, EventBridge, DynamoDB Stream)
    - Query DynamoDB for notices requiring notifications
    - Retrieve user notification preferences
    - Check quiet hours configuration
    - Implement notification batching logic (Medium: 5/day, Low: 10/week)
    - _Requirements: 12.6, 12.7_

  - [ ]* 9.2 Write property test for notification preferences respect
    - **Property 36: Notification Preferences Respect**
    - **Validates: Requirements 12.6**

  - [ ]* 9.3 Write property test for non-critical batching
    - **Property 37: Non-Critical Notification Batching**
    - **Validates: Requirements 12.7**

  - [ ] 9.2 Implement email notification via SES (Node.js)
    - Create HTML email template with compliance details
    - Format notification content (type, deadline, risk, actions, penalties, reference)
    - Send email via Amazon SES
    - Handle SES bounces and complaints
    - Log delivery status
    - _Requirements: 12.2, 12.4_

  - [ ]* 9.4 Write property test for notification content completeness
    - **Property 34: Notification Content Completeness**
    - **Validates: Requirements 12.4**

  - [ ] 9.3 Implement SMS notification via SNS (Node.js)
    - Create concise SMS template (risk + type + deadline + authority + ref)
    - Send SMS via Amazon SNS
    - Handle delivery failures
    - Log delivery status
    - _Requirements: 12.2_

  - [ ] 9.4 Integrate WhatsApp Business API (Node.js)
    - Store WhatsApp API credentials in Secrets Manager
    - Implement phone number verification endpoint
    - Create WhatsApp message templates with interactive buttons
    - Send WhatsApp notifications with rich formatting
    - Implement webhook handler for delivery status and user responses
    - Handle WhatsApp rate limiting (80 msg/sec)
    - Respect 24-hour messaging window policy
    - _Requirements: 12.2, 12.9_

  - [ ]* 9.5 Write property test for WhatsApp rich notification format
    - **Property 34a: WhatsApp Rich Notification Format**
    - **Validates: Requirements 12.9**

  - [ ] 9.5 Implement notification fallback chain (Node.js)
    - Attempt WhatsApp delivery first (if enabled)
    - Retry WhatsApp 3 times with exponential backoff
    - Fall back to SMS on WhatsApp failure
    - Fall back to email on SMS failure
    - Log all delivery attempts and outcomes
    - _Requirements: 12.8, 12.10_

  - [ ]* 9.6 Write property test for WhatsApp delivery fallback
    - **Property 34b: WhatsApp Delivery Fallback**
    - **Validates: Requirements 12.10**

  - [ ]* 9.7 Write property test for notification delivery retry
    - **Property 38: Notification Delivery Retry**
    - **Validates: Requirements 12.8**


  - [ ] 9.6 Implement Critical notice immediate notification (Node.js)
    - Override quiet hours for Critical risk level
    - Send to all enabled channels immediately
    - Bypass batching logic
    - _Requirements: 12.5_

  - [ ]* 9.8 Write property test for critical notice immediate notification
    - **Property 35: Critical Notice Immediate Notification**
    - **Validates: Requirements 12.5**

  - [ ] 9.7 Implement new notice notification timing (Node.js)
    - Trigger notification within 1 hour of extraction
    - Track notification_sent timestamp
    - _Requirements: 12.1_

  - [ ]* 9.9 Write property test for new notice notification timing
    - **Property 33: New Notice Notification Timing**
    - **Validates: Requirements 12.1**

  - [ ] 9.8 Implement reminder notification scheduling (Node.js)
    - Create EventBridge rule for daily reminder check (9 AM IST)
    - Query deadlines approaching reminder thresholds
    - Send reminders based on risk level schedule
    - Update last_reminder_sent timestamp
    - _Requirements: 4.6_

  - [ ]* 9.10 Write property test for reminder notification scheduling
    - **Property 17: Reminder Notification Scheduling**
    - **Validates: Requirements 4.6**

- [ ] 10. Checkpoint - Test notification delivery across all channels
  - Ensure notifications are sent correctly via email, SMS, and WhatsApp with proper fallback, ask the user if questions arise.

- [ ] 11. Implement REST API endpoints
  - [ ] 11.1 Create API Lambda handler for compliance queries (Node.js)
    - Implement GET /compliance/notices endpoint with pagination
    - Implement GET /compliance/notices/:id endpoint
    - Implement POST /compliance/notices/:id/acknowledge endpoint
    - Support query filters (date range, category, risk level)
    - Validate authentication using Cognito JWT
    - Enforce rate limiting (1000 req/hour per user)
    - Return JSON responses with proper HTTP status codes
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [ ]* 11.2 Write property test for API authentication enforcement
    - **Property 39: API Authentication Enforcement**
    - **Validates: Requirements 13.2**

  - [ ]* 11.3 Write property test for API query filtering
    - **Property 41: API Query Filtering**
    - **Validates: Requirements 13.4**

  - [ ]* 11.4 Write property test for API response format
    - **Property 42: API Response Format**
    - **Validates: Requirements 13.5**

  - [ ] 11.2 Implement deadline query endpoints (Node.js)
    - Implement GET /deadlines endpoint with date range filter
    - Query DeadlineIndex GSI for efficient retrieval
    - Support sorting by deadline date
    - Return upcoming deadlines with compliance details
    - _Requirements: 13.4_

  - [ ]* 11.5 Write property test for metadata query filtering
    - **Property 26: Metadata Query Filtering**
    - **Validates: Requirements 6.8**

  - [ ] 11.3 Implement notification preferences endpoints (Node.js)
    - Implement GET /preferences endpoint
    - Implement PUT /preferences endpoint
    - Validate phone number format for SMS/WhatsApp
    - Update notification_preferences table
    - _Requirements: 12.6_

  - [ ] 11.4 Implement WhatsApp verification endpoints (Node.js)
    - Implement POST /whatsapp/verify endpoint (send OTP)
    - Implement POST /whatsapp/confirm endpoint (verify OTP)
    - Update whatsapp_verified flag in preferences
    - _Requirements: 12.9_

  - [ ] 11.5 Implement webhook endpoint for integrations (Node.js)
    - Implement POST /webhooks endpoint for registering webhooks
    - Implement webhook delivery logic with retry
    - Store webhook URLs in DynamoDB
    - _Requirements: 13.7_

  - [ ]* 11.6 Write property test for webhook delivery
    - **Property 43: Webhook Delivery**
    - **Validates: Requirements 13.7**

  - [ ] 11.6 Implement health check endpoint (Node.js)
    - Implement GET /health endpoint
    - Check DynamoDB connectivity
    - Check Secrets Manager connectivity
    - Return service status
    - _Requirements: 10.6_

  - [ ] 11.7 Implement API error handling (Node.js)
    - Return descriptive error messages with error codes
    - Map exceptions to appropriate HTTP status codes
    - Log all API errors to CloudWatch
    - _Requirements: 13.8_

  - [ ]* 11.8 Write property test for API error messages
    - **Property 44: API Error Messages**
    - **Validates: Requirements 13.8**

- [ ] 12. Implement data compliance and user data management
  - [ ] 12.1 Create data export Lambda function (Python)
    - Implement endpoint for user data export request
    - Query all user data from all tables
    - Format data as JSON
    - Return complete compliance metadata
    - _Requirements: 11.4_

  - [ ]* 12.2 Write property test for data export completeness
    - **Property 30: Data Export Completeness**
    - **Validates: Requirements 11.4**

  - [ ] 12.2 Create data deletion Lambda function (Python)
    - Implement endpoint for user data deletion request
    - Delete records from compliance_metadata table
    - Delete records from user_integrations table
    - Delete records from processed_emails table
    - Delete records from notification_preferences table
    - Delete OAuth tokens from Secrets Manager
    - Complete deletion within 30 days
    - _Requirements: 11.5_

  - [ ]* 12.3 Write property test for data deletion completeness
    - **Property 31: Data Deletion Completeness**
    - **Validates: Requirements 11.5**

  - [ ] 12.3 Implement data residency controls (Infrastructure)
    - Verify all resources deployed in ap-south-1 or ap-south-2
    - Configure S3 bucket policies to prevent cross-region replication
    - Set DynamoDB table region constraints
    - _Requirements: 11.1, 11.2_

  - [ ] 12.4 Implement consent management (Node.js)
    - Create consent collection endpoint
    - Store consent records with timestamp
    - Validate consent before data processing
    - _Requirements: 11.3_

  - [ ]* 12.5 Write property test for data collection minimization
    - **Property 32: Data Collection Minimization**
    - **Validates: Requirements 11.8**


- [ ] 13. Implement security hardening
  - [ ] 13.1 Implement log sanitization (Node.js and Python)
    - Create utility function to redact sensitive data
    - Redact email addresses, OAuth tokens, personal identifiers
    - Apply to all CloudWatch log statements
    - _Requirements: 7.5_

  - [ ]* 13.2 Write property test for log sanitization
    - **Property 27: Log Sanitization**
    - **Validates: Requirements 7.5**

  - [ ] 13.2 Enable CloudTrail audit logging (Infrastructure)
    - Create CloudTrail trail for all API calls
    - Configure S3 bucket for trail logs with encryption
    - Enable log file validation
    - Set up CloudWatch Logs integration
    - _Requirements: 7.6, 11.6_

  - [ ] 13.3 Implement TLS 1.3 enforcement (Infrastructure)
    - Configure API Gateway to require TLS 1.3
    - Configure CloudFront distribution (if used) for TLS 1.3
    - _Requirements: 7.1_

  - [ ] 13.4 Review and minimize IAM permissions (Infrastructure)
    - Audit all IAM roles and policies
    - Remove unnecessary permissions
    - Implement resource-level permissions where possible
    - _Requirements: 7.3_

  - [ ] 13.5 Configure VPC endpoints (Infrastructure)
    - Create VPC endpoints for DynamoDB, S3, Secrets Manager, SQS, SNS
    - Update Lambda functions to use VPC endpoints
    - Remove public internet access
    - _Requirements: 7.7_

- [ ] 14. Implement monitoring, logging, and observability
  - [ ] 14.1 Implement structured logging (Node.js and Python)
    - Create logging utility with JSON format
    - Include required fields (timestamp, level, service, operation, user_id, trace_id, message)
    - Apply to all Lambda functions
    - _Requirements: 14.1_

  - [ ]* 14.2 Write property test for structured logging
    - **Property 45: Structured Logging**
    - **Validates: Requirements 14.1**

  - [ ] 14.2 Create CloudWatch dashboards (Infrastructure)
    - Create dashboard for email processing metrics
    - Create dashboard for extraction metrics
    - Create dashboard for notification metrics
    - Create dashboard for API metrics
    - Display key metrics (processing rate, error rate, latency, costs)
    - _Requirements: 14.2_

  - [ ] 14.3 Configure CloudWatch alarms (Infrastructure)
    - Create alarm for Lambda error rate >5%
    - Create alarm for DynamoDB throttling
    - Create alarm for API latency >2 seconds
    - Create alarm for SQS DLQ message count >10
    - Create alarm for extraction duration >30 seconds
    - Create alarm for monthly cost threshold
    - Configure SNS topic for alarm notifications
    - _Requirements: 10.6, 14.3, 14.8_

  - [ ]* 14.4 Write property test for anomaly detection alerting
    - **Property 46: Anomaly Detection Alerting**
    - **Validates: Requirements 14.3**

  - [ ]* 14.5 Write property test for automated health degradation alerts
    - **Property 48: Automated Health Degradation Alerts**
    - **Validates: Requirements 14.8**

  - [ ] 14.4 Implement custom metrics publishing (Node.js and Python)
    - Publish emails_processed metric
    - Publish compliance_notices_extracted metric
    - Publish api_requests metric
    - Publish notification_delivery_success/failure metrics
    - Publish extraction_duration metric
    - _Requirements: 14.4_

  - [ ]* 14.6 Write property test for custom metrics tracking
    - **Property 47: Custom Metrics Tracking**
    - **Validates: Requirements 14.4**

  - [ ] 14.5 Enable X-Ray distributed tracing (Infrastructure)
    - Enable X-Ray for all Lambda functions
    - Configure X-Ray sampling rules
    - Create X-Ray service map
    - _Requirements: 14.5_

  - [ ] 14.6 Implement performance monitoring (Node.js and Python)
    - Track Lambda duration, memory usage, cold starts
    - Track DynamoDB consumed capacity
    - Track API response times
    - Log performance metrics to CloudWatch
    - _Requirements: 14.6, 14.7_

- [ ] 15. Implement backup and disaster recovery
  - [ ] 15.1 Configure DynamoDB backups (Infrastructure)
    - Enable point-in-time recovery (35-day retention)
    - Create daily backup schedule to S3
    - Configure cross-region replication to ap-south-2
    - Encrypt backups with KMS
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ] 15.2 Create disaster recovery runbooks (Documentation)
    - Document backup restoration procedure
    - Document cross-region failover procedure
    - Document RTO/RPO validation steps
    - _Requirements: 15.4_

  - [ ] 15.3 Implement backup validation Lambda (Python)
    - Create function to validate backup integrity
    - Check record counts against source
    - Validate schema consistency
    - Run checksums on sample data
    - _Requirements: 15.6_

  - [ ]* 15.4 Write property test for backup data integrity validation
    - **Property 49: Backup Data Integrity Validation**
    - **Validates: Requirements 15.6**

  - [ ] 15.4 Version control infrastructure code (Infrastructure)
    - Commit all CDK/Terraform code to Git repository
    - Tag releases with version numbers
    - Document infrastructure changes
    - _Requirements: 15.7_

- [ ] 16. Checkpoint - Verify monitoring and backup systems
  - Ensure all monitoring is working, alarms are configured, backups are running, ask the user if questions arise.


- [ ] 17. Implement cost optimization features
  - [ ] 17.1 Configure Lambda for ARM64 Graviton processors (Infrastructure)
    - Update all Lambda functions to use ARM64 architecture
    - Test performance and compatibility
    - _Requirements: 9.1_

  - [ ] 17.2 Implement DynamoDB capacity optimization (Infrastructure)
    - Configure on-demand capacity mode
    - Set up DynamoDB Infrequent Access class for historical data
    - Implement automatic class transition based on access patterns
    - _Requirements: 8.4, 9.3_

  - [ ] 17.3 Configure S3 Intelligent-Tiering (Infrastructure)
    - Enable S3 Intelligent-Tiering for temporary storage bucket
    - Configure lifecycle policies for automatic deletion (24 hours)
    - _Requirements: 9.4_

  - [ ] 17.4 Optimize email retrieval frequency (Node.js)
    - Analyze historical compliance notice patterns
    - Adjust sync_frequency_hours based on patterns
    - Implement adaptive scheduling
    - _Requirements: 9.7_

  - [ ] 17.5 Configure CloudWatch Logs retention (Infrastructure)
    - Set log retention to 90 days for all log groups
    - _Requirements: 9.5_

  - [ ] 17.6 Implement cost monitoring and alerting (Infrastructure)
    - Create CloudWatch alarm for monthly cost threshold per user
    - Track costs by service (Lambda, DynamoDB, Bedrock, etc.)
    - Send cost alerts via SNS
    - _Requirements: 9.8_

- [ ] 18. Write integration tests
  - [ ] 18.1 Set up integration test environment
    - Configure LocalStack for local AWS service emulation
    - Set up test DynamoDB tables
    - Set up test SQS queues and SNS topics
    - Create test OAuth tokens and secrets
    - _Requirements: All_

  - [ ] 18.2 Write OAuth flow integration test
    - Test complete OAuth initiation and callback flow
    - Verify token encryption and storage
    - Verify user_integrations record creation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.8_

  - [ ] 18.3 Write email-to-notification integration test
    - Test complete flow from email retrieval to notification delivery
    - Mock email provider API
    - Mock Bedrock, Textract, Comprehend
    - Verify metadata storage
    - Verify risk assessment
    - Verify notification sent
    - _Requirements: 2.1, 3.1, 5.1, 12.1_

  - [ ] 18.4 Write API query integration test
    - Test API authentication with Cognito
    - Test query with filters
    - Verify DynamoDB query execution
    - Verify JSON response format
    - _Requirements: 13.2, 13.4, 13.5_

  - [ ] 18.5 Write deadline reminder integration test
    - Test EventBridge trigger
    - Test deadline query
    - Test notification scheduling
    - Verify reminders sent at correct intervals
    - _Requirements: 4.6, 12.1_

  - [ ] 18.6 Write error recovery integration test
    - Test failed extraction sent to DLQ
    - Test manual reprocessing from DLQ
    - Verify successful processing after retry
    - _Requirements: 10.1, 10.2_

  - [ ] 18.7 Write data export integration test
    - Test complete user data export
    - Verify all tables queried
    - Verify JSON format
    - _Requirements: 11.4_

  - [ ] 18.8 Write data deletion integration test
    - Test complete user data deletion
    - Verify all records deleted from all tables
    - Verify OAuth tokens deleted from Secrets Manager
    - _Requirements: 11.5_

- [ ] 19. Write unit tests for all Lambda functions
  - [ ]* 19.1 Write unit tests for email-retrieval-handler
    - Test OAuth token retrieval from Secrets Manager
    - Test email provider API calls (mocked)
    - Test government domain filtering
    - Test batch creation logic
    - Test SQS message sending
    - Test error handling and retries
    - _Requirements: 2.1, 2.3, 2.4, 2.8_

  - [ ]* 19.2 Write unit tests for compliance-extraction-handler
    - Test email parsing
    - Test Textract integration (mocked)
    - Test Bedrock integration (mocked)
    - Test Comprehend integration (mocked)
    - Test compliance classification logic
    - Test date extraction and normalization
    - Test DynamoDB write operations
    - Test error handling
    - _Requirements: 3.1, 3.3, 3.4, 4.1, 4.4_

  - [ ]* 19.3 Write unit tests for risk-assessment-handler
    - Test risk score calculation with various inputs
    - Test risk level determination
    - Test historical data queries
    - Test metadata updates
    - Test notification triggering
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 19.4 Write unit tests for notification-handler
    - Test notification preference retrieval
    - Test quiet hours logic
    - Test batching logic
    - Test email formatting and sending (mocked)
    - Test SMS sending (mocked)
    - Test WhatsApp sending (mocked)
    - Test fallback chain
    - Test delivery retry logic
    - _Requirements: 12.2, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [ ]* 19.5 Write unit tests for API Lambda handlers
    - Test authentication validation
    - Test rate limiting
    - Test query parameter parsing
    - Test DynamoDB queries
    - Test response formatting
    - Test error handling
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [ ]* 19.6 Write unit tests for data export/deletion functions
    - Test data export query logic
    - Test JSON formatting
    - Test deletion logic for all tables
    - Test Secrets Manager deletion
    - _Requirements: 11.4, 11.5_


- [ ] 20. Perform load and performance testing
  - [ ]* 20.1 Set up load testing environment
    - Install Apache JMeter or Artillery
    - Create test scripts for API endpoints
    - Configure test data generators
    - _Requirements: 8.1, 8.2_

  - [ ]* 20.2 Run peak email volume load test
    - Simulate 10,000 emails/hour for 2 hours
    - Monitor Lambda concurrency and throttling
    - Monitor DynamoDB capacity consumption
    - Verify all emails processed within 1 hour
    - _Requirements: 8.1, 8.2_

  - [ ]* 20.3 Run concurrent API request load test
    - Simulate 100 users making 10 requests/second
    - Monitor API Gateway throttling
    - Monitor Lambda performance
    - Verify response times under 2 seconds at 95th percentile
    - _Requirements: 8.5_

  - [ ]* 20.4 Run deadline reminder burst test
    - Simulate 1,000 notifications sent simultaneously
    - Monitor notification delivery times
    - Verify all notifications delivered within SLA
    - _Requirements: 12.1_

  - [ ]* 20.5 Run large attachment processing test
    - Simulate 100 emails with 5MB PDF attachments
    - Monitor Textract performance
    - Monitor Lambda memory usage
    - Verify extraction completes within 30 seconds average
    - _Requirements: 8.3, 8.8_

  - [ ]* 20.6 Analyze load test results and optimize
    - Review CloudWatch metrics and logs
    - Identify bottlenecks
    - Adjust Lambda memory/timeout configurations
    - Adjust DynamoDB capacity if needed
    - Re-run tests to verify improvements
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 21. Perform security testing
  - [ ]* 21.1 Run authentication bypass tests
    - Attempt API access without JWT tokens
    - Attempt API access with expired tokens
    - Attempt API access with invalid tokens
    - Verify all attempts return 401 Unauthorized
    - _Requirements: 13.2_

  - [ ]* 21.2 Run rate limit enforcement tests
    - Exceed 1000 requests/hour per user
    - Verify 429 Too Many Requests response
    - Verify Retry-After header present
    - _Requirements: 13.3_

  - [ ]* 21.3 Run input validation tests
    - Test API endpoints with malformed JSON
    - Test API endpoints with SQL injection attempts
    - Test API endpoints with XSS payloads
    - Verify proper error handling and sanitization
    - _Requirements: 13.8_

  - [ ]* 21.4 Run encryption verification tests
    - Verify DynamoDB encryption at rest with KMS
    - Verify S3 encryption at rest
    - Verify Secrets Manager encryption
    - Verify TLS 1.3 for all API calls
    - _Requirements: 7.1, 7.2_

  - [ ]* 21.5 Run log sanitization tests
    - Review CloudWatch logs for sensitive data
    - Verify email addresses are redacted
    - Verify OAuth tokens are redacted
    - Verify personal identifiers are redacted
    - _Requirements: 7.5_

  - [ ]* 21.6 Run IAM permission tests
    - Verify Lambda functions have least privilege access
    - Attempt unauthorized cross-function access
    - Verify resource-level permissions enforced
    - _Requirements: 7.3_

  - [ ]* 21.7 Run OWASP ZAP security scan
    - Configure ZAP to scan API Gateway endpoints
    - Run automated vulnerability scan
    - Review and remediate findings
    - _Requirements: 7.4_

- [ ] 22. Perform compliance testing
  - [ ]* 22.1 Verify data residency compliance
    - Audit all AWS resources
    - Verify all resources in ap-south-1 or ap-south-2
    - Verify no cross-border data transfer
    - _Requirements: 11.1, 11.2_

  - [ ]* 22.2 Verify data retention compliance
    - Check TTL configuration on compliance_metadata table
    - Verify TTL set to 7 years (220,752,000 seconds)
    - Verify processed_emails TTL set to 90 days
    - _Requirements: 6.7, 15.8_

  - [ ]* 22.3 Verify audit logging compliance
    - Check CloudTrail configuration
    - Verify all API calls logged
    - Verify log retention set to minimum 3 years
    - _Requirements: 11.6_

  - [ ]* 22.4 Test data export functionality
    - Request user data export
    - Verify all data returned in JSON format
    - Verify completeness of exported data
    - _Requirements: 11.4_

  - [ ]* 22.5 Test data deletion functionality
    - Request user data deletion
    - Verify all records deleted from all tables
    - Verify OAuth tokens deleted
    - Verify deletion completes within 30 days
    - _Requirements: 11.5_

  - [ ]* 22.6 Verify consent management
    - Test consent collection flow
    - Verify consent stored with timestamp
    - Verify processing blocked without consent
    - _Requirements: 11.3_

  - [ ]* 22.7 Verify data minimization
    - Review data collection practices
    - Verify only necessary fields collected
    - Verify no email content stored
    - _Requirements: 11.8_

- [ ] 23. Perform disaster recovery testing
  - [ ]* 23.1 Test DynamoDB backup restoration
    - Create test backup
    - Restore to new table
    - Validate data integrity (record counts, checksums)
    - Verify schema consistency
    - _Requirements: 15.1, 15.6_

  - [ ]* 23.2 Test cross-region failover
    - Simulate ap-south-1 region failure
    - Execute failover to ap-south-2
    - Verify system functionality in backup region
    - Measure RTO and RPO
    - _Requirements: 15.2, 15.5_

  - [ ]* 23.3 Test disaster recovery runbooks
    - Follow documented DR procedures
    - Verify completeness and accuracy
    - Update runbooks based on findings
    - _Requirements: 15.4_

  - [ ]* 23.4 Validate RTO/RPO requirements
    - Measure actual recovery time (target: 4 hours)
    - Measure actual data loss (target: 1 hour)
    - Document results
    - _Requirements: 15.5_


- [ ] 24. Create deployment pipeline and documentation
  - [ ] 24.1 Set up CI/CD pipeline
    - Configure GitHub Actions or AWS CodePipeline
    - Add pre-commit hooks for linting and unit tests
    - Add PR checks for unit tests, property tests, security scans
    - Add staging deployment with integration tests
    - Add production deployment with smoke tests
    - Configure automated rollback on failures
    - _Requirements: All_

  - [ ] 24.2 Create API documentation
    - Generate OpenAPI specification for REST API
    - Document all endpoints with request/response examples
    - Document authentication requirements
    - Document rate limiting policies
    - _Requirements: 13.1_

  - [ ] 24.3 Create deployment documentation
    - Document infrastructure deployment steps
    - Document environment variable configuration
    - Document AWS service prerequisites
    - Document IAM role setup
    - _Requirements: All_

  - [ ] 24.4 Create operational runbooks
    - Document monitoring and alerting procedures
    - Document incident response procedures
    - Document backup and restore procedures
    - Document disaster recovery procedures
    - _Requirements: 14.1, 15.4_

  - [ ] 24.5 Create user documentation
    - Document OAuth setup process
    - Document notification preferences configuration
    - Document WhatsApp verification process
    - Document API usage examples
    - _Requirements: 1.1, 12.6, 12.9, 13.1_

- [ ] 25. Final integration and end-to-end testing
  - [ ] 25.1 Deploy complete system to staging environment
    - Deploy all infrastructure components
    - Deploy all Lambda functions
    - Configure all integrations
    - Verify all services running
    - _Requirements: All_

  - [ ] 25.2 Run end-to-end smoke tests
    - Test complete OAuth flow
    - Test email retrieval and processing
    - Test compliance extraction
    - Test risk assessment
    - Test notifications across all channels
    - Test API queries
    - Test data export and deletion
    - _Requirements: All_

  - [ ] 25.3 Verify all correctness properties
    - Review all 49 property-based test results
    - Ensure all properties pass with 100+ iterations
    - Document any property failures and remediate
    - _Requirements: All_

  - [ ] 25.4 Verify all monitoring and alerting
    - Trigger test alarms
    - Verify SNS notifications received
    - Verify CloudWatch dashboards display correctly
    - Verify X-Ray traces captured
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

  - [ ] 25.5 Perform security audit
    - Review IAM policies
    - Review encryption configurations
    - Review network configurations
    - Review CloudTrail logs
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

  - [ ] 25.6 Perform compliance audit
    - Verify data residency
    - Verify data retention policies
    - Verify audit logging
    - Verify consent management
    - _Requirements: 11.1, 11.2, 11.3, 11.6_

  - [ ] 25.7 Perform cost analysis
    - Review actual costs in staging environment
    - Project production costs based on expected load
    - Verify cost optimization measures in place
    - Configure cost alerts
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.8_

- [ ] 26. Final checkpoint - Production readiness review
  - Ensure all tests pass, all documentation complete, all security measures in place, ask the user if ready for production deployment.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties using fast-check (Node.js) and Hypothesis (Python)
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end workflows
- All Lambda functions use ARM64 architecture for cost optimization
- All data remains in AWS India regions (ap-south-1, ap-south-2) for compliance
- Infrastructure is defined as code using AWS CDK or Terraform
- CI/CD pipeline automates testing and deployment
- Monitoring and alerting provide operational visibility
- Disaster recovery procedures ensure business continuity

## Property-Based Test Configuration

All property-based tests must:
- Use fast-check for Node.js Lambda functions
- Use Hypothesis for Python Lambda functions
- Run minimum 100 iterations per test
- Reference the design document property number
- Tag format: `Feature: ai-compliance-monitoring-msme, Property {number}: {property_text}`
- Validate universal properties that hold for all inputs
- Use generators to create diverse test data

## Testing Coverage Summary

- 49 correctness properties with property-based tests
- Unit tests for all Lambda functions (80% code coverage target)
- Integration tests for all critical workflows
- Load tests for performance validation
- Security tests for vulnerability assessment
- Compliance tests for regulatory validation
- Disaster recovery tests for business continuity

## Implementation Language Summary

- **Node.js 20.x (ARM64)**: email-retrieval-handler, notification-handler, API Lambda handlers
- **Python 3.12 (ARM64)**: compliance-extraction-handler, risk-assessment-handler, data export/deletion functions
- **Infrastructure as Code**: AWS CDK (TypeScript) or Terraform (HCL)
- **Testing**: Jest + fast-check (Node.js), pytest + Hypothesis (Python)

## Deployment Strategy

1. Deploy infrastructure (DynamoDB, IAM, Secrets Manager, SQS, SNS, EventBridge, API Gateway)
2. Deploy Lambda functions (email retrieval, extraction, risk assessment, notifications, API handlers)
3. Configure integrations (OAuth providers, WhatsApp Business API, AWS Bedrock, Textract, Comprehend)
4. Run integration tests in staging environment
5. Perform security and compliance audits
6. Deploy to production with smoke tests
7. Monitor metrics and alerts
8. Iterate based on operational feedback
