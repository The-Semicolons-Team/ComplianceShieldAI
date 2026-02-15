# Design Document: AI Compliance Monitoring System for Indian MSMEs

## Overview

This document describes the technical design for a secure, stateless, serverless AI compliance monitoring system built exclusively on AWS services. The system integrates with email providers via OAuth, extracts government compliance notices using AI/ML, identifies deadlines, assesses risk levels, and stores structured metadata in a cost-optimized manner.

The architecture follows AWS Well-Architected Framework principles with emphasis on security, scalability, cost optimization, and operational excellence. All data remains within AWS India regions to comply with Indian data regulations.

## Architecture

### High-Level Architecture

![High-level architecture](docs/images/highlevel-diagram.png)

### Detailed AWS Architecture

![ComplianceShield detailed AWS architecture](docs/images/detail.png)

### Architecture Principles

1. **Serverless-First**: All compute uses AWS Lambda for automatic scaling and pay-per-use pricing
2. **Stateless Design**: No session state maintained; all context derived from DynamoDB metadata
3. **Event-Driven**: EventBridge and SQS orchestrate asynchronous processing workflows
4. **Security by Default**: Encryption at rest and in transit, least privilege IAM, VPC endpoints
5. **Cost-Optimized**: ARM-based Lambda, DynamoDB on-demand, intelligent filtering, lifecycle policies
6. **Regional Isolation**: All resources deployed in AWS India regions (ap-south-1 Mumbai, ap-south-2 Hyderabad)

## Components and Interfaces

### 1. API Gateway and Authentication

**Purpose**: Provides secure REST API endpoints for user interactions and integrations.

**Components**:
- **API Gateway**: REST API with request validation, throttling, and CORS support
- **AWS WAF**: Web application firewall with managed rule sets for OWASP Top 10 protection
- **Amazon Cognito**: User pool for authentication with MFA support

**Interfaces**: OAuth initiate/callback, compliance notices (list, get, acknowledge), deadlines (query), notification preferences, WhatsApp verify/confirm, health check.

**Security**:
- API Gateway uses Cognito authorizer for JWT validation
- Rate limiting: 1000 requests/hour per user
- Request/response logging to CloudWatch
- API keys for programmatic access with rotation policy

### 2. Email Integration Service

**Purpose**: Authenticates with email providers and retrieves emails from government domains.

**Components**:
- **Lambda Function**: `email-retrieval-handler` (Node.js 20.x on ARM64)
- **AWS Secrets Manager**: Stores encrypted OAuth tokens with automatic rotation
- **EventBridge Rule**: Triggers email retrieval every 4 hours

**Processing Flow**:
1. EventBridge triggers Lambda on schedule
2. Lambda retrieves OAuth token from Secrets Manager
3. Lambda calls email provider API (Gmail API / Microsoft Graph API)
4. Filters emails from government domains (.gov.in, .nic.in)
5. Fetches only unprocessed emails since last run (tracked in DynamoDB)
6. Batches emails into groups of 100
7. Sends each batch to SQS queue for processing
8. Updates last processed timestamp in DynamoDB

**OAuth Implementation**: User initiates → state token stored → authorization URL returned → user authorizes → callback → state validated → code exchanged for tokens → encrypt with KMS → store in Secrets Manager → automatic rotation (45 days).

**Email Filtering Logic**: Filter by sender domain (*.gov.in, *.nic.in), exclude already processed, received after last run, optional keyword match. Batch processing: max 100 emails per batch, one SQS message per batch (emailIds, userId, batchId).

**Error Handling**:
- OAuth token refresh failure: Notify user, mark integration as disconnected
- API rate limiting: Exponential backoff with jitter
- Network errors: Retry 3 times, then send to DLQ
- Invalid email format: Log warning, skip email, continue processing

### 3. Compliance Extraction Engine

**Purpose**: Analyzes emails using AI/ML to extract structured compliance information.

**Components**:
- **Lambda Function**: `compliance-extraction-handler` (Python 3.12 on ARM64, 3GB memory, 5min timeout)
- **Amazon Bedrock**: Claude 3 Sonnet for compliance analysis
- **Amazon Textract**: PDF and image text extraction
- **Amazon Comprehend**: Entity recognition and key phrase extraction

