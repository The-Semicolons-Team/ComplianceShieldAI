'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Calendar, FileText, ArrowUp, ArrowDown, Bell, Mail, Smartphone } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useComplianceStore } from '@/store/complianceStore';
import { format, differenceInDays } from 'date-fns';

export default function DashboardOverview() {
  const { notices, loading, fetchNotices } = useComplianceStore();
  const [stats, setStats] = useState({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
    upcomingDeadlines: 0,
    acknowledged: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    if (notices.length > 0) {
      const critical = notices.filter(n => n.risk_level === 'Critical').length;
      const high = notices.filter(n => n.risk_level === 'High').length;
      const medium = notices.filter(n => n.risk_level === 'Medium').length;
      const low = notices.filter(n => n.risk_level === 'Low').length;
      const acknowledged = notices.filter(n => n.status === 'acknowledged').length;
      const pending = notices.filter(n => n.status === 'pending').length;
      
      const upcomingDeadlines = notices.filter(n => {
        const deadline = new Date(n.deadlines[0]?.date);
        const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil > 0;
      }).length;

      setStats({
        critical,
        high,
        medium,
        low,
        total: notices.length,
        upcomingDeadlines,
        acknowledged,
        pending,
      });
    }
  }, [notices]);

  const categoryData = [
    { name: 'Tax', value: notices.filter(n => n.compliance_category === 'Tax').length, color: '#0ea5e9' },
    { name: 'Labor', value: notices.filter(n => n.compliance_category === 'Labor').length, color: '#8b5cf6' },
    { name: 'Corporate', value: notices.filter(n => n.compliance_category === 'Corporate').length, color: '#ec4899' },
    { name: 'Environmental', value: notices.filter(n => n.compliance_category === 'Environmental').length, color: '#10b981' },
    { name: 'Trade', value: notices.filter(n => n.compliance_category === 'Trade').length, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  const trendData = [
    { month: 'Jan', notices: 12, critical: 2 },
    { month: 'Feb', notices: 19, critical: 4 },
    { month: 'Mar', notices: 15, critical: 3 },
    { month: 'Apr', notices: 22, critical: 5 },
    { month: 'May', notices: 18, critical: 2 },
    { month: 'Jun', notices: 25, critical: 6 },
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
              You have {stats.pending} pending compliance notices requiring attention
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
              <h3 className="text-xl font-bold text-gray-900">Compliance Trend</h3>
              <p className="text-sm text-gray-500 mt-1">Monthly notice distribution</p>
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>Last 6 months</option>
              <option>Last 12 months</option>
              <option>This year</option>
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
            {notices
              .filter(n => {
                const deadline = new Date(n.deadlines[0]?.date);
                const daysUntil = differenceInDays(deadline, new Date());
                return daysUntil <= 30 && daysUntil >= 0;
              })
              .sort((a, b) => new Date(a.deadlines[0]?.date).getTime() - new Date(b.deadlines[0]?.date).getTime())
              .slice(0, 5)
              .map((notice) => {
                const deadline = new Date(notice.deadlines[0]?.date);
                const daysUntil = differenceInDays(deadline, new Date());
                return (
                  <div key={notice.notice_id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{notice.subject}</h4>
                      <p className="text-xs text-gray-500">{format(deadline, 'EEEE, MMM dd')}</p>
                    </div>
                  </div>
                );
              })}
            {stats.upcomingDeadlines === 0 && (
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
