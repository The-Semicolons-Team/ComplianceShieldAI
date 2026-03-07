import { create } from 'zustand';
import axios from 'axios';

interface Deadline {
  date: string;
  type: string;
  description: string;
  is_mandatory?: boolean;
}

interface Penalty {
  type: string;
  amount: string;
  description: string;
}

interface ComplianceNotice {
  user_id: string;
  notice_id: string;
  email_id?: string;
  source?: string;
  subject: string;
  sender?: string;
  received_date?: string;
  email_received_at?: string;
  is_compliance_notice?: boolean;
  compliance_type: string;
  compliance_category: string;
  issuing_authority: string;
  reference_number: string;
  deadlines: Deadline[];
  required_actions: string[];
  penalties?: Penalty;
  applicable_regulations: string[];
  keywords: string[];
  risk_level: string;
  risk_score: number;
  risk_factors?: string[];
  status: 'pending' | 'acknowledged' | 'completed' | 'overdue' | 'expired';
  acknowledged_by?: string;
  acknowledged_at?: string;
  notes?: string;
  notification_sent: boolean;
  last_notification_sent?: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  total_notices: number;
  by_risk_level: Record<string, number>;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  upcoming_deadlines: number;
  overdue: number;
}

interface DeadlineItem {
  notice_id: string;
  subject: string;
  compliance_category: string;
  risk_level: string;
  deadline_date: string;
  deadline_type: string;
  deadline_description: string;
  issuing_authority: string;
  is_mandatory?: boolean;
}

interface ComplianceStore {
  notices: ComplianceNotice[];
  dashboardStats: DashboardStats | null;
  deadlines: DeadlineItem[];
  loading: boolean;
  error: string | null;
  fetchNotices: (filters?: Record<string, string>) => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchDeadlines: () => Promise<void>;
  acknowledgeNotice: (noticeId: string, notes?: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const useComplianceStore = create<ComplianceStore>((set, get) => ({
  notices: [],
  dashboardStats: null,
  deadlines: [],
  loading: false,
  error: null,

  fetchNotices: async (filters?: Record<string, string>) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters || {});
      const url = `${API_URL}/notices${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url, {
        headers: { 'X-User-Id': 'demo-user' },
      });
      set({ notices: response.data.notices || [], loading: false });
    } catch (error: any) {
      console.error('Failed to fetch notices:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchDashboardStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { 'X-User-Id': 'demo-user' },
      });
      set({ dashboardStats: response.data });
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  },

  fetchDeadlines: async () => {
    try {
      const response = await axios.get(`${API_URL}/deadlines`, {
        headers: { 'X-User-Id': 'demo-user' },
      });
      set({ deadlines: response.data.deadlines || [] });
    } catch (error: any) {
      console.error('Failed to fetch deadlines:', error);
    }
  },

  acknowledgeNotice: async (noticeId: string, notes?: string) => {
    try {
      await axios.post(
        `${API_URL}/notices/${noticeId}/acknowledge`,
        { notes },
        { headers: { 'X-User-Id': 'demo-user' } }
      );
      // Update local state after successful API call
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
      // Refresh stats
      get().fetchDashboardStats();
    } catch (error: any) {
      console.error('Failed to acknowledge notice:', error);
      throw error;
    }
  },
}));
