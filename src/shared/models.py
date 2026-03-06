"""
Shared Python data models for AI Compliance Monitoring System
"""
from dataclasses import dataclass, field
from typing import List, Optional, Literal
from datetime import datetime

ComplianceCategory = Literal['Tax', 'Labor', 'Environmental', 'Corporate', 'Trade', 'Other']
RiskLevel = Literal['Critical', 'High', 'Medium', 'Low']
DeadlineType = Literal['issue', 'effective', 'deadline']


@dataclass
class Deadline:
    """Represents a compliance deadline"""
    date: str  # ISO 8601 format (YYYY-MM-DD)
    type: DeadlineType
    description: str


@dataclass
class Penalty:
    """Represents monetary penalty information"""
    amount: float
    currency: str
    description: str


@dataclass
class ComplianceMetadata:
    """Complete compliance notice metadata"""
    user_id: str
    notice_id: str
    email_id: str
    subject: str
    sender: str
    received_date: str
    
    # Compliance fields
    is_compliance_notice: bool
    compliance_type: str
    compliance_category: ComplianceCategory
    issuing_authority: str
    reference_number: str
    deadlines: List[Deadline]
    required_actions: List[str]
    applicable_regulations: List[str]
    keywords: List[str]
    penalties: Optional[Penalty] = None
    
    # Risk assessment
    risk_level: RiskLevel = 'Low'
    risk_score: int = 0
    risk_factors: List[str] = field(default_factory=list)
    
    # Status
    status: str = 'pending'
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    notes: Optional[str] = None
    
    # Notification tracking
    notification_sent: bool = False
    last_notification_sent: Optional[str] = None
    
    # Timestamps
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    ttl: int = 220752000  # 7 years in seconds
    
    def to_dynamodb_item(self) -> dict:
        """Convert to DynamoDB item format"""
        item = {
            'user_id': self.user_id,
            'notice_id': self.notice_id,
            'email_id': self.email_id,
            'subject': self.subject,
            'sender': self.sender,
            'received_date': self.received_date,
            'is_compliance_notice': self.is_compliance_notice,
            'compliance_type': self.compliance_type,
            'compliance_category': self.compliance_category,
            'issuing_authority': self.issuing_authority,
            'reference_number': self.reference_number,
            'deadlines': [
                {
                    'date': d.date,
                    'type': d.type,
                    'description': d.description
                } for d in self.deadlines
            ],
            'required_actions': self.required_actions,
            'applicable_regulations': self.applicable_regulations,
            'keywords': self.keywords,
            'risk_level': self.risk_level,
            'risk_score': self.risk_score,
            'risk_factors': self.risk_factors,
            'status': self.status,
            'notification_sent': self.notification_sent,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'ttl': self.ttl
        }
        
        if self.penalties:
            item['penalties'] = {
                'amount': self.penalties.amount,
                'currency': self.penalties.currency,
                'description': self.penalties.description
            }
        
        if self.acknowledged_by:
            item['acknowledged_by'] = self.acknowledged_by
        if self.acknowledged_at:
            item['acknowledged_at'] = self.acknowledged_at
        if self.notes:
            item['notes'] = self.notes
        if self.last_notification_sent:
            item['last_notification_sent'] = self.last_notification_sent
            
        return item


@dataclass
class BedrockExtractionOutput:
    """Output from AWS Bedrock compliance extraction"""
    isComplianceNotice: bool
    complianceType: str
    issuingAuthority: str
    referenceNumber: str
    subject: str
    deadlines: List[Deadline]
    requiredActions: List[str]
    applicableRegulations: List[str]
    keywords: List[str]
    penalties: Optional[Penalty] = None


@dataclass
class RiskCalculationInput:
    """Input for risk score calculation"""
    days_until_deadline: int
    penalty_amount: Optional[float]
    compliance_category: ComplianceCategory
    has_missed_deadlines: bool
    is_repeat_violation: bool
