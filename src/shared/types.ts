/**
 * Shared TypeScript interfaces for AI Compliance Monitoring System
 */

export type ComplianceCategory = 'Tax' | 'Labor' | 'Environmental' | 'Corporate' | 'Trade' | 'Other';
export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type EmailProvider = 'gmail' | 'outlook';
export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export interface Deadline {
  date: string; // ISO 8601 format (YYYY-MM-DD)
  type: 'issue' | 'effective' | 'deadline';
  description: string;
}

export interface Penalty {
  amount: number;
  currency: string;
  description: string;
}

export interface ComplianceMetadata {
  user_id: string;
  notice_id: string;
  email_id: string;
  subject: string;
  sender: string;
  received_date: string;
  
  // Compliance fields
  is_compliance_notice: boolean;
  compliance_type: string;
  compliance_category: ComplianceCategory;
  issuing_authority: string;
  reference_number: string;
  deadlines: Deadline[];
  required_actions: string[];
  penalties?: Penalty;
  applicable_regulations: string[];
  keywords: string[];
  
  // Risk assessment
  risk_level: RiskLevel;
  risk_score: number;
  risk_factors: string[];
  
  // Status
  status: 'pending' | 'acknowledged' | 'completed' | 'expired';
  acknowledged_by?: string;
  acknowledged_at?: string;
  notes?: string;
  
  // Notification tracking
  notification_sent: boolean;
  last_notification_sent?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  ttl: number; // 7 years in seconds
}

export interface UserIntegration {
  user_id: string;
  provider: EmailProvider;
  email_address: string;
  connected_at: string;
  last_sync_timestamp: string;
  last_processed_email_id?: string;
  oauth_secret_arn: string;
  status: 'connected' | 'disconnected' | 'error';
  error_message?: string;
  sync_frequency_hours: number;
  filter_domains: string[];
}

export interface ProcessedEmail {
  user_id: string;
  email_id: string;
  processed_at: string;
  is_compliance_notice: boolean;
  notice_id?: string;
  ttl: number; // 90 days in seconds
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  phone_number?: string;
  whatsapp_verified: boolean;
  whatsapp_opt_in_timestamp?: string;
  channel_priority: NotificationChannel[];
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
  batch_non_critical: boolean;
  critical_override_quiet_hours: boolean;
  reminder_schedule: {
    [key in RiskLevel]: number[]; // Days before deadline
  };
}

export interface OAuthToken {
  user_id: string;
  provider: EmailProvider;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  scope: string;
}

export interface EmailBatch {
  emailIds: string[];
  userId: string;
  batchId: string;
  provider: EmailProvider;
}

export interface BedrockExtractionOutput {
  isComplianceNotice: boolean;
  complianceType: string;
  issuingAuthority: string;
  referenceNumber: string;
  subject: string;
  deadlines: Deadline[];
  requiredActions: string[];
  penalties?: Penalty;
  applicableRegulations: string[];
  keywords: string[];
}