**Processing Flow**:
1. Lambda triggered by SQS message (batch size: 10)
2. For each email in batch:
   - Extract email body and metadata
   - If attachments present, download to /tmp
   - Use Textract to extract text from PDFs/images
   - Combine email body + attachment text
3. Send combined text to Bedrock with structured prompt
4. Parse Bedrock response into structured format
5. Use Comprehend for additional entity extraction
6. Store structured metadata in DynamoDB
7. Delete temporary files from /tmp
8. Delete SQS message on success

**AI Prompt**: System prompt for Indian government compliance notices; user prompt includes subject, sender, date, body, attachment text. Output: isComplianceNotice, complianceType (Tax|Labor|Environmental|Corporate|Trade|Other), issuingAuthority, referenceNumber, subject, deadlines (date, type, description), requiredActions, penalties (amount, currency, description), applicableRegulations, keywords. Non-notices return minimal data.

**Textract**: Download attachment → upload to S3 (24h lifecycle) → async text detection → poll until done (max 60s) → concatenate text → delete from S3.

**Comprehend**: After Bedrock: DetectEntities (ORGANIZATION, DATE, LOCATION, QUANTITY), DetectKeyPhrases, merge with Bedrock results for better deadline detection.

**Error Handling**:
- Bedrock throttling: Exponential backoff, max 3 retries
- Textract timeout: Skip attachment, process email body only
- Invalid JSON from Bedrock: Log error, flag for manual review
- Comprehend errors: Continue without enhancement, log warning

### 4. Risk Assessment Service

**Purpose**: Calculates risk levels based on deadlines, penalties, and compliance history.

**Components**:
- **Lambda Function**: `risk-assessment-handler` (Python 3.12 on ARM64, 1GB memory, 1min timeout)
- **DynamoDB**: Reads compliance metadata and historical data

**Risk Calculation Algorithm**:

1. **Deadline proximity**: Score +40 if ≤7 days, +30 if ≤14 days, +20 if ≤30 days, +10 otherwise.
2. **Penalty severity**: Score +30 if ≥₹1,00,000, +20 if ≥₹50,000, +10 if ≥₹10,000, +5 otherwise.
3. **Category weight**: Multiply score by 1.2 (Tax), 1.15 (Corporate), 1.1 (Labor), 1.0 (Environmental, Trade).
4. **History**: +15 if any missed deadlines; +10 if repeat violation.
5. **Risk level**: Critical if score ≥70, High if ≥50, Medium if ≥30, Low otherwise.

**Processing Flow**:
1. Triggered after compliance extraction completes
2. Retrieve compliance notice from DynamoDB
3. Query historical compliance data for user
4. Calculate risk score using algorithm
5. Determine risk level
6. Update DynamoDB with risk level and score
7. If risk level is Critical, trigger immediate notification
8. Schedule reminder notifications based on risk level

**Reminder Schedule**: Critical → immediate + 1 day before; High → 7 days + 1 day before; Medium → 14 days + 3 days before; Low → 30 days before deadline.

### 5. Notification Service

**Purpose**: Sends timely notifications about compliance deadlines and new notices.

**Components**:
- **Lambda Function**: `notification-handler` (Node.js 20.x on ARM64, 512MB memory)
- **Amazon SNS**: Multi-channel notification delivery (email, SMS)
- **Amazon SES**: Transactional email delivery
- **WhatsApp Business API**: Rich WhatsApp notifications with action buttons
- **AWS Secrets Manager**: Stores WhatsApp API credentials
- **EventBridge**: Scheduled reminder checks

**Notification Types**:
1. **New Compliance Notice**: Sent within 1 hour of extraction
2. **Deadline Reminder**: Sent at scheduled intervals
3. **Risk Level Change**: Sent when risk escalates
4. **Integration Status**: Sent when OAuth connection fails

**Processing Flow**:
1. Lambda triggered by:
   - Direct invocation from risk assessment (Critical notices)
   - EventBridge schedule (daily reminder check at 9 AM IST)
   - DynamoDB Stream (risk level changes)
