"""
API Handler Lambda Function (Python)
REST API endpoints for querying compliance data, managing user preferences,
and handling OAuth callbacks.
"""
import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key, Attr

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
COMPLIANCE_TABLE = os.environ.get('COMPLIANCE_METADATA_TABLE', f'compliance-shield-{ENVIRONMENT}-compliance-metadata')
NOTIFICATION_PREFS_TABLE = os.environ.get('NOTIFICATION_PREFERENCES_TABLE', f'compliance-shield-{ENVIRONMENT}-notification-preferences')
USER_INTEGRATIONS_TABLE = os.environ.get('USER_INTEGRATIONS_TABLE', f'compliance-shield-{ENVIRONMENT}-user-integrations')


class DecimalEncoder(json.JSONEncoder):
    """Handle DynamoDB Decimal types in JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj == int(obj) else float(obj)
        return super().default(obj)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for API Gateway requests.
    Routes requests to appropriate handlers based on path and method.
    """
    logger.info(f'API request: {event.get("httpMethod")} {event.get("path")}')

    path = event.get('path', '')
    method = event.get('httpMethod', 'GET')

    # Extract user ID from Cognito authorizer
    user_id = extract_user_id(event)

    try:
        # Route to handler
        if path == '/health':
            return success_response({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

        if not user_id:
            return error_response(401, 'Unauthorized')

        # Compliance notices
        if path == '/notices' and method == 'GET':
            return get_notices(user_id, event)
        elif path.startswith('/notices/') and method == 'GET':
            notice_id = path.split('/')[-1]
            return get_notice_detail(user_id, notice_id)
        elif path.startswith('/notices/') and path.endswith('/acknowledge') and method == 'POST':
            notice_id = path.split('/')[-2]
            return acknowledge_notice(user_id, notice_id, event)

        # Deadlines
        elif path == '/deadlines' and method == 'GET':
            return get_deadlines(user_id, event)

        # Notification preferences
        elif path == '/preferences/notifications' and method == 'GET':
            return get_notification_preferences(user_id)
        elif path == '/preferences/notifications' and method == 'PUT':
            return update_notification_preferences(user_id, event)

        # Integrations
        elif path == '/integrations' and method == 'GET':
            return get_integrations(user_id)
        elif path == '/integrations' and method == 'POST':
            return create_integration(user_id, event)

        # Dashboard stats
        elif path == '/dashboard/stats' and method == 'GET':
            return get_dashboard_stats(user_id)

        else:
            return error_response(404, f'Not found: {method} {path}')

    except Exception as e:
        logger.error(f'API error: {e}')
        return error_response(500, 'Internal server error')


def extract_user_id(event: Dict) -> Optional[str]:
    """Extract user ID from Cognito JWT authorizer."""
    auth = event.get('requestContext', {}).get('authorizer', {})
    claims = auth.get('claims', {})
    # Check Cognito claims first, then fallback to x-user-id header for demo
    user = claims.get('sub') or claims.get('cognito:username')
    if user:
        return user
    # Fallback: x-user-id header (case-insensitive header lookup)
    headers = event.get('headers', {}) or {}
    for key, val in headers.items():
        if key.lower() == 'x-user-id':
            return val
    # Demo mode: default to demo-user so API is usable without auth
    return 'demo-user'


def get_notices(user_id: str, event: Dict) -> Dict:
    """List compliance notices with optional filters."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    params = event.get('queryStringParameters') or {}

    # Query by user_id
    query_params = {
        'KeyConditionExpression': Key('user_id').eq(user_id),
    }

    # Apply filters
    filter_expressions = []
    expr_values = {}

    category = params.get('category')
    if category:
        filter_expressions.append('compliance_category = :cat')
        expr_values[':cat'] = category

    risk_level = params.get('risk_level')
    if risk_level:
        filter_expressions.append('risk_level = :rl')
        expr_values[':rl'] = risk_level

    status = params.get('status')
    if status:
        filter_expressions.append('#s = :status')
        expr_values[':status'] = status
        query_params['ExpressionAttributeNames'] = {'#s': 'status'}

    if filter_expressions:
        query_params['FilterExpression'] = ' AND '.join(filter_expressions)
        query_params['ExpressionAttributeValues'] = {
            **query_params.get('ExpressionAttributeValues', {}),
            **expr_values,
        }

    response = table.query(**query_params)
    items = response.get('Items', [])

    # Sort by risk level (Critical first), then deadline
    risk_order = {'critical': 0, 'Critical': 0, 'high': 1, 'High': 1, 'medium': 2, 'Medium': 2, 'low': 3, 'Low': 3}
    items.sort(key=lambda x: (risk_order.get(x.get('risk_level', 'Low'), 4), x.get('created_at', '')))

    return success_response({
        'notices': items,
        'count': len(items),
    })


def get_notice_detail(user_id: str, notice_id: str) -> Dict:
    """Get a single compliance notice."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    response = table.get_item(Key={'user_id': user_id, 'notice_id': notice_id})

    if 'Item' not in response:
        return error_response(404, 'Notice not found')

    return success_response(response['Item'])


def acknowledge_notice(user_id: str, notice_id: str, event: Dict) -> Dict:
    """Acknowledge a compliance notice."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    body = parse_body(event)

    table.update_item(
        Key={'user_id': user_id, 'notice_id': notice_id},
        UpdateExpression='SET #s = :s, acknowledged_by = :ab, acknowledged_at = :at, notes = :n, updated_at = :ts',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={
            ':s': 'acknowledged',
            ':ab': user_id,
            ':at': datetime.utcnow().isoformat(),
            ':n': body.get('notes', ''),
            ':ts': datetime.utcnow().isoformat(),
        },
    )

    return success_response({'message': 'Notice acknowledged', 'notice_id': notice_id})


def get_deadlines(user_id: str, event: Dict) -> Dict:
    """Get upcoming deadlines for a user."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    params = event.get('queryStringParameters') or {}

    response = table.query(
        KeyConditionExpression=Key('user_id').eq(user_id),
        FilterExpression='#s IN (:p, :a, :o)',
        ExpressionAttributeNames={'#s': 'status'},
        ExpressionAttributeValues={
            ':p': 'pending',
            ':a': 'acknowledged',
            ':o': 'overdue',
        },
    )

    deadlines = []
    for item in response.get('Items', []):
        for dl in item.get('deadlines', []):
            deadlines.append({
                'notice_id': item['notice_id'],
                'subject': item.get('subject', ''),
                'compliance_category': item.get('compliance_category', ''),
                'risk_level': item.get('risk_level', 'Low'),
                'deadline_date': dl.get('date', ''),
                'deadline_type': dl.get('type', ''),
                'deadline_description': dl.get('description', ''),
                'issuing_authority': item.get('issuing_authority', ''),
                'is_mandatory': dl.get('is_mandatory', True),
            })

    # Sort by deadline date
    deadlines.sort(key=lambda x: x.get('deadline_date', ''))

    return success_response({'deadlines': deadlines, 'count': len(deadlines)})


def get_notification_preferences(user_id: str) -> Dict:
    """Get user notification preferences."""
    table = dynamodb.Table(NOTIFICATION_PREFS_TABLE)
    response = table.get_item(Key={'user_id': user_id})

    if 'Item' not in response:
        # Return defaults
        return success_response({
            'user_id': user_id,
            'email_enabled': True,
            'sms_enabled': False,
            'whatsapp_enabled': False,
            'channel_priority': ['email'],
            'quiet_hours_enabled': False,
            'batch_non_critical': True,
        })

    return success_response(response['Item'])


def update_notification_preferences(user_id: str, event: Dict) -> Dict:
    """Update user notification preferences."""
    table = dynamodb.Table(NOTIFICATION_PREFS_TABLE)
    body = parse_body(event)

    item = {
        'user_id': user_id,
        'email_enabled': body.get('email_enabled', True),
        'sms_enabled': body.get('sms_enabled', False),
        'whatsapp_enabled': body.get('whatsapp_enabled', False),
        'phone_number': body.get('phone_number', ''),
        'whatsapp_verified': body.get('whatsapp_verified', False),
        'channel_priority': body.get('channel_priority', ['email']),
        'quiet_hours_enabled': body.get('quiet_hours_enabled', False),
        'quiet_hours_start': body.get('quiet_hours_start', '22:00'),
        'quiet_hours_end': body.get('quiet_hours_end', '07:00'),
        'quiet_hours_timezone': body.get('quiet_hours_timezone', 'Asia/Kolkata'),
        'batch_non_critical': body.get('batch_non_critical', True),
        'critical_override_quiet_hours': body.get('critical_override_quiet_hours', True),
        'updated_at': datetime.utcnow().isoformat(),
    }

    table.put_item(Item=item)
    return success_response({'message': 'Preferences updated', 'preferences': item})


def get_integrations(user_id: str) -> Dict:
    """Get user email integrations."""
    table = dynamodb.Table(USER_INTEGRATIONS_TABLE)
    response = table.query(
        KeyConditionExpression=Key('user_id').eq(user_id),
    )
    items = response.get('Items', [])
    # Remove sensitive fields
    for item in items:
        item.pop('oauth_secret_arn', None)
    return success_response({'integrations': items, 'count': len(items)})


def create_integration(user_id: str, event: Dict) -> Dict:
    """Create a new email integration (initiate OAuth)."""
    body = parse_body(event)
    provider = body.get('provider', 'gmail')

    # In production, this would initiate OAuth flow and return authorization URL
    return success_response({
        'message': 'Integration initiated',
        'provider': provider,
        'authorization_url': f'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT&scope=https://www.googleapis.com/auth/gmail.readonly&response_type=code&access_type=offline&state={user_id}',
    })


def get_dashboard_stats(user_id: str) -> Dict:
    """Get dashboard statistics for a user."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    response = table.query(
        KeyConditionExpression=Key('user_id').eq(user_id),
    )
    items = response.get('Items', [])

    # All items are compliance notices (no need to filter by is_compliance_notice)
    notices_only = items

    stats = {
        'total_notices': len(notices_only),
        'by_risk_level': {},
        'by_category': {},
        'by_status': {},
        'upcoming_deadlines': 0,
        'overdue': 0,
    }

    from datetime import date as date_cls
    today = date_cls.today()

    for item in notices_only:
        rl = item.get('risk_level', 'Low')
        stats['by_risk_level'][rl] = stats['by_risk_level'].get(rl, 0) + 1

        cat = item.get('compliance_category', 'Other')
        stats['by_category'][cat] = stats['by_category'].get(cat, 0) + 1

        status = item.get('status', 'pending')
        stats['by_status'][status] = stats['by_status'].get(status, 0) + 1

        for dl in item.get('deadlines', []):
            if dl.get('date'):
                try:
                    dl_date = date_cls.fromisoformat(dl['date'])
                    if dl_date > today:
                        stats['upcoming_deadlines'] += 1
                    elif dl_date <= today and status in ('pending', 'acknowledged', 'overdue'):
                        stats['overdue'] += 1
                except (ValueError, TypeError):
                    pass

    return success_response(stats)


# --- Utility functions ---

def parse_body(event: Dict) -> Dict:
    """Parse request body."""
    body = event.get('body', '{}')
    if isinstance(body, str):
        return json.loads(body) if body else {}
    return body or {}


def success_response(data: Any) -> Dict:
    """Create a success response."""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Id',
        },
        'body': json.dumps(data, cls=DecimalEncoder),
    }


def error_response(status_code: int, message: str) -> Dict:
    """Create an error response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps({'error': message}),
    }
