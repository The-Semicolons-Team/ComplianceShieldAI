import { create } from 'zustand';
import axios from 'axios';

interface Deadline {
  date: string;
  type: 'issue' | 'effective' | 'deadline';
  description: string;
}

interface Penalty {
  amount: number;
  currency: string;
  description: string;
}

interface ComplianceNotice {
  user_id: string;
  notice_id: string;
  email_id: string;
  subject: string;
  sender: string;
  received_date: string;
  is_compliance_notice: boolean;
  compliance_type: string;
  compliance_category: 'Tax' | 'Labor' | 'Environmental' | 'Corporate' | 'Trade' | 'Other';
  issuing_authority: string;
  reference_number: string;
  deadlines: Deadline[];
  required_actions: string[];
  penalties?: Penalty;
  applicable_regulations: string[];
  keywords: string[];
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
  risk_score: number;
  risk_factors: string[];
  status: 'pending' | 'acknowledged' | 'completed' | 'expired';
  acknowledged_by?: string;
  acknowledged_at?: string;
  notes?: string;
  notification_sent: boolean;
  last_notification_sent?: string;
  created_at: string;
  updated_at: string;
}

interface ComplianceStore {
  notices: ComplianceNotice[];
  loading: boolean;
  error: string | null;
  fetchNotices: () => Promise<void>;
  acknowledgeNotice: (noticeId: string, notes?: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const useComplianceStore = create<ComplianceStore>((set, get) => ({
  notices: [],
  loading: false,
  error: null,

  fetchNotices: async () => {
    set({ loading: true, error: null });
    try {
      // Mock data for development
      const mockNotices: ComplianceNotice[] = [
        {
          user_id: 'user-123',
          notice_id: 'notice-1',
          email_id: 'email-1',
          subject: 'GST Return Filing - January 2024',
          sender: 'gst@gov.in',
          received_date: '2024-02-01T10:00:00Z',
          is_compliance_notice: true,
          compliance_type: 'GST Filing',
          compliance_category: 'Tax',
          issuing_authority: 'Goods and Services Tax Department',
          reference_number: 'GST/2024/001',
          deadlines: [
            {
              date: '2024-03-15',
              type: 'deadline',
              description: 'GST Return Filing Deadline',
            },
          ],
          required_actions: ['File GST Return', 'Pay outstanding tax'],
          penalties: {
            amount: 50000,
            currency: 'INR',
            description: 'Late filing penalty',
          },
          applicable_regulations: ['GST Act 2017'],
          keywords: ['GST', 'Tax', 'Filing'],
          risk_level: 'High',
          risk_score: 65,
          risk_factors: ['Deadline within 14 days', 'Penalty amount ₹50,000'],
          status: 'pending',
          notification_sent: true,
          created_at: '2024-02-01T10:00:00Z',
          updated_at: '2024-02-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          notice_id: 'notice-2',
          email_id: 'email-2',
          subject: 'EPF Contribution Reminder',
          sender: 'epfo@gov.in',
          received_date: '2024-02-05T14:30:00Z',
          is_compliance_notice: true,
          compliance_type: 'EPF Contribution',
          compliance_category: 'Labor',
          issuing_authority: 'Employees Provident Fund Organisation',
          reference_number: 'EPF/2024/045',
          deadlines: [
            {
              date: '2024-02-20',
              type: 'deadline',
              description: 'EPF Contribution Payment',
            },
          ],
          required_actions: ['Submit EPF contribution', 'Update employee records'],
          applicable_regulations: ['EPF Act 1952'],
          keywords: ['EPF', 'Labor', 'Contribution'],
          risk_level: 'Critical',
          risk_score: 85,
          risk_factors: ['Deadline within 7 days', 'Repeat violation'],
          status: 'pending',
          notification_sent: true,
          created_at: '2024-02-05T14:30:00Z',
          updated_at: '2024-02-05T14:30:00Z',
        },
        {
          user_id: 'user-123',
          notice_id: 'notice-3',
          email_id: 'email-3',
          subject: 'Annual ROC Filing Reminder',
          sender: 'roc@mca.gov.in',
          received_date: '2024-01-20T09:00:00Z',
          is_compliance_notice: true,
          compliance_type: 'ROC Filing',
          compliance_category: 'Corporate',
          issuing_authority: 'Registrar of Companies',
          reference_number: 'ROC/2024/789',
          deadlines: [
            {
              date: '2024-04-30',
              type: 'deadline',
              description: 'Annual Return Filing',
            },
          ],
          required_actions: ['Prepare annual return', 'File with ROC'],
          penalties: {
            amount: 100000,
            currency: 'INR',
            description: 'Non-compliance penalty',
          },
          applicable_regulations: ['Companies Act 2013'],
          keywords: ['ROC', 'Annual Return', 'Corporate'],
          risk_level: 'Medium',
          risk_score: 45,
          risk_factors: ['Deadline within 30 days'],
          status: 'pending',
          notification_sent: true,
          created_at: '2024-01-20T09:00:00Z',
          updated_at: '2024-01-20T09:00:00Z',
        },
      ];

      set({ notices: mockNotices, loading: false });

      // Uncomment when API is ready
      // const response = await axios.get(`${API_URL}/compliance/notices`, {
      //   headers: {
      //     Authorization: `Bearer ${await getAccessToken()}`,
      //   },
      // });
      // set({ notices: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  acknowledgeNotice: async (noticeId: string, notes?: string) => {
    try {
      // Mock implementation
      const notices = get().notices.map((notice) =>
        notice.notice_id === noticeId
          ? {
              ...notice,
              status: 'acknowledged' as const,
              acknowledged_at: new Date().toISOString(),
              notes,
            }
          : notice
      );
      set({ notices });

      // Uncomment when API is ready
      // await axios.post(
      //   `${API_URL}/compliance/notices/${noticeId}/acknowledge`,
      //   { notes },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${await getAccessToken()}`,
      //     },
      //   }
      // );
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