2. Query DynamoDB for notices requiring notifications
3. Check user notification preferences (email, SMS, WhatsApp)
4. Respect quiet hours configuration (Critical overrides)
5. Batch non-critical notifications
6. Format notification content based on channel
7. Send via preferred channels:
   - WhatsApp: Rich message with action buttons (primary)
   - Email: Via SES with formatted HTML
   - SMS: Via SNS with concise text
8. Implement fallback chain: WhatsApp → SMS → Email
9. Update notification_sent timestamp in DynamoDB
10. Log delivery status per channel

**Templates**: Email (subject, body with compliance type, authority, deadline, risk, actions, penalties, reference). WhatsApp: template with header (risk alert), body parameters, quick-reply (acknowledge), URL button. SMS: one-line risk + type + deadline + authority + ref.

**Batching**: Critical/High → send immediately, all channels. Medium → up to 5 notices per day. Low → up to 10 per week. Quiet hours respected; Critical overrides. Channel order: WhatsApp → Email → SMS.

**Error Handling**:
- WhatsApp delivery failure: Retry 3 times, then fall back to SMS
- SMS delivery failure: Fall back to email notification
- SNS delivery failure: Retry 3 times with exponential backoff
- SES bounce/complaint: Mark email as invalid, notify admin
- WhatsApp rate limiting: Queue messages, respect API limits (80 msg/sec)
- Rate limiting: Queue notifications, process in next batch

**WhatsApp Integration**:
- Use WhatsApp Business API via official provider (e.g., Twilio, MessageBird)
- Store API credentials in AWS Secrets Manager
- Verify phone numbers before enabling WhatsApp notifications
- Support interactive buttons for quick actions (Acknowledge, View Details)
- Handle webhook callbacks for delivery status and user responses
- Respect WhatsApp messaging policies (24-hour window for non-template messages)

## Data Models

### DynamoDB Table: compliance_metadata

**Primary Key**:
- Partition Key: `user_id` (String)
- Sort Key: `notice_id` (String, UUID v4)

**Attributes**: user_id, notice_id, email_id, subject, sender, dates; compliance fields (type, category, authority, reference, deadlines with date/type/description, required_actions, penalties, regulations, keywords); risk_level, risk_score, risk_factors; status, acknowledged_by/at, notes; notification_sent, timestamps; ttl.

**Global Secondary Indexes**:

1. **DeadlineIndex**:
   - Partition Key: `user_id`
   - Sort Key: `deadlines[0].date`
   - Purpose: Query upcoming deadlines efficiently

2. **RiskLevelIndex**:
   - Partition Key: `user_id`
   - Sort Key: `risk_level#deadlines[0].date`
   - Purpose: Query by risk level and deadline

3. **CategoryIndex**:
   - Partition Key: `user_id`
   - Sort Key: `compliance_category#deadlines[0].date`
   - Purpose: Filter by compliance category

**Capacity Mode**: On-demand (auto-scaling based on traffic)

**Encryption**: AWS KMS customer-managed key

**Point-in-Time Recovery**: Enabled (35-day retention)

**TTL**: Enabled on `ttl` attribute (7 years = 220752000 seconds)

### DynamoDB Table: user_integrations

**Primary Key**:
- Partition Key: `user_id` (String)
- Sort Key: `provider` (String, "gmail" or "outlook")

**Attributes**: user_id, provider, email_address, connected_at, last_sync_timestamp, last_processed_email_id, oauth_secret_arn, status, error_message, sync_frequency_hours (default 4), filter_domains (default .gov.in, .nic.in).

**Encryption**: AWS KMS customer-managed key

### DynamoDB Table: processed_emails

**Primary Key**:
- Partition Key: `user_id` (String)
- Sort Key: `email_id` (String)

**Attributes**: user_id, email_id, processed_at, is_compliance_notice, notice_id (if notice), ttl (90 days).

**Purpose**: Prevents duplicate processing of emails

**TTL**: 90 days (sufficient for deduplication)

### DynamoDB Table: notification_preferences

**Primary Key**:
- Partition Key: `user_id` (String)

