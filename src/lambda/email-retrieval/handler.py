"""
Email Retrieval Lambda Function (Python)
Authenticates with email providers via OAuth, retrieves emails from
government domains (.gov.in, .nic.in), and sends batches to SQS.
"""
import json
import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

import boto3
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# AWS clients
secrets_client = boto3.client('secretsmanager')
sqs_client = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

# Environment
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
USER_INTEGRATIONS_TABLE = os.environ.get('USER_INTEGRATIONS_TABLE', f'compliance-shield-{ENVIRONMENT}-user-integrations')
PROCESSED_EMAILS_TABLE = os.environ.get('PROCESSED_EMAILS_TABLE', f'compliance-shield-{ENVIRONMENT}-processed-emails')
EMAIL_QUEUE_URL = os.environ.get('EMAIL_PROCESSING_QUEUE_URL', '')
BATCH_SIZE = 100
GOV_DOMAINS = ['.gov.in', '.nic.in']


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for email retrieval.
    Triggered by EventBridge schedule (every 4 hours) or manual invocation.
    """
    logger.info(f'Email retrieval started at {datetime.utcnow().isoformat()}')

    try:
        # Get all active user integrations
        integrations = get_active_integrations()
        total_processed = 0
        errors = []

        for integration in integrations:
            try:
                count = process_user_emails(integration)
                total_processed += count
            except Exception as e:
                logger.error(f"Error processing user {integration['user_id']}: {e}")
                errors.append({
                    'user_id': integration['user_id'],
                    'error': str(e),
                })
                # Mark integration as errored
                update_integration_status(
                    integration['user_id'],
                    'error',
                    str(e),
                )

        result = {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Email retrieval completed',
                'total_emails_processed': total_processed,
                'users_processed': len(integrations),
                'errors': errors,
                'timestamp': datetime.utcnow().isoformat(),
            }),
        }
        logger.info(f'Email retrieval completed: {total_processed} emails from {len(integrations)} users')
        return result

    except Exception as e:
        logger.error(f'Email retrieval failed: {e}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'message': str(e)}),
        }


def get_active_integrations() -> List[Dict]:
    """Fetch all active (connected) user integrations from DynamoDB."""
    table = dynamodb.Table(USER_INTEGRATIONS_TABLE)
    response = table.scan(
        FilterExpression='#s = :status',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={':status': 'connected'},
    )
    return response.get('Items', [])


def process_user_emails(integration: Dict) -> int:
    """Process emails for a single user integration."""
    user_id = integration['user_id']
    provider = integration.get('provider', 'gmail')
    last_processed = integration.get('last_sync_timestamp', '')

    # Get OAuth token from Secrets Manager
    oauth_secret_arn = integration['oauth_secret_arn']
    credentials = get_oauth_credentials(oauth_secret_arn, provider)

    if provider == 'gmail':
        emails = fetch_gmail_emails(credentials, last_processed)
    else:
        logger.warning(f'Provider {provider} not yet supported')
        return 0

    # Filter for government domains
    gov_emails = filter_government_emails(emails)

    if not gov_emails:
        logger.info(f'No new government emails for user {user_id}')
        update_sync_timestamp(user_id)
        return 0

    # Filter out already-processed emails
    unprocessed = filter_already_processed(user_id, gov_emails)

    # Send batches to SQS
    batches_sent = send_to_sqs(user_id, unprocessed, provider)

    # Update sync timestamp & last processed email
    update_sync_timestamp(user_id)

    logger.info(f'User {user_id}: {len(unprocessed)} emails in {batches_sent} batches')
    return len(unprocessed)


def get_oauth_credentials(secret_arn: str, provider: str) -> Credentials:
    """Retrieve OAuth credentials from Secrets Manager."""
    response = secrets_client.get_secret_value(SecretId=secret_arn)
    secret = json.loads(response['SecretString'])

    creds = Credentials(
        token=secret.get('access_token'),
        refresh_token=secret.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=secret.get('client_id'),
        client_secret=secret.get('client_secret'),
    )

    # Refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Update stored token
        secret['access_token'] = creds.token
        secrets_client.put_secret_value(
            SecretId=secret_arn,
            SecretString=json.dumps(secret),
        )

    return creds


def fetch_gmail_emails(credentials: Credentials, since: str = '') -> List[Dict]:
    """Fetch emails from Gmail API."""
    service = build('gmail', 'v1', credentials=credentials)

    query = 'from:(.gov.in OR .nic.in)'
    if since:
        query += f' after:{since}'

    messages = []
    page_token = None

    while True:
        result = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=BATCH_SIZE,
            pageToken=page_token,
        ).execute()

        if 'messages' in result:
            for msg_meta in result['messages']:
                msg = service.users().messages().get(
                    userId='me',
                    id=msg_meta['id'],
                    format='full',
                ).execute()
                messages.append(parse_gmail_message(msg))

        page_token = result.get('nextPageToken')
        if not page_token or len(messages) >= BATCH_SIZE:
            break

    return messages


def parse_gmail_message(msg: Dict) -> Dict:
    """Parse a Gmail API message into a standard format."""
    headers = {h['name'].lower(): h['value'] for h in msg.get('payload', {}).get('headers', [])}
    return {
        'email_id': msg['id'],
        'subject': headers.get('subject', ''),
        'sender': headers.get('from', ''),
        'date': headers.get('date', ''),
        'body': get_email_body(msg.get('payload', {})),
        'has_attachments': bool(msg.get('payload', {}).get('parts', [])),
    }


def get_email_body(payload: Dict) -> str:
    """Extract email body text from Gmail payload."""
    import base64

    if 'body' in payload and payload['body'].get('data'):
        return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='replace')

    for part in payload.get('parts', []):
        if part.get('mimeType') == 'text/plain' and part.get('body', {}).get('data'):
            return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='replace')

    return ''


def filter_government_emails(emails: List[Dict]) -> List[Dict]:
    """Filter emails to only those from government domains."""
    result = []
    for email in emails:
        sender = email.get('sender', '').lower()
        if any(domain in sender for domain in GOV_DOMAINS):
            result.append(email)
    return result


def filter_already_processed(user_id: str, emails: List[Dict]) -> List[Dict]:
    """Filter out emails that have already been processed."""
    table = dynamodb.Table(PROCESSED_EMAILS_TABLE)
    unprocessed = []
    for email in emails:
        try:
            response = table.get_item(
                Key={'user_id': user_id, 'email_id': email['email_id']},
            )
            if 'Item' not in response:
                unprocessed.append(email)
        except Exception:
            unprocessed.append(email)
    return unprocessed


def send_to_sqs(user_id: str, emails: List[Dict], provider: str) -> int:
    """Send email batches to SQS for processing."""
    import uuid
    batches = [emails[i:i + BATCH_SIZE] for i in range(0, len(emails), BATCH_SIZE)]

    for batch in batches:
        message = {
            'userId': user_id,
            'batchId': str(uuid.uuid4()),
            'provider': provider,
            'emailIds': [e['email_id'] for e in batch],
            'emails': batch,
        }
        sqs_client.send_message(
            QueueUrl=EMAIL_QUEUE_URL,
            MessageBody=json.dumps(message),
        )

    return len(batches)


def update_sync_timestamp(user_id: str) -> None:
    """Update the last sync timestamp for a user."""
    table = dynamodb.Table(USER_INTEGRATIONS_TABLE)
    table.update_item(
        Key={'user_id': user_id},
        UpdateExpression='SET last_sync_timestamp = :ts',
        ExpressionAttributeValues={':ts': datetime.utcnow().isoformat()},
    )


def update_integration_status(user_id: str, status: str, error_msg: str = '') -> None:
    """Update integration status (connected/disconnected/error)."""
    table = dynamodb.Table(USER_INTEGRATIONS_TABLE)
    update_expr = 'SET #s = :status, updated_at = :ts'
    expr_values: Dict[str, Any] = {
        ':status': status,
        ':ts': datetime.utcnow().isoformat(),
    }
    if error_msg:
        update_expr += ', error_message = :err'
        expr_values[':err'] = error_msg

    table.update_item(
        Key={'user_id': user_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues=expr_values,
    )
