'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  Globe,
  Shield,
  User,
  CheckCircle,
  Save,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    criticalAlerts: true,
    highAlerts: true,
    mediumAlerts: true,
    lowAlerts: false,
    reminderDays: '7',
    language: 'en',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your notification preferences and account settings
          </p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={user.name || 'Demo User'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={user.email || 'demo@complianceshield.ai'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Profile details are managed through your authentication provider
          </p>
        </div>

        {/* Notification Channels */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notification Channels</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive compliance alerts via email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.emailNotifications}
                onChange={(e) => setPrefs({ ...prefs, emailNotifications: e.target.checked })}
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-xs text-gray-500">Get critical alerts via SMS</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.smsNotifications}
                onChange={(e) => setPrefs({ ...prefs, smsNotifications: e.target.checked })}
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 text-emerald-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">WhatsApp Notifications</p>
                  <p className="text-xs text-gray-500">Receive alerts on WhatsApp</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.whatsappNotifications}
                onChange={(e) => setPrefs({ ...prefs, whatsappNotifications: e.target.checked })}
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>
          </div>
        </div>

        {/* Alert Levels */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Alert Thresholds</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Choose which risk level notices trigger notifications
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'criticalAlerts', label: 'Critical', color: 'red' },
              { key: 'highAlerts', label: 'High', color: 'orange' },
              { key: 'mediumAlerts', label: 'Medium', color: 'yellow' },
              { key: 'lowAlerts', label: 'Low', color: 'green' },
            ].map((level) => (
              <label
                key={level.key}
                className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  prefs[level.key as keyof typeof prefs]
                    ? `bg-${level.color}-50 border-${level.color}-200`
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={prefs[level.key as keyof typeof prefs] as boolean}
                  onChange={(e) => setPrefs({ ...prefs, [level.key]: e.target.checked })}
                  className="h-4 w-4 mb-2 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">{level.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Reminder Timing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder Days Before Deadline
              </label>
              <select
                value={prefs.reminderDays}
                onChange={(e) => setPrefs({ ...prefs, reminderDays: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={prefs.language}
                onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="flex items-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