**Attributes**: user_id; email_enabled, sms_enabled, whatsapp_enabled (defaults true/false/false); phone_number, whatsapp_verified, whatsapp_opt_in_timestamp; channel_priority (whatsapp|email|sms); quiet_hours (enabled, start, end, timezone Asia/Kolkata); batch_non_critical, critical_override_quiet_hours; reminder_schedule per risk level (days before).

### AWS Secrets Manager: OAuth Tokens

**Secret Structure**: user_id, provider, access_token, refresh_token (encrypted), token_type Bearer, expires_at, scope.

**Rotation**: Automatic every 45 days using Lambda rotation function

**Encryption**: AWS KMS customer-managed key

**Access**: Only email-retrieval-handler Lambda has read permission

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: OAuth Token Encryption

*For any* OAuth token received from email providers, the token must be encrypted using AWS KMS before storage in Secrets Manager, and the user-token association must use encrypted references.

**Validates: Requirements 1.3, 1.8**

### Property 2: OAuth Token Auto-Refresh

*For any* expired OAuth token, the system must automatically refresh it without user intervention, and only notify the user if refresh fails after all retry attempts.

**Validates: Requirements 1.5, 1.6**

### Property 3: Government Domain Email Filtering

*For any* batch of retrieved emails, only emails from verified government domains (.gov.in, .nic.in) should be processed, and all other emails must be filtered out before extraction.

**Validates: Requirements 2.1, 9.2**

### Property 4: Email Deduplication

*For any* email retrieval operation, the system must fetch only unprocessed messages since the last successful run, ensuring no email is processed more than once.

**Validates: Requirements 2.3, 2.5**

### Property 5: Email Batch Size Limit

*For any* email retrieval invocation, the system must process emails in batches not exceeding 100 messages per batch.

**Validates: Requirements 2.4**

### Property 6: Exponential Backoff Retry

*For any* failed operation (email retrieval, extraction, notification), the system must retry with exponential backoff up to 3 attempts before sending to dead letter queue.

**Validates: Requirements 2.6, 10.1, 10.2**

### Property 7: Email Field Extraction Completeness

*For any* email processed, the system must extract all required fields (subject, sender, body, attachments) before passing to the extraction engine.

**Validates: Requirements 2.8**

### Property 8: Compliance Notice Structured Extraction

*For any* identified compliance notice, the system must extract all required structured fields (issuing authority, subject matter, reference numbers, compliance type, applicable regulations, required actions) and store them in DynamoDB.

**Validates: Requirements 3.3, 3.4, 6.2**

### Property 9: Penalty Information Extraction

*For any* compliance notice mentioning monetary penalties, the system must extract the penalty amount, currency, and description as structured data.

**Validates: Requirements 3.5**

### Property 10: Compliance Category Classification

*For any* compliance notice, the system must assign exactly one category from the valid set (Tax, Labor, Environmental, Corporate, Trade, Other).

**Validates: Requirements 3.6**

### Property 11: Attachment Text Extraction

*For any* email containing PDF or image attachments, the system must use AWS Textract to extract text content and include it in the compliance analysis.

**Validates: Requirements 3.7**

### Property 12: Data Minimization

*For any* processed email, the system must store only structured metadata in DynamoDB and must not retain original email content, attachments, or unstructured text.

**Validates: Requirements 3.8, 6.3**

### Property 13: Date Extraction and Classification

*For any* compliance notice, the system must identify all mentioned dates using NLP and correctly classify them as issue dates, effective dates, or deadline dates.

**Validates: Requirements 4.1, 4.2**

### Property 14: Multiple Deadline Handling

*For any* compliance notice containing multiple deadlines, the system must extract and store each deadline separately with its type and description.

**Validates: Requirements 4.3**

### Property 15: Date Format Normalization

*For any* extracted deadline, the system must normalize the date to ISO 8601 format (YYYY-MM-DD) regardless of the original format in the notice.

**Validates: Requirements 4.4**

### Property 16: Days Remaining Calculation

*For any* deadline, the system must correctly calculate the number of days remaining from the current date to the deadline date.

**Validates: Requirements 4.5**

### Property 17: Reminder Notification Scheduling

*For any* deadline, the system must schedule reminder notifications at the configured intervals based on risk level (Critical: immediate + 1 day before; High: 7 days + 1 day before; Medium: 14 days + 3 days before; Low: 30 days before).

