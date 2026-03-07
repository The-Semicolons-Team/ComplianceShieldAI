'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useComplianceStore } from '@/store/complianceStore';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Building2,
  Tag,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const riskColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const statusColors: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  acknowledged: CheckCircle,
  completed: CheckCircle,
  overdue: AlertTriangle,
  expired: Clock,
};

export default function NoticesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notices, loading, error, fetchNotices, acknowledgeNotice } = useComplianceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch =
      searchQuery === '' ||
      notice.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.issuing_authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.compliance_category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'all' || notice.risk_level.toLowerCase() === riskFilter;
    const matchesStatus = statusFilter === 'all' || notice.status === statusFilter;
    return matchesSearch && matchesRisk && matchesStatus;
  });

  async function handleAcknowledge(noticeId: string) {
    setAcknowledging(noticeId);
    try {
      await acknowledgeNotice(noticeId);
    } catch (e) {
      console.error('Acknowledge failed', e);
    }
    setAcknowledging(null);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Notices</h1>
            <p className="mt-1 text-sm text-gray-500">
              {notices.length} total notices &middot; {notices.filter((n) => n.status === 'pending').length} pending action
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Notices List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => fetchNotices()}
              className="mt-3 text-sm text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notices match your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotices.map((notice) => {
              const isExpanded = expandedNotice === notice.notice_id;
              const StatusIcon = statusIcons[notice.status] || Clock;
              const nextDeadline = notice.deadlines?.[0];
              const daysUntil = nextDeadline
                ? differenceInDays(new Date(nextDeadline.date), new Date())
                : null;

              return (
                <div
                  key={notice.notice_id}
                  className={`bg-white rounded-xl shadow-sm border transition-all ${
                    notice.risk_level.toLowerCase() === 'critical'
                      ? 'border-red-200 hover:border-red-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Header */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpandedNotice(isExpanded ? null : notice.notice_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              riskColors[notice.risk_level.toLowerCase()] || riskColors.low
                            }`}
                          >
                            {notice.risk_level.toUpperCase()} ({notice.risk_score})
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[notice.status] || statusColors.pending
                            }`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {notice.status.charAt(0).toUpperCase() + notice.status.slice(1)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {notice.subject}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Building2 className="h-3.5 w-3.5 mr-1" />
                            {notice.issuing_authority}
                          </span>
                          <span className="flex items-center">
                            <Tag className="h-3.5 w-3.5 mr-1" />
                            {notice.compliance_category}
                          </span>
                          {nextDeadline && (
                            <span
                              className={`flex items-center ${
                                daysUntil !== null && daysUntil < 7 ? 'text-red-600 font-medium' : ''
                              }`}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {format(new Date(nextDeadline.date), 'MMM d, yyyy')}
                              {daysUntil !== null && (
                                <span className="ml-1">
                                  ({daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
                      {/* Required Actions */}
                      {notice.required_actions?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Required Actions</h4>
                          <ul className="space-y-1">
                            {notice.required_actions.map((action, i) => (
                              <li key={i} className="flex items-start text-sm text-gray-600">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 mr-2 flex-shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Deadlines */}
                      {notice.deadlines?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Deadlines</h4>
                          <div className="space-y-2">
                            {notice.deadlines.map((dl, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-white rounded-lg p-3 border border-gray-100">
                                <div>
                                  <span className="font-medium text-gray-900">{dl.description || dl.type}</span>
                                  {dl.is_mandatory && (
                                    <span className="ml-2 text-xs text-red-600 font-medium">Mandatory</span>
                                  )}
                                </div>
                                <span className="text-gray-500">{format(new Date(dl.date), 'MMM d, yyyy')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Penalties */}
                      {notice.penalties && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Penalties</h4>
                          <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-sm">
                            <p className="font-medium text-red-800">{notice.penalties.type}: {notice.penalties.amount}</p>
                            {notice.penalties.description && (
                              <p className="text-red-600 mt-1">{notice.penalties.description}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Applicable Regulations */}
                      {notice.applicable_regulations?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Applicable Regulations</h4>
                          <div className="flex flex-wrap gap-2">
                            {notice.applicable_regulations.map((reg, i) => (
                              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {reg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reference & Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                        <span>Ref: {notice.reference_number}</span>
                        <span>Created: {format(new Date(notice.created_at), 'MMM d, yyyy HH:mm')}</span>
                        {notice.acknowledged_at && (
                          <span>Acknowledged: {format(new Date(notice.acknowledged_at), 'MMM d, yyyy HH:mm')}</span>
                        )}
                      </div>

                      {/* Actions */}
                      {notice.status === 'pending' && (
                        <div className="pt-2">
                          <button
                            onClick={() => handleAcknowledge(notice.notice_id)}
                            disabled={acknowledging === notice.notice_id}
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                          >
                            {acknowledging === notice.notice_id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Acknowledging...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Acknowledge Notice
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
