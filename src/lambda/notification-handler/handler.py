"""
Notification Handler Lambda Function (Python)
Multi-channel notification delivery: Email (SES), SMS (SNS), WhatsApp.
Handles new notice alerts, deadline reminders, and risk escalation notifications.
"""
import json
import os
import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional

import boto3
import requests

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# AWS clients
ses_client = boto3.client('ses')
sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')

# Environment
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
COMPLIANCE_TABLE = os.environ.get('COMPLIANCE_METADATA_TABLE', f'compliance-shield-{ENVIRONMENT}-compliance-metadata')
NOTIFICATION_PREFS_TABLE = os.environ.get('NOTIFICATION_PREFERENCES_TABLE', f'compliance-shield-{ENVIRONMENT}-notification-preferences')
EMAIL_FROM = os.environ.get('EMAIL_FROM_ADDRESS', 'noreply@complianceshield.example.com')
SMS_SENDER_ID = os.environ.get('SMS_SENDER_ID', 'COMPLNCE')
WHATSAPP_SECRET_ARN = os.environ.get('WHATSAPP_API_KEY_SECRET_ARN', '')

# Reminder intervals per risk level (days before deadline)
REMINDER_DAYS = {
    'Critical': [30, 14, 7, 1],
    'critical': [30, 14, 7, 1],
    'High': [30, 14, 7, 1],
    'high': [30, 14, 7, 1],
    'Medium': [14, 7, 1],
    'medium': [14, 7, 1],
    'Low': [30],
    'low': [30],
}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for notifications.
    Triggered by:
    - SNS (risk assessment alerts)
    - EventBridge schedule (daily reminder check at 9 AM IST)
    - Direct invocation
    """
    logger.info(f'Notification handler started at {datetime.utcnow().isoformat()}')

    sent = 0
    errors = []

    # Handle SNS trigger (risk assessment alert)
    if 'Records' in event:
        for record in event['Records']:
            try:
                if record.get('EventSource') == 'aws:sns':
                    message = json.loads(record['Sns']['Message'])
                    result = send_risk_alert(message)
                    sent += result
            except Exception as e:
                logger.error(f'Error processing SNS record: {e}')
                errors.append({'error': str(e)})

    # Handle EventBridge schedule (daily reminder check)
    elif event.get('source') == 'aws.events' or event.get('detail-type') == 'Scheduled Event':
        sent, errors = process_daily_reminders()

    # Handle direct invocation
    elif 'user_id' in event:
        try:
            result = send_risk_alert(event)
            sent += result
        except Exception as e:
            errors.append({'error': str(e)})

    return {
        'statusCode': 200,
        'body': json.dumps({
            'notifications_sent': sent,
            'errors': errors,
            'timestamp': datetime.utcnow().isoformat(),
        }),
    }


def send_risk_alert(message: Dict) -> int:
    """Send notification for a risk assessment alert."""
    user_id = message.get('user_id', '')
    notice_id = message.get('notice_id', '')
    risk_level = message.get('risk_level', 'Low')

    if not user_id:
        logger.warning('No user_id in message')
        return 0

    # Get user notification preferences
    prefs = get_notification_preferences(user_id)

    # Check quiet hours (Critical overrides)
    if not prefs.get('critical_override_quiet_hours', True) and is_quiet_hours(prefs):
        if risk_level not in ('Critical', 'High'):
            logger.info(f'Quiet hours active for user {user_id}, skipping non-critical')
            return 0

    # Build notification content
    content = build_notification_content(message)
    sent = 0

    # Send via preferred channels in priority order
    channels = prefs.get('channel_priority', ['email', 'sms', 'whatsapp'])

    for channel in channels:
        try:
            if channel == 'email' and prefs.get('email_enabled', True):
                send_email(user_id, content)
                sent += 1
            elif channel == 'sms' and prefs.get('sms_enabled', False):
                phone = prefs.get('phone_number')
                if phone:
                    send_sms(phone, content['sms_body'])
                    sent += 1
            elif channel == 'whatsapp' and prefs.get('whatsapp_enabled', False):
                phone = prefs.get('phone_number')
                if phone and prefs.get('whatsapp_verified', False):
                    send_whatsapp(phone, content)
                    sent += 1
        except Exception as e:
            logger.error(f'Failed to send via {channel}: {e}')
            # Fallback: continue to next channel

    # Update notification tracking
    if sent > 0 and notice_id:
        update_notification_status(user_id, notice_id)

    return sent


def get_notification_preferences(user_id: str) -> Dict:
    """Get user notification preferences from DynamoDB."""
    table = dynamodb.Table(NOTIFICATION_PREFS_TABLE)
    try:
        response = table.get_item(Key={'user_id': user_id})
        return response.get('Item', {
            'email_enabled': True,
            'sms_enabled': False,
            'whatsapp_enabled': False,
            'channel_priority': ['email'],
            'batch_non_critical': True,
            'critical_override_quiet_hours': True,
        })
    except Exception as e:
        logger.warning(f'Could not fetch preferences for {user_id}: {e}')
        return {'email_enabled': True, 'channel_priority': ['email']}


def is_quiet_hours(prefs: Dict) -> bool:
    """Check if current time is within quiet hours."""
    if not prefs.get('quiet_hours_enabled', False):
        return False

    # Simple check - in production, use timezone-aware comparison
    now = datetime.utcnow()
    # Convert to IST (UTC+5:30)
    ist_hour = (now.hour + 5) % 24 + (1 if now.minute >= 30 else 0)

    start = int(prefs.get('quiet_hours_start', '22:00').split(':')[0])
    end = int(prefs.get('quiet_hours_end', '07:00').split(':')[0])

    if start > end:  # Overnight (e.g., 22:00 - 07:00)
        return ist_hour >= start or ist_hour < end
    return start <= ist_hour < end


def build_notification_content(message: Dict) -> Dict:
    """Build notification content for different channels."""
    risk_level = message.get('risk_level', 'Low')
    subject_line = message.get('subject', 'Compliance Notice')
    category = message.get('compliance_category', '')
    authority = message.get('issuing_authority', '')
    deadlines = message.get('deadlines', [])

    deadline_str = ''
    if deadlines:
        dl = deadlines[0]
        deadline_str = f"Deadline: {dl.get('date', 'N/A')}"

    risk_emoji = {'Critical': '🚨', 'High': '⚠️', 'Medium': '📋', 'Low': 'ℹ️'}.get(risk_level, '')

    return {
        'email_subject': f'[{risk_level}] {category} Compliance Alert - ComplianceShield',
        'email_body': f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: {'#dc2626' if risk_level == 'Critical' else '#f59e0b' if risk_level == 'High' else '#3b82f6'}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
    <h2>{risk_emoji} {risk_level} Risk - {category} Compliance</h2>
  </div>
  <div style="padding: 16px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p><strong>Subject:</strong> {subject_line}</p>
    <p><strong>Issuing Authority:</strong> {authority}</p>
    <p><strong>{deadline_str}</strong></p>
    <p><strong>Category:</strong> {category}</p>
    <hr>
    <p style="color: #6b7280; font-size: 12px;">
      This alert was generated by ComplianceShield AI. 
      Log in to your dashboard for full details and to take action.
    </p>
  </div>
</body>
</html>
""",
        'sms_body': f'{risk_emoji} [{risk_level}] {category}: {subject_line}. {deadline_str}. From: {authority}. -ComplianceShield',
        'whatsapp_body': {
            'risk_level': risk_level,
            'category': category,
            'subject': subject_line,
            'authority': authority,
            'deadline': deadline_str,
        },
    }


