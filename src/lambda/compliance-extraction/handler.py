"""
Compliance Extraction Lambda Function (Python)
Analyzes government emails using AWS Bedrock (Claude), Textract, and Comprehend
to extract structured compliance information.
"""
import json
import os
import logging
import uuid
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

# AWS clients
bedrock_runtime = boto3.client('bedrock-runtime')
textract_client = boto3.client('textract')
comprehend_client = boto3.client('comprehend')
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Environment
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'dev')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
COMPLIANCE_TABLE = os.environ.get('COMPLIANCE_METADATA_TABLE', f'compliance-shield-{ENVIRONMENT}-compliance-metadata')
PROCESSED_EMAILS_TABLE = os.environ.get('PROCESSED_EMAILS_TABLE', f'compliance-shield-{ENVIRONMENT}-processed-emails')
TEMP_BUCKET = os.environ.get('TEMP_ATTACHMENT_BUCKET', f'compliance-shield-{ENVIRONMENT}-temp-attachments')

SYSTEM_PROMPT = """You are an expert in Indian government compliance notices. Analyze the given email content and extract structured compliance information.

You MUST return a valid JSON object with these fields:
{
  "isComplianceNotice": boolean,
  "complianceType": "string describing the type",
  "complianceCategory": "Tax" | "Labor" | "Environmental" | "Corporate" | "Trade" | "Other",
  "issuingAuthority": "name of the authority",
  "referenceNumber": "reference number if found",
  "subject": "subject of the notice",
  "deadlines": [{"date": "YYYY-MM-DD", "type": "issue|effective|deadline", "description": "string"}],
  "requiredActions": ["list of required actions"],
  "penalties": {"amount": number, "currency": "INR", "description": "string"} or null,
  "applicableRegulations": ["list of regulations"],
  "keywords": ["compliance", "related", "keywords"]
}

If the email is NOT a compliance notice, return:
{"isComplianceNotice": false, "complianceType": "", "complianceCategory": "Other", "issuingAuthority": "", "referenceNumber": "", "subject": "", "deadlines": [], "requiredActions": [], "penalties": null, "applicableRegulations": [], "keywords": []}
"""


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for compliance extraction.
    Triggered by SQS messages containing email batches.
    """
    logger.info(f'Compliance extraction started at {datetime.utcnow().isoformat()}')

    processed = 0
    errors = []

    for record in event.get('Records', []):
        try:
            body = json.loads(record['body'])
            user_id = body['userId']
            batch_id = body.get('batchId', '')
            emails = body.get('emails', [])

            for email_data in emails:
                try:
                    process_email(user_id, email_data)
                    mark_email_processed(user_id, email_data['email_id'])
                    processed += 1
                except Exception as e:
                    logger.error(f"Error processing email {email_data.get('email_id')}: {e}")
                    errors.append({
                        'email_id': email_data.get('email_id'),
                        'error': str(e),
                    })

        except Exception as e:
            logger.error(f'Error processing SQS record: {e}')
            errors.append({'record': record.get('messageId', ''), 'error': str(e)})

    result = {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed,
            'errors': errors,
            'timestamp': datetime.utcnow().isoformat(),
        }),
    }
    logger.info(f'Compliance extraction completed: {processed} emails processed')
    return result


def process_email(user_id: str, email_data: Dict) -> None:
    """Process a single email through the extraction pipeline."""
    email_id = email_data['email_id']
    subject = email_data.get('subject', '')
    sender = email_data.get('sender', '')
    date = email_data.get('date', '')
    body = email_data.get('body', '')

    # Handle attachments with Textract if present
    attachment_text = ''
    if email_data.get('has_attachments'):
        attachment_text = extract_attachment_text(email_data)

    # Combine all text for analysis
    combined_text = f"Subject: {subject}\nFrom: {sender}\nDate: {date}\n\nBody:\n{body}"
    if attachment_text:
        combined_text += f"\n\nAttachment Text:\n{attachment_text}"

    # Call Bedrock for compliance analysis
    extraction = call_bedrock(combined_text)

    # Enhance with Comprehend
    entities = call_comprehend(combined_text)
    extraction = merge_comprehend_results(extraction, entities)

    # Store in DynamoDB
    notice_id = str(uuid.uuid4())
    store_compliance_metadata(
        user_id=user_id,
        notice_id=notice_id,
        email_id=email_id,
        subject=subject,
        sender=sender,
        received_date=date,
        extraction=extraction,
    )


def call_bedrock(text: str) -> Dict:
    """Call AWS Bedrock (Claude) for compliance analysis."""
    try:
        user_prompt = f"Analyze this email for Indian government compliance notices:\n\n{text}"

        request_body = json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 4096,
            'system': SYSTEM_PROMPT,
            'messages': [
                {'role': 'user', 'content': user_prompt},
            ],
        })

        response = bedrock_runtime.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=request_body,
            contentType='application/json',
        )

        response_body = json.loads(response['body'].read())
        content = response_body.get('content', [{}])[0].get('text', '{}')

        return json.loads(content)

    except Exception as e:
        logger.error(f'Bedrock extraction failed: {e}')
        return {
            'isComplianceNotice': False,
            'complianceType': '',
            'complianceCategory': 'Other',
            'issuingAuthority': '',
            'referenceNumber': '',
            'subject': '',
            'deadlines': [],
            'requiredActions': [],
            'penalties': None,
            'applicableRegulations': [],
            'keywords': [],
        }


def extract_attachment_text(email_data: Dict) -> str:
    """Extract text from email attachments using Textract."""
    try:
        attachments = email_data.get('attachments', [])
        if not attachments:
            return ''

        attachment_text = ''
        s3 = boto3.client('s3')
        textract = boto3.client('textract')
        bucket = os.environ.get('TEMP_ATTACHMENT_BUCKET', '')

        for att in attachments:
            filename = att.get('filename', 'unknown')
            content_bytes = att.get('data', b'')
            if isinstance(content_bytes, str):
                import base64
                content_bytes = base64.b64decode(content_bytes)

            if not content_bytes or not bucket:
                continue

            # Supported Textract formats
            supported_ext = ('.pdf', '.png', '.jpg', '.jpeg', '.tiff')
            if not any(filename.lower().endswith(ext) for ext in supported_ext):
                logger.info(f'Skipping unsupported attachment type: {filename}')
                continue

            s3_key = f'temp-attachments/{uuid.uuid4()}/{filename}'
            try:
                # Upload to S3
                s3.put_object(Bucket=bucket, Key=s3_key, Body=content_bytes)

                # Call Textract
                if filename.lower().endswith('.pdf'):
                    # Use async for PDFs (multi-page)
                    textract_response = textract.start_document_text_detection(
                        DocumentLocation={'S3Object': {'Bucket': bucket, 'Name': s3_key}}
                    )
                    job_id = textract_response['JobId']
                    # Poll for completion (simplified - max 30s)
                    for _ in range(30):
                        result = textract.get_document_text_detection(JobId=job_id)
                        if result['JobStatus'] == 'SUCCEEDED':
                            for block in result.get('Blocks', []):
                                if block['BlockType'] == 'LINE':
                                    attachment_text += block['Text'] + '\n'
                            break
                        elif result['JobStatus'] == 'FAILED':
                            logger.warning(f'Textract failed for {filename}')
                            break
                        time.sleep(1)
                else:
                    # Sync API for images
                    textract_response = textract.detect_document_text(
                        Document={'S3Object': {'Bucket': bucket, 'Name': s3_key}}
                    )
                    for block in textract_response.get('Blocks', []):
                        if block['BlockType'] == 'LINE':
                            attachment_text += block['Text'] + '\n'

                logger.info(f'Extracted {len(attachment_text)} chars from {filename}')
            finally:
                # Always clean up S3
                try:
                    s3.delete_object(Bucket=bucket, Key=s3_key)
                except Exception:
                    pass

        return attachment_text
    except Exception as e:
        logger.warning(f'Textract extraction failed, continuing without: {e}')
        return ''


def call_comprehend(text: str) -> Dict:
    """Use Comprehend for entity and key phrase extraction."""
    try:
        # Truncate to Comprehend limit (100KB)
        truncated = text[:100000]

        entities_response = comprehend_client.detect_entities(
            Text=truncated,
            LanguageCode='en',
        )

        key_phrases_response = comprehend_client.detect_key_phrases(
            Text=truncated,
            LanguageCode='en',
        )

        return {
            'entities': entities_response.get('Entities', []),
            'key_phrases': key_phrases_response.get('KeyPhrases', []),
        }
    except Exception as e:
        logger.warning(f'Comprehend extraction failed: {e}')
        return {'entities': [], 'key_phrases': []}


def merge_comprehend_results(extraction: Dict, comprehend_data: Dict) -> Dict:
    """Merge Comprehend results with Bedrock extraction for richer data."""
    # Add dates found by Comprehend that Bedrock might have missed
    for entity in comprehend_data.get('entities', []):
        if entity['Type'] == 'DATE' and entity.get('Score', 0) > 0.8:
            # Check if this date is already in deadlines
            date_text = entity['Text']
            existing_dates = [d.get('description', '') for d in extraction.get('deadlines', [])]
            if date_text not in existing_dates:
                extraction.setdefault('keywords', []).append(date_text)

    # Add key phrases as additional keywords
    for phrase in comprehend_data.get('key_phrases', []):
        if phrase.get('Score', 0) > 0.9:
            keyword = phrase['Text'].lower()
            if keyword not in extraction.get('keywords', []):
                extraction.setdefault('keywords', []).append(keyword)

    return extraction


def store_compliance_metadata(
    user_id: str,
    notice_id: str,
    email_id: str,
    subject: str,
    sender: str,
    received_date: str,
    extraction: Dict,
) -> None:
    """Store extracted compliance metadata in DynamoDB."""
    table = dynamodb.Table(COMPLIANCE_TABLE)

    item = {
        'user_id': user_id,
        'notice_id': notice_id,
        'email_id': email_id,
        'subject': subject,
        'sender': sender,
        'received_date': received_date,
        'is_compliance_notice': extraction.get('isComplianceNotice', False),
        'compliance_type': extraction.get('complianceType', ''),
        'compliance_category': extraction.get('complianceCategory', 'Other'),
        'issuing_authority': extraction.get('issuingAuthority', ''),
        'reference_number': extraction.get('referenceNumber', ''),
        'deadlines': extraction.get('deadlines', []),
        'required_actions': extraction.get('requiredActions', []),
        'applicable_regulations': extraction.get('applicableRegulations', []),
        'keywords': extraction.get('keywords', []),
        'risk_level': 'Low',
        'risk_score': 0,
        'status': 'pending',
        'notification_sent': False,
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat(),
        'ttl': int(datetime.utcnow().timestamp()) + 220752000,  # 7 years
    }

    penalties = extraction.get('penalties')
    if penalties:
        item['penalties'] = penalties

    table.put_item(Item=item)
    logger.info(f'Stored compliance metadata: notice_id={notice_id}, is_compliance={item["is_compliance_notice"]}')


def mark_email_processed(user_id: str, email_id: str) -> None:
    """Mark an email as processed in DynamoDB."""
    table = dynamodb.Table(PROCESSED_EMAILS_TABLE)
    table.put_item(
        Item={
            'user_id': user_id,
            'email_id': email_id,
            'processed_at': datetime.utcnow().isoformat(),
            'ttl': int(datetime.utcnow().timestamp()) + 7776000,  # 90 days
        },
    )
