"""
API Handler Lambda Function (Python)
REST API endpoints for querying compliance data, managing user preferences,
handling OAuth callbacks, and live AI document analysis.
"""
import json
import os
import logging
import uuid
import base64
import time
from datetime import datetime
from typing import Dict, Any, Optional
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key, Attr

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# AWS clients
dynamodb = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime')
textract_client = boto3.client('textract')
comprehend_client = boto3.client('comprehend')
s3_client = boto3.client('s3')

# Environment
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
COMPLIANCE_TABLE = os.environ.get('COMPLIANCE_METADATA_TABLE', f'compliance-shield-{ENVIRONMENT}-compliance-metadata')
NOTIFICATION_PREFS_TABLE = os.environ.get('NOTIFICATION_PREFERENCES_TABLE', f'compliance-shield-{ENVIRONMENT}-notification-preferences')
USER_INTEGRATIONS_TABLE = os.environ.get('USER_INTEGRATIONS_TABLE', f'compliance-shield-{ENVIRONMENT}-user-integrations')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'apac.amazon.nova-pro-v1:0')
TEMP_BUCKET = os.environ.get('TEMP_ATTACHMENT_BUCKET', '')


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

        # AI Analysis endpoints (hackathon demo)
        elif path == '/test/analyze' and method == 'POST':
            return analyze_document(user_id, event)
        elif path == '/test/textract' and method == 'POST':
            return run_textract(user_id, event)

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


# ─── AI Analysis Endpoints ───

ANALYSIS_SYSTEM_PROMPT = """You are an expert in Indian government compliance notices. Analyze the given text and extract structured compliance information.

Return a valid JSON object with these fields:
{
  "isComplianceNotice": boolean,
  "complianceType": "string describing the type (e.g. GST Return Filing, Income Tax Notice, MCA Annual Return)",
  "complianceCategory": "Tax" | "Labor" | "Environmental" | "Corporate" | "Trade" | "Other",
  "issuingAuthority": "name of the government authority",
  "referenceNumber": "reference/notice number if found",
  "subject": "subject line or title of the notice",
  "summary": "2-3 sentence summary of what this notice requires",
  "deadlines": [{"date": "YYYY-MM-DD", "type": "issue|effective|deadline", "description": "what is due"}],
  "requiredActions": ["list of specific actions required"],
  "penalties": {"amount": number, "currency": "INR", "description": "penalty details"} or null,
  "applicableRegulations": ["list of referenced regulations, sections, acts"],
  "keywords": ["compliance", "related", "keywords"],
  "riskLevel": "Critical" | "High" | "Medium" | "Low",
  "riskJustification": "why this risk level was assigned"
}

If the text is NOT a compliance notice, set isComplianceNotice to false and fill other fields as empty/null.
Always respond with ONLY valid JSON, no markdown fences or explanation."""


