"""
Risk Assessment Lambda Function (Python)
Calculates risk levels for compliance notices based on deadlines,
penalties, compliance history, and category weights.
"""
import json
import os
import logging
from datetime import datetime, date
from typing import Dict, Any, List, Optional

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# AWS clients
dynamodb = boto3.resource('dynamodb')
sns_client = boto3.client('sns')

# Environment
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
COMPLIANCE_TABLE = os.environ.get('COMPLIANCE_METADATA_TABLE', f'compliance-shield-{ENVIRONMENT}-compliance-metadata')
NOTIFICATION_TOPIC_ARN = os.environ.get('NOTIFICATION_TOPIC_ARN', '')

# Category weights for risk calculation
CATEGORY_WEIGHTS = {
    'Tax': 1.2,
    'Corporate': 1.15,
    'Labor': 1.1,
    'Environmental': 1.0,
    'Trade': 1.0,
    'Other': 1.0,
}

# Risk level thresholds
RISK_THRESHOLDS = {
    'Critical': 70,
    'High': 50,
    'Medium': 30,
}

# Reminder schedules (days before deadline)
REMINDER_SCHEDULE = {
    'Critical': [1],           # immediate + 1 day before
    'High': [7, 1],            # 7 days + 1 day before
    'Medium': [14, 3],         # 14 days + 3 days before
    'Low': [30],               # 30 days before
}


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for risk assessment.
    Triggered after compliance extraction or by EventBridge for re-assessment.
    """
    logger.info(f'Risk assessment started at {datetime.utcnow().isoformat()}')

    processed = 0
    errors = []

    # Handle direct invocation with notice data
    if 'notice_id' in event and 'user_id' in event:
        try:
            assess_single_notice(event['user_id'], event['notice_id'])
            processed = 1
        except Exception as e:
            logger.error(f"Error assessing notice {event['notice_id']}: {e}")
            errors.append({'notice_id': event['notice_id'], 'error': str(e)})

    # Handle DynamoDB stream events
    elif 'Records' in event:
        for record in event['Records']:
            if record.get('eventName') in ('INSERT', 'MODIFY'):
                try:
                    new_image = record.get('dynamodb', {}).get('NewImage', {})
                    user_id = new_image.get('user_id', {}).get('S', '')
                    notice_id = new_image.get('notice_id', {}).get('S', '')
                    if user_id and notice_id:
                        assess_single_notice(user_id, notice_id)
                        processed += 1
                except Exception as e:
                    logger.error(f'Error processing stream record: {e}')
                    errors.append({'error': str(e)})

    # Handle batch re-assessment (EventBridge scheduled)
    else:
        processed, errors = reassess_all_notices()

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed,
            'errors': errors,
            'timestamp': datetime.utcnow().isoformat(),
        }),
    }


def assess_single_notice(user_id: str, notice_id: str) -> None:
    """Assess risk for a single compliance notice."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    response = table.get_item(Key={'user_id': user_id, 'notice_id': notice_id})

    if 'Item' not in response:
        logger.warning(f'Notice not found: {notice_id}')
        return

    notice = response['Item']

    if not notice.get('is_compliance_notice', False):
        return

    # Calculate risk
    risk_score, risk_level, risk_factors = calculate_risk(user_id, notice)
    old_risk_level = notice.get('risk_level', 'Low')

    # Update notice with risk data
    table.update_item(
        Key={'user_id': user_id, 'notice_id': notice_id},
        UpdateExpression='SET risk_level = :rl, risk_score = :rs, risk_factors = :rf, updated_at = :ts',
        ExpressionAttributeValues={
            ':rl': risk_level,
            ':rs': risk_score,
            ':rf': risk_factors,
            ':ts': datetime.utcnow().isoformat(),
        },
    )

    logger.info(f'Notice {notice_id}: risk_level={risk_level}, risk_score={risk_score}')

    # Trigger immediate notification for Critical
    if risk_level == 'Critical':
        trigger_notification(user_id, notice_id, risk_level, notice)

    # Trigger notification if risk escalated
    if risk_level != old_risk_level and _risk_rank(risk_level) > _risk_rank(old_risk_level):
        trigger_notification(user_id, notice_id, risk_level, notice)