**Validates: Requirements 4.6**

### Property 18: Missing Deadline Flagging

*For any* compliance notice where no explicit deadline is found, the system must flag the notice for manual review.

**Validates: Requirements 4.7**

### Property 19: Deadline Expiration Marking

*For any* deadline that has passed, the system must mark it as expired while maintaining the historical record.

**Validates: Requirements 4.8**

### Property 20: Risk Level Calculation

*For any* compliance notice, the system must calculate a risk score based on deadline proximity, penalty severity, compliance category, and historical factors, then assign the appropriate risk level (Critical: score ≥70 or deadline ≤7 days or penalty ≥₹100,000; High: score ≥50 or deadline ≤14 days or penalty ≥₹50,000; Medium: score ≥30 or deadline ≤30 days or penalty ≥₹10,000; Low: score <30 and deadline >30 days and penalty <₹10,000).

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 21: Risk Assessment Without Penalty

*For any* compliance notice without penalty information, the system must still calculate risk level based on deadline proximity, compliance category, and historical factors.

**Validates: Requirements 5.6**

### Property 22: Historical Risk Adjustment

*For any* user with previously missed deadlines or repeat violations, the system must increase the risk score for new compliance notices from the same category.

**Validates: Requirements 5.7**

### Property 23: Dynamic Risk Updates

*For any* compliance notice, as the deadline approaches and the risk level changes, the system must update the metadata in DynamoDB and trigger appropriate notifications.

**Validates: Requirements 5.8**

### Property 24: UUID Generation Uniqueness

*For any* compliance notice, the system must generate a unique identifier using UUID v4 format, ensuring no collisions across all notices.

**Validates: Requirements 6.4**

### Property 25: TTL Configuration

*For any* metadata record, the system must set the TTL attribute to 7 years (220,752,000 seconds) from the creation timestamp.

**Validates: Requirements 6.7**

### Property 26: Metadata Query Filtering

*For any* query request with filters (category, risk level, deadline range), the system must return only records matching all specified filter criteria.

**Validates: Requirements 6.8**

### Property 27: Log Sanitization

*For any* log entry, the system must redact sensitive information (email addresses, OAuth tokens, personal identifiers) before writing to CloudWatch.

**Validates: Requirements 7.5**

### Property 28: Extraction Performance

*For any* email, the compliance extraction process must complete within 30 seconds on average, measured from SQS message receipt to DynamoDB write completion.

**Validates: Requirements 8.3**

### Property 29: Temporary Attachment Storage Cleanup

*For any* attachment processed, the system must store it temporarily in S3 during extraction and automatically delete it within 24 hours using lifecycle policies.

**Validates: Requirements 8.8**

### Property 30: Data Export Completeness

*For any* user data export request, the system must return all compliance metadata associated with the user in machine-readable JSON format.

**Validates: Requirements 11.4**

### Property 31: Data Deletion Completeness

*For any* user data deletion request, the system must permanently delete all associated metadata (compliance notices, OAuth tokens, preferences, processed emails) within 30 days.

**Validates: Requirements 11.5**

### Property 32: Data Collection Minimization

*For any* data collection operation, the system must collect only the minimum necessary fields required for compliance monitoring functionality.

**Validates: Requirements 11.8**

### Property 33: New Notice Notification Timing

*For any* newly identified compliance notice, the system must send a notification to the user within 1 hour of extraction completion.

**Validates: Requirements 12.1**

### Property 34: Notification Content Completeness

*For any* notification sent, the message must include compliance type, deadline date, risk level, and required actions.

**Validates: Requirements 12.4**

### Property 34a: WhatsApp Rich Notification Format

*For any* WhatsApp notification sent, the message must use the approved template format with interactive buttons for acknowledgment and viewing details.

**Validates: Requirements 12.9**

### Property 34b: WhatsApp Delivery Fallback

*For any* failed WhatsApp notification delivery after 3 retries, the system must automatically fall back to SMS and then email notifications.

**Validates: Requirements 12.10**

### Property 35: Critical Notice Immediate Notification