def analyze_document(user_id: str, event: Dict) -> Dict:
    """
    Analyze a document/email text using Bedrock AI + optional Textract + Comprehend.
    Accepts: { "text": "...", "attachment": "base64...", "filename": "doc.pdf", "save": true/false }
    """
    body = parse_body(event)
    email_text = body.get('text', '')
    attachment_b64 = body.get('attachment', '')
    filename = body.get('filename', '')
    save_result = body.get('save', False)

    if not email_text and not attachment_b64:
        return error_response(400, 'Provide "text" (email body) or "attachment" (base64 document)')

    result = {
        'textract': None,
        'bedrock': None,
        'comprehend': None,
        'saved': False,
    }

    # Step 1: Textract — extract text from attachment if provided
    attachment_text = ''
    if attachment_b64 and filename:
        try:
            doc_bytes = base64.b64decode(attachment_b64)
            attachment_text = _extract_text_with_textract(doc_bytes, filename)
            result['textract'] = {
                'extracted_chars': len(attachment_text),
                'filename': filename,
                'preview': attachment_text[:500],
            }
        except Exception as e:
            logger.error(f'Textract error: {e}')
            result['textract'] = {'error': str(e)}

    # Step 2: Combine text
    combined_text = ''
    if email_text:
        combined_text = email_text
    if attachment_text:
        combined_text += f'\n\n--- Extracted from attachment ({filename}) ---\n{attachment_text}'

    if not combined_text.strip():
        return error_response(400, 'No text to analyze (email body empty and Textract found no text)')

    # Step 3: Bedrock AI analysis
    try:
        bedrock_result = _call_bedrock_analysis(combined_text)
        result['bedrock'] = bedrock_result
    except Exception as e:
        logger.error(f'Bedrock error: {e}')
        result['bedrock'] = {'error': str(e)}

    # Step 4: Comprehend entity/phrase extraction
    try:
        comprehend_result = _call_comprehend(combined_text[:100000])
        result['comprehend'] = {
            'entities': [
                {'text': e['Text'], 'type': e['Type'], 'score': round(e.get('Score', 0), 3)}
                for e in comprehend_result.get('entities', [])
                if e.get('Score', 0) > 0.8
            ][:20],
            'key_phrases': [
                p['Text'] for p in comprehend_result.get('key_phrases', [])
                if p.get('Score', 0) > 0.9
            ][:15],
        }
    except Exception as e:
        logger.error(f'Comprehend error: {e}')
        result['comprehend'] = {'error': str(e)}

    # Step 5: Optionally save to DynamoDB as a real notice
    if save_result and result.get('bedrock') and not result['bedrock'].get('error'):
        try:
            notice_id = str(uuid.uuid4())
            _save_analysis(user_id, notice_id, result['bedrock'], combined_text)
            result['saved'] = True
            result['notice_id'] = notice_id
        except Exception as e:
            logger.error(f'Save error: {e}')
            result['saved'] = False

    return success_response(result)


def run_textract(user_id: str, event: Dict) -> Dict:
    """Run Textract only on an uploaded document. Returns extracted text."""
    body = parse_body(event)
    attachment_b64 = body.get('attachment', '')
    filename = body.get('filename', 'document.pdf')

    if not attachment_b64:
        return error_response(400, 'Provide "attachment" (base64-encoded document)')

    try:
        doc_bytes = base64.b64decode(attachment_b64)
        extracted_text = _extract_text_with_textract(doc_bytes, filename)
        return success_response({
            'filename': filename,
            'extracted_chars': len(extracted_text),
            'text': extracted_text,
        })
    except Exception as e:
        logger.error(f'Textract error: {e}')
        return error_response(500, f'Textract failed: {str(e)}')


def _extract_text_with_textract(doc_bytes: bytes, filename: str) -> str:
    """Extract text from a document using Textract."""
    supported_ext = ('.pdf', '.png', '.jpg', '.jpeg', '.tiff')
    if not any(filename.lower().endswith(ext) for ext in supported_ext):
        raise ValueError(f'Unsupported file type: {filename}. Supported: {", ".join(supported_ext)}')

    if filename.lower().endswith('.pdf') and TEMP_BUCKET:
        # PDF: use async API via S3
        s3_key = f'temp-analyze/{uuid.uuid4()}/{filename}'
        s3_client.put_object(Bucket=TEMP_BUCKET, Key=s3_key, Body=doc_bytes)
        try:
            response = textract_client.start_document_text_detection(
                DocumentLocation={'S3Object': {'Bucket': TEMP_BUCKET, 'Name': s3_key}}
            )
            job_id = response['JobId']
            text_lines = []
            for _ in range(60):
                result = textract_client.get_document_text_detection(JobId=job_id)
                status = result['JobStatus']
                if status == 'SUCCEEDED':
                    for block in result.get('Blocks', []):
                        if block['BlockType'] == 'LINE':
                            text_lines.append(block['Text'])
                    # Handle pagination
                    while result.get('NextToken'):
                        result = textract_client.get_document_text_detection(
                            JobId=job_id, NextToken=result['NextToken']
                        )
                        for block in result.get('Blocks', []):
                            if block['BlockType'] == 'LINE':
                                text_lines.append(block['Text'])
                    break
                elif status == 'FAILED':
                    raise Exception(f'Textract job failed: {result.get("StatusMessage", "")}')
                time.sleep(1)
            return '\n'.join(text_lines)
        finally:
            try:
                s3_client.delete_object(Bucket=TEMP_BUCKET, Key=s3_key)
            except Exception:
                pass
    else:
        # Images: use sync API (no S3 needed)
        response = textract_client.detect_document_text(
            Document={'Bytes': doc_bytes}
        )
        text_lines = []
        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                text_lines.append(block['Text'])
        return '\n'.join(text_lines)