def send_email(user_id: str, content: Dict) -> None:
    """Send email notification via SES."""
    # Look up email from notification preferences table
    destination = None
    try:
        prefs_table = dynamodb.Table(NOTIFICATION_PREFS_TABLE)
        prefs = prefs_table.get_item(Key={'user_id': user_id}).get('Item', {})
        destination = prefs.get('email_address') or prefs.get('email')
    except Exception as e:
        logger.warning(f'Could not lookup email for {user_id}: {e}')

    if not destination:
        destination = user_id if '@' in user_id else None

    if not destination:
        logger.warning(f'No email address found for user {user_id}, skipping email')
        return

    ses_client.send_email(
        Source=EMAIL_FROM,
        Destination={'ToAddresses': [destination]},
        Message={
            'Subject': {'Data': content['email_subject']},
            'Body': {
                'Html': {'Data': content['email_body']},
            },
        },
    )
    logger.info(f'Email sent to {destination}')


def send_sms(phone_number: str, body: str) -> None:
    """Send SMS notification via SNS."""
    sns_client.publish(
        PhoneNumber=phone_number,
        Message=body[:160],  # SMS character limit
        MessageAttributes={
            'AWS.SNS.SMS.SenderID': {
                'DataType': 'String',
                'StringValue': SMS_SENDER_ID,
            },
            'AWS.SNS.SMS.SMSType': {
                'DataType': 'String',
                'StringValue': 'Transactional',
            },
        },
    )
    logger.info(f'SMS sent to {phone_number}')


