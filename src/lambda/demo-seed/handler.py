"""
Demo Seed Lambda Function
Populates DynamoDB tables with realistic Indian government compliance notices
for hackathon demo purposes. Simulates the full E2E flow output.
"""
import json
import os
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

import boto3

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

dynamodb = boto3.resource('dynamodb')


def handler(event, context):
    """Seed demo data into DynamoDB tables."""
    try:
        action = event.get('action', 'seed')
        
        if action == 'clear':
            return clear_data()
        elif action == 'seed':
            return seed_data()
        elif action == 'seed_fresh':
            clear_data()
            return seed_data()
        else:
            return {'statusCode': 400, 'body': json.dumps({'error': f'Unknown action: {action}'})}
    except Exception as e:
        logger.error(f'Demo seed error: {e}')
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}


def seed_data():
    """Populate all tables with realistic demo data."""
    env = os.environ.get('ENVIRONMENT', 'dev')
    prefix = f'compliance-shield-{env}'

    compliance_table = dynamodb.Table(f'{prefix}-compliance-metadata')
    prefs_table = dynamodb.Table(f'{prefix}-notification-preferences')
    integrations_table = dynamodb.Table(f'{prefix}-user-integrations')

    demo_user_id = 'demo-user'
    now = datetime.utcnow()

    # ─── Sample Compliance Notices ───
    notices = [
        {
            'user_id': demo_user_id,
            'notice_id': f'GST-{uuid.uuid4().hex[:8].upper()}',
            'source': 'gst@cbic.gov.in',
            'subject': 'GST Return Filing Deadline - GSTR-3B for February 2026',
            'compliance_type': 'Tax Filing',
            'compliance_category': 'GST',
            'issuing_authority': 'Central Board of Indirect Taxes and Customs (CBIC)',
            'reference_number': f'CBIC/GST/2026/{uuid.uuid4().hex[:6].upper()}',
            'risk_level': 'critical',
            'risk_score': Decimal('85'),
            'status': 'pending',
            'deadlines': [
                {
                    'type': 'filing',
                    'date': (now + timedelta(days=3)).strftime('%Y-%m-%d'),
                    'description': 'GSTR-3B filing for February 2026',
                    'is_mandatory': True,
                },
            ],
            'required_actions': [
                'File GSTR-3B return for February 2026',
                'Reconcile Input Tax Credit (ITC) claims',
                'Pay any outstanding GST liability',
                'Submit supporting documents for ITC above ₹10 lakhs',
            ],
            'penalties': {
                'type': 'Late Filing Fee + Interest',
                'amount': '₹50/day (CGST) + ₹50/day (SGST) + 18% p.a. interest on tax due',
                'description': 'Late fee capped at ₹10,000 per return. Interest calculated from due date.',
            },
            'applicable_regulations': ['CGST Act 2017 Section 39', 'CGST Rule 61'],
            'keywords': ['GST', 'GSTR-3B', 'tax filing', 'CBIC', 'indirect tax'],
            'email_received_at': (now - timedelta(hours=6)).isoformat(),
            'extracted_at': (now - timedelta(hours=5)).isoformat(),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'notification_sent': False,
            'acknowledged': False,
        },
        {
            'user_id': demo_user_id,
            'notice_id': f'MCA-{uuid.uuid4().hex[:8].upper()}',
            'source': 'compliance@mca.gov.in',
            'subject': 'Annual Return Filing - Form AOC-4 and MGT-7 Due',
            'compliance_type': 'Annual Filing',
            'compliance_category': 'Corporate',
            'issuing_authority': 'Ministry of Corporate Affairs (MCA)',
            'reference_number': f'MCA/ROC/2026/{uuid.uuid4().hex[:6].upper()}',
            'risk_level': 'high',
            'risk_score': Decimal('68'),
            'status': 'pending',
            'deadlines': [
                {
                    'type': 'filing',
                    'date': (now + timedelta(days=15)).strftime('%Y-%m-%d'),
                    'description': 'Form AOC-4 (Financial Statements) filing',
                    'is_mandatory': True,
                },
                {
                    'type': 'filing',
                    'date': (now + timedelta(days=30)).strftime('%Y-%m-%d'),
                    'description': 'Form MGT-7 (Annual Return) filing',
                    'is_mandatory': True,
                },
            ],
            'required_actions': [
                'Prepare and file Form AOC-4 with financial statements',
                'File Form MGT-7 annual return',
                'Ensure board resolution for approval of financial statements',
                'Get auditor certification for AOC-4',
            ],
            'penalties': {
                'type': 'Additional Fee',
                'amount': '₹100/day per form (no maximum cap)',
                'description': 'Late filing attracts additional fee. Continued default may lead to prosecution under Section 137.',
            },
            'applicable_regulations': ['Companies Act 2013 Section 92', 'Companies Act 2013 Section 137'],
            'keywords': ['MCA', 'annual return', 'AOC-4', 'MGT-7', 'corporate compliance'],
            'email_received_at': (now - timedelta(days=2)).isoformat(),
            'extracted_at': (now - timedelta(days=2, hours=-1)).isoformat(),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'notification_sent': True,
            'acknowledged': False,
        },
        {
            'user_id': demo_user_id,
            'notice_id': f'RBI-{uuid.uuid4().hex[:8].upper()}',
            'source': 'notifications@rbi.org.in',
            'subject': 'RBI Master Direction - Updated KYC Norms for Regulated Entities',
            'compliance_type': 'Regulatory Update',
            'compliance_category': 'Banking',
            'issuing_authority': 'Reserve Bank of India (RBI)',
            'reference_number': f'RBI/2025-26/DOR/{uuid.uuid4().hex[:6].upper()}',
            'risk_level': 'medium',
            'risk_score': Decimal('42'),
            'status': 'pending',
            'deadlines': [
                {
                    'type': 'implementation',
                    'date': (now + timedelta(days=45)).strftime('%Y-%m-%d'),
                    'description': 'Implement updated Video-KYC procedures',
                    'is_mandatory': True,
                },
            ],
            'required_actions': [
                'Review updated Master Direction on KYC norms',
                'Update internal KYC policies and procedures',
                'Implement Video-KYC verification process',
                'Train compliance staff on new requirements',
                'File compliance report with RBI by deadline',
            ],
            'penalties': {
                'type': 'Monetary Penalty',
                'amount': 'Up to ₹5 crore under RBI Act Section 47A',
                'description': 'Non-compliance may result in monetary penalties, directions, or license suspension.',
            },
            'applicable_regulations': ['RBI Act 1934 Section 35A', 'PML Act 2002', 'RBI Master Direction KYC 2016'],
            'keywords': ['RBI', 'KYC', 'Master Direction', 'banking compliance', 'regulated entity'],
            'email_received_at': (now - timedelta(days=5)).isoformat(),
            'extracted_at': (now - timedelta(days=5, hours=-1)).isoformat(),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'notification_sent': True,
            'acknowledged': True,
            'acknowledged_at': (now - timedelta(days=3)).isoformat(),
            'acknowledged_by': demo_user_id,
        },
        {
            'user_id': demo_user_id,
            'notice_id': f'SEBI-{uuid.uuid4().hex[:8].upper()}',
            'source': 'circulars@sebi.gov.in',
            'subject': 'SEBI Circular - Quarterly Compliance Report Filing',
            'compliance_type': 'Periodic Filing',
            'compliance_category': 'Securities',
            'issuing_authority': 'Securities and Exchange Board of India (SEBI)',
            'reference_number': f'SEBI/HO/CFD/2026/{uuid.uuid4().hex[:6].upper()}',
            'risk_level': 'high',
            'risk_score': Decimal('72'),
            'status': 'pending',
            'deadlines': [
                {
                    'type': 'filing',
                    'date': (now + timedelta(days=7)).strftime('%Y-%m-%d'),
                    'description': 'Submit Quarterly Compliance Report',
                    'is_mandatory': True,
                },
            ],
            'required_actions': [
                'Prepare quarterly compliance report per SEBI format',
                'Board/Compliance Committee review and sign-off',
                'Submit via SEBI SCORES portal',
                'Retain records for inspection',
            ],
            'penalties': {
                'type': 'Adjudication Proceedings',
                'amount': 'Up to ₹1 crore per violation under SEBI Act',
                'description': 'Non-filing may attract adjudication proceedings, penalties, and exchange action.',
            },
            'applicable_regulations': ['SEBI Act 1992 Section 15A', 'SEBI LODR Regulations 2015'],
            'keywords': ['SEBI', 'quarterly report', 'securities compliance', 'LODR', 'listed company'],
            'email_received_at': (now - timedelta(days=1)).isoformat(),
            'extracted_at': (now - timedelta(hours=23)).isoformat(),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'notification_sent': False,
            'acknowledged': False,
        },
        {
            'user_id': demo_user_id,
            'notice_id': f'EPFO-{uuid.uuid4().hex[:8].upper()}',
            'source': 'notifications@epfindia.gov.in',
            'subject': 'EPF/ESIC Monthly Contribution Filing Reminder',
            'compliance_type': 'Monthly Filing',
            'compliance_category': 'Labour',
            'issuing_authority': 'Employees Provident Fund Organisation (EPFO)',
            'reference_number': f'EPFO/ECR/2026/{uuid.uuid4().hex[:6].upper()}',
            'risk_level': 'low',
            'risk_score': Decimal('25'),
            'status': 'completed',
            'deadlines': [
                {
                    'type': 'payment',
                    'date': (now - timedelta(days=2)).strftime('%Y-%m-%d'),
                    'description': 'EPF/ESIC contribution payment for February 2026',
                    'is_mandatory': True,
                },
            ],
            'required_actions': [
                'Upload ECR (Electronic Challan cum Return)',
                'Make EPF contribution payment via TRRN',
                'File ESIC contribution',
            ],
            'penalties': {
                'type': 'Damages',
                'amount': '5% to 25% per annum on delayed contributions',
                'description': 'Delayed deposits attract damages under Section 14B of EPF Act.',
            },
            'applicable_regulations': ['EPF Act 1952 Section 14B', 'ESI Act 1948'],
            'keywords': ['EPF', 'ESIC', 'PF contribution', 'ECR', 'labour compliance'],
            'email_received_at': (now - timedelta(days=10)).isoformat(),
            'extracted_at': (now - timedelta(days=10, hours=-1)).isoformat(),
            'created_at': (now - timedelta(days=10)).isoformat(),
            'updated_at': (now - timedelta(days=2)).isoformat(),
            'notification_sent': True,
            'acknowledged': True,
            'acknowledged_at': (now - timedelta(days=5)).isoformat(),
            'acknowledged_by': demo_user_id,
        },
        {
            'user_id': demo_user_id,
            'notice_id': f'ITD-{uuid.uuid4().hex[:8].upper()}',
            'source': 'e-filing@incometax.gov.in',
            'subject': 'Income Tax - TDS Return Filing Deadline Q4 FY 2025-26',
            'compliance_type': 'Tax Filing',
            'compliance_category': 'Income Tax',
            'issuing_authority': 'Income Tax Department, Govt of India',
            'reference_number': f'ITD/TDS/2026/{uuid.uuid4().hex[:6].upper()}',
            'risk_level': 'critical',
            'risk_score': Decimal('90'),
            'status': 'overdue',
            'deadlines': [
                {
                    'type': 'filing',
                    'date': (now - timedelta(days=1)).strftime('%Y-%m-%d'),
                    'description': 'TDS Return (Form 26Q) for Q4 FY 2025-26',
                    'is_mandatory': True,
                },
            ],
            'required_actions': [
                'File TDS Return Form 26Q on TRACES portal',
                'Verify all TDS deductions and challans',
                'Issue Form 16/16A to deductees',
                'Reconcile with 26AS statements',
            ],
            'penalties': {
                'type': 'Late Filing Fee + Penalty',
                'amount': '₹200/day under Section 234E + prosecution under Section 276B',
                'description': 'Late fee up to the amount of TDS. Non-deduction carries rigorous imprisonment up to 7 years.',
            },
            'applicable_regulations': ['Income Tax Act 1961 Section 200', 'Section 234E', 'Section 276B'],
            'keywords': ['TDS', 'income tax', 'Form 26Q', 'TRACES', 'tax deducted at source'],
            'email_received_at': (now - timedelta(days=7)).isoformat(),
            'extracted_at': (now - timedelta(days=7, hours=-1)).isoformat(),
            'created_at': (now - timedelta(days=7)).isoformat(),
            'updated_at': now.isoformat(),
            'notification_sent': True,
            'acknowledged': False,
        },
    ]

    # Write notices
    with compliance_table.batch_writer() as batch:
        for notice in notices:
            # Convert dict deadlines/penalties to JSON strings for DynamoDB
            item = {k: v for k, v in notice.items() if v is not None}
            if 'deadlines' in item:
                item['deadlines'] = json.loads(json.dumps(item['deadlines']), parse_float=Decimal)
            if 'penalties' in item:
                item['penalties'] = json.loads(json.dumps(item['penalties']), parse_float=Decimal)
            batch.put_item(Item=item)

    # ─── Notification Preferences ───
    prefs_table.put_item(Item={
        'user_id': demo_user_id,
        'email_enabled': True,
        'email_address': 'demo@complianceshieldai.in',
        'sms_enabled': False,
        'sms_number': '',
        'whatsapp_enabled': False,
        'quiet_hours_start': '22:00',
        'quiet_hours_end': '07:00',
        'risk_threshold': 'medium',
        'categories': ['GST', 'Corporate', 'Income Tax', 'Banking', 'Securities', 'Labour'],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
    })

    # ─── User Integration (simulated Gmail connection) ───
    integrations_table.put_item(Item={
        'user_id': demo_user_id,
        'provider': 'gmail',
        'status': 'connected',
        'email': 'demo@complianceshieldai.in',
        'last_sync': now.isoformat(),
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
    })

    total_notices = len(notices)
    logger.info(f'Seeded {total_notices} notices + preferences + integration for {demo_user_id}')

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': f'Demo data seeded successfully',
            'notices': total_notices,
            'user_id': demo_user_id,
            'categories': list(set(n['compliance_category'] for n in notices)),
            'risk_distribution': {
                'critical': sum(1 for n in notices if n['risk_level'] == 'critical'),
                'high': sum(1 for n in notices if n['risk_level'] == 'high'),
                'medium': sum(1 for n in notices if n['risk_level'] == 'medium'),
                'low': sum(1 for n in notices if n['risk_level'] == 'low'),
            },
        }),
    }


def clear_data():
    """Clear all demo data from tables."""
    env = os.environ.get('ENVIRONMENT', 'dev')
    prefix = f'compliance-shield-{env}'
    demo_user_id = 'demo-user'

    compliance_table = dynamodb.Table(f'{prefix}-compliance-metadata')
    prefs_table = dynamodb.Table(f'{prefix}-notification-preferences')
    integrations_table = dynamodb.Table(f'{prefix}-user-integrations')

    # Clear compliance notices
    response = compliance_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': demo_user_id},
    )
    with compliance_table.batch_writer() as batch:
        for item in response.get('Items', []):
            batch.delete_item(Key={'user_id': item['user_id'], 'notice_id': item['notice_id']})

    # Clear preferences
    try:
        prefs_table.delete_item(Key={'user_id': demo_user_id})
    except Exception:
        pass

    # Clear integrations
    try:
        integrations_table.delete_item(Key={'user_id': demo_user_id})
    except Exception:
        pass

    logger.info(f'Cleared all demo data for {demo_user_id}')
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Demo data cleared', 'user_id': demo_user_id}),
    }
