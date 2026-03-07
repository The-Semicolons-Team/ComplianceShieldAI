'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Calendar, FileText, ArrowUp, ArrowDown, Bell, Mail, Smartphone } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useComplianceStore } from '@/store/complianceStore';
import { format, differenceInDays } from 'date-fns';

export default function DashboardOverview() {
  const { notices, dashboardStats, deadlines, loading, fetchNotices, fetchDashboardStats, fetchDeadlines } = useComplianceStore();
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
    upcomingDeadlines: 0,
    acknowledged: 0,
    pending: 0,
    overdue: 0,
  });

  useEffect(() => {
    fetchNotices();
    fetchDashboardStats();
    fetchDeadlines();
  }, [fetchNotices, fetchDashboardStats, fetchDeadlines]);

  useEffect(() => {
    if (dashboardStats) {
      setStats({
        critical: dashboardStats.by_risk_level?.critical || dashboardStats.by_risk_level?.Critical || 0,
        high: dashboardStats.by_risk_level?.high || dashboardStats.by_risk_level?.High || 0,
        medium: dashboardStats.by_risk_level?.medium || dashboardStats.by_risk_level?.Medium || 0,
        low: dashboardStats.by_risk_level?.low || dashboardStats.by_risk_level?.Low || 0,
        total: dashboardStats.total_notices || 0,
        upcomingDeadlines: dashboardStats.upcoming_deadlines || 0,
        acknowledged: dashboardStats.by_status?.acknowledged || 0,
        pending: (dashboardStats.by_status?.pending || 0) + (dashboardStats.by_status?.overdue || 0),
        overdue: dashboardStats.overdue || 0,
      });
    }
  }, [dashboardStats]);

  const categoryColors: Record<string, string> = {
    'GST': '#0ea5e9',
    'Tax': '#0ea5e9',
    'Income Tax': '#6366f1',
    'Corporate': '#ec4899',
    'Banking': '#10b981',
    'Securities': '#f59e0b',
    'Labour': '#8b5cf6',
    'Labor': '#8b5cf6',
    'Environmental': '#14b8a6',
    'Trade': '#f97316',
    'Other': '#6b7280',
  };

  const categoryData = dashboardStats?.by_category
    ? Object.entries(dashboardStats.by_category)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: categoryColors[name] || '#6b7280',
        }))
    : [];

  // Use real stats for trend visualization
  const trendData = [
    { month: 'Critical', notices: stats.critical, critical: stats.critical },
    { month: 'High', notices: stats.high, critical: 0 },
    { month: 'Medium', notices: stats.medium, critical: 0 },
    { month: 'Low', notices: stats.low, critical: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
            <p className="text-primary-100 text-lg">
              You have {stats.pending} pending compliance notices
              {stats.overdue > 0 ? ` (${stats.overdue} overdue!)` : ''} requiring attention
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{stats.upcomingDeadlines}</div>
                <div className="text-sm text-primary-100 mt-1">Upcoming Deadlines</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Critical Card */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex items-center text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span>+12%</span>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{stats.critical}</div>
          <div className="text-red-100 font-medium">Critical Notices</div>
          <div className="mt-4 text-sm text-red-100">Requires immediate action</div>
        </div>

        {/* High Priority Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex items-center text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span>+8%</span>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{stats.high}</div>
          <div className="text-orange-100 font-medium">High Priority</div>
          <div className="mt-4 text-sm text-orange-100">Action needed soon</div>
        </div>

        {/* Medium Priority Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex items-center text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <ArrowDown className="h-4 w-4 mr-1" />
              <span>-3%</span>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{stats.medium}</div>
          <div className="text-blue-100 font-medium">Medium Priority</div>
          <div className="mt-4 text-sm text-blue-100">Monitor regularly</div>
        </div>

        {/* Completed Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex items-center text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span>+15%</span>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{stats.acknowledged}</div>
          <div className="text-green-100 font-medium">Acknowledged</div>
          <div className="mt-4 text-sm text-green-100">Successfully handled</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Risk Distribution</h3>
              <p className="text-sm text-gray-500 mt-1">Current notice breakdown</p>
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>Current</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorNotices" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                }}
              />
              <Area type="monotone" dataKey="notices" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorNotices)" strokeWidth={2} />
              <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Notices & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notices */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Notices</h3>
            <a href="/dashboard/notices" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
              View All
              <ArrowUp className="h-4 w-4 ml-1 rotate-45" />
            </a>
          </div>
          <div className="space-y-4">
            {notices.slice(0, 4).map((notice) => (
              <div key={notice.notice_id} className="group p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer border border-transparent hover:border-primary-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`badge-${notice.risk_level.toLowerCase()}`}>
                        {notice.risk_level}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{notice.compliance_category}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {notice.subject}
                    </h4>
                    <p className="text-xs text-gray-600">{notice.issuing_authority}</p>
                  </div>
                  <FileText className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                </div>
                <div className="flex items-center mt-3 text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {notice.deadlines[0] ? format(new Date(notice.deadlines[0].date), 'MMM dd, yyyy') : 'No deadline'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Upcoming Deadlines</h3>
            <span className="text-sm text-gray-500">Next 30 days</span>
          </div>
          <div className="space-y-3">
            {deadlines
              .filter(dl => {
                const dlDate = new Date(dl.deadline_date);
                const daysUntil = differenceInDays(dlDate, new Date());
                return daysUntil >= 0;
              })
              .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
              .slice(0, 5)
              .map((dl, idx) => {
                const dlDate = new Date(dl.deadline_date);
                const daysUntil = differenceInDays(dlDate, new Date());
                return (
                  <div key={`${dl.notice_id}-${idx}`} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      daysUntil <= 7 ? 'bg-red-100' : daysUntil <= 14 ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${
                          daysUntil <= 7 ? 'text-red-600' : daysUntil <= 14 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {daysUntil}
                        </div>
                        <div className={`text-xs ${
                          daysUntil <= 7 ? 'text-red-600' : daysUntil <= 14 ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          days
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{dl.deadline_description || dl.subject}</h4>
                      <p className="text-xs text-gray-500">{format(dlDate, 'EEEE, MMM dd')} &middot; {dl.compliance_category}</p>
                    </div>
                  </div>
                );
              })}
            {deadlines.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming deadlines</p>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all group">
            <div className="bg-primary-100 rounded-lg p-3 mr-4 group-hover:bg-primary-200 transition-colors">
              <Mail className="h-6 w-6 text-primary-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">Connect Email</div>
              <div className="text-sm text-gray-500">Add email account</div>
            </div>
          </button>
          <button className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all group">
            <div className="bg-orange-100 rounded-lg p-3 mr-4 group-hover:bg-orange-200 transition-colors">
              <Bell className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">Notifications</div>
              <div className="text-sm text-gray-500">Configure alerts</div>
            </div>
          </button>
          <button className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all group">
            <div className="bg-green-100 rounded-lg p-3 mr-4 group-hover:bg-green-200 transition-colors">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">WhatsApp</div>
              <div className="text-sm text-gray-500">Enable WhatsApp</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