def send_whatsapp(phone_number: str, content: Dict) -> None:
    """Send WhatsApp notification via Business API (Twilio/MessageBird)."""
    try:
        if not WHATSAPP_SECRET_ARN:
            logger.warning('WhatsApp API secret not configured')
            return

        # Get API credentials
        secret = secrets_client.get_secret_value(SecretId=WHATSAPP_SECRET_ARN)
        api_config = json.loads(secret['SecretString'])

        # Using Twilio WhatsApp API as example
        account_sid = api_config.get('account_sid', '')
        auth_token = api_config.get('auth_token', '')
        from_number = api_config.get('from_number', '')

        wa_body = content.get('whatsapp_body', {})
        message = (
            f"🛡️ *ComplianceShield Alert*\n\n"
            f"*Risk Level:* {wa_body.get('risk_level', '')}\n"
            f"*Category:* {wa_body.get('category', '')}\n"
            f"*Subject:* {wa_body.get('subject', '')}\n"
            f"*Authority:* {wa_body.get('authority', '')}\n"
            f"*{wa_body.get('deadline', '')}*\n\n"
            f"Log in to ComplianceShield for details."
        )

        url = f'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json'
        resp = requests.post(
            url,
            auth=(account_sid, auth_token),
            data={
                'From': f'whatsapp:{from_number}',
                'To': f'whatsapp:{phone_number}',
                'Body': message,
            },
        )
        resp.raise_for_status()
        logger.info(f'WhatsApp sent to {phone_number}')

    except Exception as e:
        logger.error(f'WhatsApp send failed: {e}')
        raise


def update_notification_status(user_id: str, notice_id: str) -> None:
    """Update notification tracking in DynamoDB."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    table.update_item(
        Key={'user_id': user_id, 'notice_id': notice_id},
        UpdateExpression='SET notification_sent = :t, last_notification_sent = :ts',
        ExpressionAttributeValues={
            ':t': True,
            ':ts': datetime.utcnow().isoformat(),
        },
    )


def process_daily_reminders() -> tuple:
    """Process daily deadline reminders (scheduled by EventBridge)."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    sent = 0
    errors = []

    # Scan for active compliance notices with upcoming deadlines
    response = table.scan(
        FilterExpression='#s IN (:p, :a, :o)',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={
            ':p': 'pending',
            ':a': 'acknowledged',
            ':o': 'overdue',
        },
    )

    today = date.today()

    for item in response.get('Items', []):
        risk_level = item.get('risk_level', 'Low')
        reminder_days = REMINDER_DAYS.get(risk_level, [30])

        for dl in item.get('deadlines', []):
            try:
                dl_date = date.fromisoformat(dl['date'])
                days_until = (dl_date - today).days

                if days_until in reminder_days:
                    try:
                        message = {
                            'type': 'deadline_reminder',
                            'user_id': item['user_id'],
                            'notice_id': item['notice_id'],
                            'risk_level': risk_level,
                            'subject': item.get('subject', ''),
                            'compliance_category': item.get('compliance_category', ''),
                            'issuing_authority': item.get('issuing_authority', ''),
                            'deadlines': item.get('deadlines', []),
                            'days_until_deadline': days_until,
                        }
                        result = send_risk_alert(message)
                        sent += result
                    except Exception as e:
                        errors.append({'notice_id': item.get('notice_id'), 'error': str(e)})
            except (ValueError, TypeError):
                continue

    return sent, errors