def calculate_risk(user_id: str, notice: Dict) -> tuple:
    """
    Calculate risk score, level, and factors.

    Algorithm:
    1. Deadline proximity: +40 (≤7d), +30 (≤14d), +20 (≤30d), +10 (>30d)
    2. Penalty severity: +30 (≥₹1L), +20 (≥₹50K), +10 (≥₹10K), +5 (other)
    3. Category weight: multiply by category factor
    4. History: +15 missed deadlines, +10 repeat violations
    5. Critical ≥70, High ≥50, Medium ≥30, Low <30
    """
    score = 0
    factors = []

    # 1. Deadline proximity
    min_days = get_min_days_until_deadline(notice)
    if min_days is not None:
        if min_days <= 7:
            score += 40
            factors.append(f'Deadline in {min_days} days (≤7)')
        elif min_days <= 14:
            score += 30
            factors.append(f'Deadline in {min_days} days (≤14)')
        elif min_days <= 30:
            score += 20
            factors.append(f'Deadline in {min_days} days (≤30)')
        else:
            score += 10
            factors.append(f'Deadline in {min_days} days (>30)')

    # 2. Penalty severity
    penalty_amount = get_penalty_amount(notice)
    if penalty_amount is not None:
        if penalty_amount >= 100000:
            score += 30
            factors.append(f'Penalty ≥₹1,00,000 ({penalty_amount})')
        elif penalty_amount >= 50000:
            score += 20
            factors.append(f'Penalty ≥₹50,000 ({penalty_amount})')
        elif penalty_amount >= 10000:
            score += 10
            factors.append(f'Penalty ≥₹10,000 ({penalty_amount})')
        else:
            score += 5
            factors.append(f'Penalty <₹10,000 ({penalty_amount})')

    # 3. Category weight
    category = notice.get('compliance_category', 'Other')
    weight = CATEGORY_WEIGHTS.get(category, 1.0)
    score = int(score * weight)
    if weight > 1.0:
        factors.append(f'Category weight: {category} ({weight}x)')

    # 4. Compliance history
    history = get_compliance_history(user_id)
    if history.get('has_missed_deadlines'):
        score += 15
        factors.append('Has missed deadlines previously')
    if history.get('is_repeat_violation'):
        score += 10
        factors.append('Repeat violation detected')

    # 5. Determine risk level
    if score >= RISK_THRESHOLDS['Critical']:
        risk_level = 'Critical'
    elif score >= RISK_THRESHOLDS['High']:
        risk_level = 'High'
    elif score >= RISK_THRESHOLDS['Medium']:
        risk_level = 'Medium'
    else:
        risk_level = 'Low'

    return score, risk_level, factors


def get_min_days_until_deadline(notice: Dict) -> Optional[int]:
    """Get minimum days until any deadline in the notice."""
    deadlines = notice.get('deadlines', [])
    today = date.today()
    min_days = None

    for dl in deadlines:
        if dl.get('type') == 'deadline' and dl.get('date'):
            try:
                dl_date = date.fromisoformat(dl['date'])
                days = (dl_date - today).days
                if min_days is None or days < min_days:
                    min_days = days
            except (ValueError, TypeError):
                continue

    return min_days


def get_penalty_amount(notice: Dict) -> Optional[float]:
    """Extract penalty amount from notice."""
    penalties = notice.get('penalties')
    if penalties and isinstance(penalties, dict):
        return penalties.get('amount')
    return None


def get_compliance_history(user_id: str) -> Dict:
    """Check user's compliance history for missed deadlines and repeat violations."""
    table = dynamodb.Table(COMPLIANCE_TABLE)

    try:
        response = table.query(
            KeyConditionExpression='user_id = :uid',
            ExpressionAttributeValues={':uid': user_id},
        )

        items = response.get('Items', [])
        missed = any(i.get('status') == 'expired' for i in items)
        # Check for repeat violations of the same type
        categories = [i.get('compliance_category') for i in items if i.get('status') == 'expired']
        repeat = len(categories) != len(set(categories))

        return {
            'has_missed_deadlines': missed,
            'is_repeat_violation': repeat,
        }
    except Exception as e:
        logger.warning(f'Could not fetch compliance history: {e}')
        return {'has_missed_deadlines': False, 'is_repeat_violation': False}


def trigger_notification(user_id: str, notice_id: str, risk_level: str, notice: Dict) -> None:
    """Trigger notification via SNS for high-priority notices."""
    if not NOTIFICATION_TOPIC_ARN:
        logger.warning('NOTIFICATION_TOPIC_ARN not set, skipping notification')
        return

    message = {
        'type': 'risk_assessment',
        'user_id': user_id,
        'notice_id': notice_id,
        'risk_level': risk_level,
        'subject': notice.get('subject', ''),
        'compliance_category': notice.get('compliance_category', ''),
        'issuing_authority': notice.get('issuing_authority', ''),
        'deadlines': notice.get('deadlines', []),
        'timestamp': datetime.utcnow().isoformat(),
    }

    sns_client.publish(
        TopicArn=NOTIFICATION_TOPIC_ARN,
        Message=json.dumps(message),
        Subject=f'[{risk_level}] Compliance Alert - {notice.get("compliance_category", "Notice")}',
    )


def reassess_all_notices() -> tuple:
    """Re-assess all pending/active notices (for scheduled runs)."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    processed = 0
    errors = []

    response = table.scan(
        FilterExpression='#s IN (:p, :a) AND is_compliance_notice = :t',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={
            ':p': 'pending',
            ':a': 'acknowledged',
            ':t': True,
        },
    )

    for item in response.get('Items', []):
        try:
            assess_single_notice(item['user_id'], item['notice_id'])
            processed += 1
        except Exception as e:
            errors.append({'notice_id': item.get('notice_id'), 'error': str(e)})

    return processed, errors


def _risk_rank(level: str) -> int:
    """Convert risk level to numeric rank for comparison."""
    return {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}.get(level, 0)