def _call_bedrock_analysis(text: str) -> Dict:
    """Call Amazon Bedrock (Nova Pro) for compliance analysis."""
    user_prompt = f"""Analyze the following text for Indian government compliance notices. Extract all structured compliance data.

TEXT:
{text[:15000]}"""

    request_body = json.dumps({
        'system': [{'text': ANALYSIS_SYSTEM_PROMPT}],
        'inferenceConfig': {'maxTokens': 4096},
        'messages': [{'role': 'user', 'content': [{'text': user_prompt}]}],
    })

    response = bedrock_runtime.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=request_body,
        contentType='application/json',
    )

    response_body = json.loads(response['body'].read())
    content = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '{}')

    # Parse JSON — handle potential markdown fences
    content = content.strip()
    if content.startswith('```'):
        content = content.split('\n', 1)[1] if '\n' in content else content[3:]
    if content.endswith('```'):
        content = content[:-3]
    content = content.strip()

    return json.loads(content)


def _call_comprehend(text: str) -> Dict:
    """Use Comprehend for entity and key phrase extraction."""
    try:
        entities = comprehend_client.detect_entities(Text=text[:5000], LanguageCode='en')
        key_phrases = comprehend_client.detect_key_phrases(Text=text[:5000], LanguageCode='en')
        return {
            'entities': entities.get('Entities', []),
            'key_phrases': key_phrases.get('KeyPhrases', []),
        }
    except Exception as e:
        logger.warning(f'Comprehend failed: {e}')
        return {'entities': [], 'key_phrases': []}


def _save_analysis(user_id: str, notice_id: str, bedrock_data: Dict, source_text: str) -> None:
    """Save AI analysis result as a compliance notice in DynamoDB."""
    table = dynamodb.Table(COMPLIANCE_TABLE)
    table.put_item(Item={
        'user_id': user_id,
        'notice_id': notice_id,
        'subject': bedrock_data.get('subject', 'AI-Analyzed Notice'),
        'sender': bedrock_data.get('issuingAuthority', 'Unknown'),
        'is_compliance_notice': bedrock_data.get('isComplianceNotice', True),
        'compliance_type': bedrock_data.get('complianceType', ''),
        'compliance_category': bedrock_data.get('complianceCategory', 'Other'),
        'issuing_authority': bedrock_data.get('issuingAuthority', ''),
        'reference_number': bedrock_data.get('referenceNumber', ''),
        'deadlines': bedrock_data.get('deadlines', []),
        'required_actions': bedrock_data.get('requiredActions', []),
        'applicable_regulations': bedrock_data.get('applicableRegulations', []),
        'keywords': bedrock_data.get('keywords', []),
        'penalties': bedrock_data.get('penalties'),
        'risk_level': bedrock_data.get('riskLevel', 'Medium'),
        'risk_score': 50,
        'status': 'pending',
        'notification_sent': False,
        'source': 'manual_analysis',
        'summary': bedrock_data.get('summary', ''),
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat(),
        'ttl': int(datetime.utcnow().timestamp()) + 220752000,
    })


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