*For any* compliance notice with Critical risk level, the system must send an immediate notification regardless of scheduled intervals or quiet hours configuration.

**Validates: Requirements 12.5**

### Property 36: Notification Preferences Respect

*For any* user with configured notification preferences (quiet hours, channel preferences), the system must respect these preferences for non-critical notifications.

**Validates: Requirements 12.6**

### Property 37: Non-Critical Notification Batching

*For any* non-critical notifications (Medium and Low risk), the system must batch them according to configured rules (Medium: up to 5 per day; Low: up to 10 per week) to avoid notification fatigue.

**Validates: Requirements 12.7**

### Property 38: Notification Delivery Retry

*For any* failed notification delivery, the system must retry up to 3 times with exponential backoff and log delivery failures to CloudWatch.

**Validates: Requirements 12.8**

### Property 39: API Authentication Enforcement

*For any* API request without valid authentication (API key or JWT token), the system must reject the request with HTTP 401 Unauthorized status.

**Validates: Requirements 13.2**

### Property 40: API Rate Limiting

*For any* user making API requests, the system must enforce a rate limit of 1000 requests per hour, rejecting excess requests with HTTP 429 Too Many Requests status.

**Validates: Requirements 13.3**

### Property 41: API Query Filtering

*For any* API query with filters (date range, category, risk level), the system must return only compliance notices matching all specified criteria in JSON format.

**Validates: Requirements 13.4**

### Property 42: API Response Format

*For any* API response, the system must return data in valid JSON format with appropriate HTTP status codes (200 for success, 400 for bad request, 401 for unauthorized, 404 for not found, 429 for rate limit, 500 for server error).

**Validates: Requirements 13.5**

### Property 43: Webhook Delivery

*For any* registered webhook, the system must deliver compliance notice notifications in real-time with retry logic for failed deliveries.

**Validates: Requirements 13.7**

### Property 44: API Error Messages

*For any* API error, the system must return a descriptive error message with a specific error code and HTTP status code.

**Validates: Requirements 13.8**

### Property 45: Structured Logging

*For any* operation, the system must log to CloudWatch using structured JSON format with required fields (timestamp, level, service, operation, user_id, trace_id, message).

**Validates: Requirements 14.1**

### Property 46: Anomaly Detection Alerting

*For any* detected anomaly (error rate spike, latency increase, processing failures), the system must trigger CloudWatch alarms and send notifications via SNS.

**Validates: Requirements 14.3**

### Property 47: Custom Metrics Tracking

*For any* operation, the system must track and publish custom metrics (emails_processed, compliance_notices_extracted, api_requests) to CloudWatch.

**Validates: Requirements 14.4**

### Property 48: Automated Health Degradation Alerts

*For any* system health degradation (Lambda errors >5%, DynamoDB throttling, API latency >2s), the system must automatically create alerts via SNS.

**Validates: Requirements 14.8**

### Property 49: Backup Data Integrity Validation

*For any* restore operation from backup, the system must validate data integrity (record counts, checksums, schema validation) before making the restored data available.

**Validates: Requirements 15.6**


## Error Handling

### Error Categories and Strategies

**1. Authentication Errors**
- **OAuth Token Expiration**: Automatic refresh using refresh token; notify user only if refresh fails
- **OAuth Token Revocation**: Mark integration as disconnected; send notification requesting re-authentication
- **Invalid Credentials**: Return 401 Unauthorized; log security event to CloudTrail
- **MFA Failure**: Reject authentication; enforce MFA retry with rate limiting

**2. Email Retrieval Errors**
- **API Rate Limiting**: Implement exponential backoff with jitter (1s, 2s, 4s); respect provider rate limits
- **Network Timeouts**: Retry up to 3 times; if all fail, send to DLQ for later processing
- **Invalid Email Format**: Log warning; skip email; continue processing batch
- **Provider API Changes**: Catch schema validation errors; alert administrators; flag for manual review

**3. Extraction Errors**
- **Bedrock Throttling**: Exponential backoff (2s, 4s, 8s); max 3 retries; if fails, send to DLQ
- **Textract Timeout**: Skip attachment processing; continue with email body only; log warning
- **Invalid JSON Response**: Log error with full context; flag email for manual review; continue processing
- **Comprehend Service Error**: Continue without NLP enhancement; log warning; extraction still succeeds

