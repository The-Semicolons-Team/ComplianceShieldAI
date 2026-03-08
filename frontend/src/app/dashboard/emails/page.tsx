'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  Mail,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Inbox,
  Filter,
  ExternalLink,
  Sparkles,
  LogIn,
} from 'lucide-react';
import {
  fetchEmails,
  fetchComplianceEmails,
  hasGmailTokens,
  GmailMessage,
} from '@/lib/gmailApi';
import { initiateGoogleLogin } from '@/lib/googleAuth';

type FilterMode = 'all' | 'compliance' | 'unread';

export default function EmailScannerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasTokens, setHasTokens] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setHasTokens(hasGmailTokens());
  }, []);

  async function loadEmails(mode: FilterMode = filterMode) {
    setLoading(true);
    setError(null);
    setScanComplete(false);
    try {
      let result: GmailMessage[];
      if (mode === 'compliance') {
        result = await fetchComplianceEmails(25);
      } else {
        result = await fetchEmails(25, searchQuery || undefined);
      }
      setEmails(result);
      setScanComplete(true);
    } catch (err: any) {
      console.error('Failed to load emails:', err);
      setError(err.message);
      if (err.message.includes('sign in')) {
        setHasTokens(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(mode: FilterMode) {
    setFilterMode(mode);
    if (hasTokens) {
      loadEmails(mode);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (hasTokens) {
      loadEmails('all');
    }
  }

  const complianceCount = emails.filter(e => e.isComplianceRelated).length;
  const unreadCount = emails.filter(e => e.isUnread).length;

  const filteredEmails = emails.filter(email => {
    if (filterMode === 'compliance') { return email.isComplianceRelated; }
    if (filterMode === 'unread') { return email.isUnread; }
    return true;
  });

  // Group compliance emails by category
  const categoryGroups = filteredEmails
    .filter(e => e.isComplianceRelated)
    .reduce((acc, email) => {
      const cat = email.complianceCategory || 'Other';
      if (!acc[cat]) { acc[cat] = []; }
      acc[cat].push(email);
      return acc;
    }, {} as Record<string, GmailMessage[]>);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary-600" />
              AI Email Scanner
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Automatically scan your inbox for compliance-related notices and deadlines
            </p>
          </div>
          {hasTokens && (
            <button
              onClick={() => loadEmails()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning...' : 'Scan Inbox'}
            </button>
          )}
        </div>

        {/* Not connected state */}
        {!hasTokens && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Gmail</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Sign in with Google to let ComplianceShield AI scan your inbox for compliance notices,
              tax deadlines, and regulatory communications.
            </p>
            <button
              onClick={() => initiateGoogleLogin()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </button>
            <p className="text-xs text-gray-400 mt-4">
              We only request read-only access. Your emails are never stored on our servers.
            </p>
          </div>
        )}

        {/* Connected — show scanner UI */}
        {hasTokens && (
          <>
            {/* Search & Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder='Search emails (e.g. "GST notice" or "income tax")'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                  >
                    Search
                  </button>
                </form>
                <div className="flex gap-2">
                  {(['all', 'compliance', 'unread'] as FilterMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleFilterChange(mode)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterMode === mode
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {mode === 'all' && <><Inbox className="h-4 w-4 inline mr-1" />All</>}
                      {mode === 'compliance' && <><Shield className="h-4 w-4 inline mr-1" />Compliance</>}
                      {mode === 'unread' && <><Mail className="h-4 w-4 inline mr-1" />Unread</>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            {scanComplete && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Inbox className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{emails.length}</p>
                    <p className="text-xs text-gray-500">Emails Scanned</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{complianceCount}</p>
                    <p className="text-xs text-gray-500">Compliance Related</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{emails.length - complianceCount}</p>
                    <p className="text-xs text-gray-500">Non-Compliance</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Category Summary */}
            {scanComplete && Object.keys(categoryGroups).length > 0 && (
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-4">
                <h3 className="text-sm font-semibold text-primary-800 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Compliance Analysis
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categoryGroups).map(([category, msgs]) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm font-medium text-primary-700 border border-primary-200"
                    >
                      <Tag className="h-3 w-3" />
                      {category}
                      <span className="ml-1 px-1.5 py-0.5 bg-primary-100 rounded-full text-xs">
                        {msgs.length}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error scanning emails</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Scanning your inbox with AI...</p>
                <p className="text-sm text-gray-400 mt-1">Analyzing emails for compliance relevance</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && scanComplete && filteredEmails.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No emails found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filterMode === 'compliance'
                    ? 'No compliance-related emails detected. Try scanning all emails.'
                    : 'Try a different search query or filter.'}
                </p>
              </div>
            )}

            {/* Initial state — prompt to scan */}
            {!loading && !scanComplete && !error && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-gray-900 font-semibold text-lg">Ready to Scan</p>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Click &quot;Scan Inbox&quot; to let our AI analyze your emails for compliance notices,
                  tax deadlines, and regulatory communications.
                </p>
                <button
                  onClick={() => loadEmails()}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  <Search className="h-4 w-4" />
                  Start AI Scan
                </button>
              </div>
            )}

            {/* Email List */}
            {!loading && filteredEmails.length > 0 && (
              <div className="space-y-3">
                {filteredEmails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    isExpanded={expandedId === email.id}
                    onToggle={() => setExpandedId(expandedId === email.id ? null : email.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ─── Email Card Component ────────────────────────────────────────────── */

function EmailCard({
  email,
  isExpanded,
  onToggle,
}: {
  email: GmailMessage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Parse sender name from "Name <email>" format
  const senderMatch = email.from.match(/^"?([^"<]+)"?\s*<?/);
  const senderName = senderMatch?.[1]?.trim() || email.from;
  const senderEmail = email.from.match(/<([^>]+)>/)?.[1] || email.from;

  // Format date
  let dateStr = '';
  try {
    const d = new Date(email.date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      dateStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      dateStr = `${diffDays}d ago`;
    } else {
      dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  } catch {
    dateStr = email.date;
  }

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        email.isComplianceRelated
          ? 'border-orange-200 shadow-sm'
          : 'border-gray-200'
      } ${email.isUnread ? 'ring-1 ring-blue-100' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        {/* Compliance indicator */}
        <div className={`flex-shrink-0 mt-1 p-1.5 rounded-lg ${
          email.isComplianceRelated ? 'bg-orange-50' : 'bg-gray-50'
        }`}>
          {email.isComplianceRelated ? (
            <Shield className="h-4 w-4 text-orange-600" />
          ) : (
            <Mail className="h-4 w-4 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                {senderName}
              </p>
              <p className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                {email.subject}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 whitespace-nowrap">{dateStr}</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Snippet */}
          {!isExpanded && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {email.snippet}
            </p>
          )}

          {/* Tags */}
          {email.complianceTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {email.complianceTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-200"
                >
                  <Tag className="h-3 w-3 mr-0.5" />
                  {tag}
                </span>
              ))}
              {email.complianceCategory && (
                <span className="inline-flex items-center px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                  <Sparkles className="h-3 w-3 mr-0.5" />
                  {email.complianceCategory}
                </span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <div className="pt-3 space-y-3">
            {/* Email metadata */}
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-600">From:</span> {email.from}</p>
              <p><span className="font-medium text-gray-600">To:</span> {email.to}</p>
              <p><span className="font-medium text-gray-600">Date:</span> {email.date}</p>
            </div>

            {/* AI Analysis box */}
            {email.isComplianceRelated && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-800 flex items-center gap-1 mb-1">
                  <Sparkles className="h-3 w-3" />
                  AI Compliance Analysis
                </p>
                <p className="text-xs text-orange-700">
                  Category: <span className="font-semibold">{email.complianceCategory}</span>
                </p>
                <p className="text-xs text-orange-700 mt-0.5">
                  Tags: {email.complianceTags.join(', ')}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  ⚡ This email may contain important compliance information. Review carefully and track any deadlines.
                </p>
              </div>
            )}

            {/* Email body */}
            <div className="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {email.body || email.snippet || '(No content available)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
