'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useComplianceStore } from '@/store/complianceStore';
import {
  Bell,
  BellRing,
  AlertTriangle,
  Calendar,
  Mail,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { deadlines, notices, loading, fetchDeadlines, fetchNotices } = useComplianceStore();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchDeadlines();
    fetchNotices();
  }, [fetchDeadlines, fetchNotices]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Build notifications from deadlines and notices
  const notifications = [
    ...deadlines.map((dl) => {
      const daysUntil = differenceInDays(new Date(dl.deadline_date), new Date());
      const isOverdue = daysUntil < 0;
      return {
        id: `deadline-${dl.notice_id}-${dl.deadline_type}`,
        type: isOverdue ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
        title: dl.subject,
        message: `${dl.deadline_description || dl.deadline_type} — ${dl.issuing_authority}`,
        date: dl.deadline_date,
        daysUntil,
        category: dl.compliance_category,
        riskLevel: dl.risk_level,
      };
    }),
    ...notices
      .filter((n) => n.notification_sent)
      .map((n) => ({
        id: `sent-${n.notice_id}`,
        type: 'sent' as const,
        title: `Notification sent for: ${n.subject}`,
        message: `Last sent: ${n.last_notification_sent ? format(new Date(n.last_notification_sent), 'MMM d, yyyy HH:mm') : 'N/A'}`,
        date: n.last_notification_sent || n.created_at,
        daysUntil: 0,
        category: n.compliance_category,
        riskLevel: n.risk_level,
      })),
  ].sort((a, b) => {
    // Overdue first, then by days until deadline
    if (a.type === 'overdue' && b.type !== 'overdue') {
      return -1;
    }
    if (b.type === 'overdue' && a.type !== 'overdue') {
      return 1;
    }
    return a.daysUntil - b.daysUntil;
  });

  const typeConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
    overdue: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', label: 'Overdue' },
    urgent: { icon: BellRing, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', label: 'Due Soon' },
    upcoming: { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', label: 'Upcoming' },
    sent: { icon: Mail, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', label: 'Sent' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Deadline alerts and notification history
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">
                {notifications.filter((n) => n.type === 'overdue').length} Overdue
              </span>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center">
              <BellRing className="h-5 w-5 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-800">
                {notifications.filter((n) => n.type === 'urgent').length} Due Within 7 Days
              </span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                {notifications.filter((n) => n.type === 'upcoming').length} Upcoming
              </span>
            </div>
          </div>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">Deadline alerts will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.upcoming;
              const Icon = config.icon;
              return (
                <div
                  key={notif.id}
                  className={`rounded-xl border p-4 transition-colors ${config.bgColor}`}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {notif.title}
                        </p>
                        <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${config.color} bg-white/60`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{notif.category}</span>
                        <span className="capitalize">{notif.riskLevel} risk</span>
                        {notif.type !== 'sent' && (
                          <span className="font-medium">
                            {notif.daysUntil < 0
                              ? `${Math.abs(notif.daysUntil)} days overdue`
                              : notif.daysUntil === 0
                              ? 'Due today'
                              : `${notif.daysUntil} days left`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