**4. Storage Errors**
- **DynamoDB Throttling**: Exponential backoff with jitter; implement request rate limiting
- **DynamoDB Capacity Exceeded**: Auto-scale using on-demand mode; alert if costs spike
- **S3 Upload Failure**: Retry 3 times; if fails, skip attachment; log error
- **KMS Key Unavailable**: Fail operation; alert administrators immediately; queue for retry

**5. Notification Errors**
- **WhatsApp Delivery Failure**: Retry 3 times with exponential backoff; fall back to SMS then email
- **WhatsApp Rate Limiting**: Queue messages; respect 80 msg/sec limit; retry after rate limit window
- **WhatsApp Template Rejection**: Log error; fall back to SMS/email; alert admin to fix template
- **SNS Delivery Failure**: Retry 3 times with exponential backoff; log failure; alert administrators
- **SES Bounce**: Mark email as invalid; disable email notifications; notify via WhatsApp/SMS if available
- **SMS Delivery Failure**: Fall back to email notification; log delivery failure
- **Webhook Timeout**: Retry 3 times; if fails, log and continue; don't block processing

**6. API Errors**
- **Invalid Request**: Return 400 Bad Request with descriptive error message and field-level validation errors
- **Unauthorized Access**: Return 401 Unauthorized; log security event
- **Rate Limit Exceeded**: Return 429 Too Many Requests with Retry-After header
- **Resource Not Found**: Return 404 Not Found with error code
- **Internal Server Error**: Return 500 Internal Server Error; log full stack trace; alert administrators

### Error Logging Standards

All errors must be logged with: timestamp, level ERROR, service, operation, user_id (redacted), trace_id, error_code, error_message, error_details (exception_type, stack_trace, context), retry_count, sent_to_dlq.

### Dead Letter Queue Processing

Messages in DLQ must be:
1. Retained for 14 days
2. Monitored with CloudWatch alarms (alert if >10 messages)
3. Reviewed daily by administrators
4. Manually reprocessed or marked as permanent failures
5. Analyzed for pattern detection (recurring errors indicate systemic issues)

### Circuit Breaker Pattern

For external service calls (email providers, Bedrock, Textract):
- **Closed State**: Normal operation
- **Open State**: After 5 consecutive failures, stop calling service for 60 seconds
- **Half-Open State**: After 60 seconds, allow 1 test request
- **Recovery**: If test succeeds, return to closed state; if fails, return to open state


## Testing Strategy

### Dual Testing Approach

This system requires both unit testing and property-based testing for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property Tests**: Verify universal properties across all inputs through randomization
- Both approaches are complementary and necessary for high-confidence correctness

### Property-Based Testing

**Framework**: Use **fast-check** (for Node.js Lambda functions) and **Hypothesis** (for Python Lambda functions)

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `Feature: ai-compliance-monitoring-msme, Property {number}: {property_text}`

**Property Test Examples**: Use fast-check (Node.js) / Hypothesis (Python) with 100+ runs; e.g. Property 3—filter output must be only .gov.in/.nic.in senders; Property 20—risk level in {Critical,High,Medium,Low} and Critical/High when deadline ≤7 days or penalty ≥₹1,00,000.

**Property Test Coverage**:
- All 49 correctness properties must have corresponding property-based tests
- Focus on universal properties that hold for all inputs
- Use generators to create diverse test data (valid and invalid)
- Test boundary conditions through randomization

### Unit Testing

**Framework**: Use **Jest** (for Node.js) and **pytest** (for Python)

**Unit Test Focus**:
- Specific examples demonstrating correct behavior
- Edge cases (empty inputs, null values, boundary conditions)
- Error conditions and exception handling
- Integration points between components
- Mock external services (Bedrock, Textract, email providers)

**Unit Test Examples**: Email retrieval—empty list returns success; OAuth refresh failure triggers SNS re-auth notification; batches respect max 100. Extraction—GST notice yields isComplianceNotice, Tax, authority, single deadline, penalty amount; notice without deadline yields flagForManualReview and empty deadlines.

### Integration Testing

**Scope**: Test end-to-end workflows with mocked AWS services

**Key Integration Tests**:
1. **OAuth Flow**: User initiates → Authorization → Callback → Token storage
2. **Email to Notification**: Email retrieval → Extraction → Risk assessment → Notification
3. **API Query**: Request → Authentication → DynamoDB query → Response formatting
4. **Deadline Reminder**: EventBridge trigger → Query deadlines → Send notifications
5. **Error Recovery**: Failed extraction → DLQ → Manual reprocess → Success

**Tools**:
- **LocalStack**: Local AWS service emulation for integration tests
- **AWS SAM Local**: Test Lambda functions locally
- **Moto**: Mock AWS services in Python tests
- **AWS SDK Mock**: Mock AWS SDK calls in Node.js tests

### Load Testing

**Scenarios**:
1. **Peak Email Volume**: 10,000 emails/hour for 2 hours
2. **Concurrent API Requests**: 100 users making 10 requests/second
3. **Deadline Reminder Burst**: 1,000 notifications sent simultaneously
4. **Large Attachment Processing**: 100 emails with 5MB PDF attachments

**Tools**: Apache JMeter or Artillery for API load testing

**Success Criteria**:
- Email processing completes within 1 hour for 10,000 emails
- API response time remains under 2 seconds at 95th percentile
- No Lambda throttling or DynamoDB capacity errors
- All notifications delivered within SLA (1 hour for new notices)

### Security Testing

**Tests**:
1. **Authentication Bypass**: Attempt API access without valid tokens
2. **SQL Injection**: Test API inputs for injection vulnerabilities (though DynamoDB is NoSQL)
3. **XSS Prevention**: Test API responses for script injection
4. **Rate Limit Enforcement**: Exceed rate limits and verify 429 responses
5. **Data Encryption**: Verify all data at rest is encrypted with KMS
6. **Log Sanitization**: Verify no sensitive data in CloudWatch logs
7. **IAM Permissions**: Verify least privilege access for all roles

**Tools**:
- **OWASP ZAP**: Automated security scanning
- **AWS IAM Access Analyzer**: Identify overly permissive policies
- **AWS Config**: Verify security compliance rules

### Compliance Testing

**Tests**:
1. **Data Residency**: Verify all resources in ap-south-1 or ap-south-2
2. **Data Retention**: Verify TTL set to 7 years for compliance metadata
3. **Audit Logging**: Verify CloudTrail captures all data access
4. **Data Export**: Test user data export functionality
5. **Data Deletion**: Test user data deletion within 30 days
6. **Consent Management**: Verify consent collected before processing

### Monitoring and Observability Testing

**Tests**:
1. **CloudWatch Logs**: Verify structured logging for all operations
2. **Custom Metrics**: Verify metrics published correctly
3. **X-Ray Traces**: Verify end-to-end tracing works
4. **CloudWatch Alarms**: Trigger anomalies and verify alarms fire
5. **Dashboard Accuracy**: Verify dashboard metrics match actual operations

### Disaster Recovery Testing

**Tests**:
1. **Backup Restoration**: Restore DynamoDB from backup and verify data integrity
2. **Cross-Region Failover**: Simulate region failure and verify recovery
3. **RTO/RPO Validation**: Measure actual recovery time and data loss
4. **Runbook Execution**: Follow DR runbooks and verify completeness

**Frequency**: Quarterly DR drills with documented results

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: 100% of correctness properties tested
- **Integration Test Coverage**: All critical workflows tested
- **Security Test Coverage**: All OWASP Top 10 vulnerabilities tested
- **Performance Test Coverage**: All SLA-critical operations tested

### Continuous Testing

**CI/CD Pipeline**:
1. **Pre-commit**: Run unit tests and linting
2. **Pull Request**: Run unit tests, property tests, and security scans
3. **Staging Deployment**: Run integration tests and smoke tests
4. **Production Deployment**: Run smoke tests and monitor metrics
5. **Scheduled**: Run load tests weekly, security scans daily, DR tests quarterly

**Test Automation**:
- All tests automated in CI/CD pipeline
- No manual testing required for deployment
- Automated rollback on test failures
- Automated alerts for test failures

