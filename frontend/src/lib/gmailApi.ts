/**
 * Gmail API Client for Compliance Email Scanning
 * Uses the OAuth access_token stored after Google Sign-In
 */

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Indian compliance keywords to identify relevant emails
const COMPLIANCE_KEYWORDS = [
  // Tax authorities
  'GST', 'GSTIN', 'income tax', 'ITR', 'TDS', 'TCS', 'PAN',
  'challan', 'assessment', 'scrutiny', 'demand notice',
  // Regulatory bodies
  'MCA', 'ROC', 'SEBI', 'RBI', 'EPFO', 'ESIC', 'FSSAI',
  // Compliance terms
  'compliance', 'filing', 'return', 'penalty', 'notice',
  'deadline', 'due date', 'statutory', 'audit', 'regulation',
  'annual return', 'form 16', 'form 26AS', 'e-way bill',
  // Government portals
  'incometax.gov.in', 'gst.gov.in', 'mca.gov.in', 'epfindia.gov.in',
  // Common senders
  'noreply@gst', 'incometaxindiaefiling', 'ministry of corporate',
];

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
  isComplianceRelated: boolean;
  complianceCategory: string | null;
  complianceTags: string[];
  isUnread: boolean;
}

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
}

/**
 * Get stored Gmail tokens from localStorage
 */
export function getGmailTokens(): GmailTokens | null {
  try {
    const stored = localStorage.getItem('gmail_tokens');
    if (!stored) { return null; }
    const tokens: GmailTokens = JSON.parse(stored);
    // Check if expired (with 5 min buffer)
    if (tokens.expires_at < Date.now() + 5 * 60 * 1000) {
      console.warn('Gmail access token expired or expiring soon');
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Check if user has Gmail access
 */
export function hasGmailTokens(): boolean {
  return getGmailTokens() !== null;
}

/**
 * Fetch emails from Gmail inbox
 */
export async function fetchEmails(
  maxResults: number = 20,
  query?: string
): Promise<GmailMessage[]> {
  const tokens = getGmailTokens();
  if (!tokens) {
    throw new Error('Gmail access token not available. Please sign in with Google.');
  }

  // Build search query — prioritize compliance-related emails
  const searchQuery = query || 'in:inbox';

  // List messages
  const listUrl = new URL(`${GMAIL_API_BASE}/messages`);
  listUrl.searchParams.append('maxResults', maxResults.toString());
  listUrl.searchParams.append('q', searchQuery);

  const listResponse = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!listResponse.ok) {
    const err = await listResponse.text();
    console.error('Gmail list error:', err);
    if (listResponse.status === 401) {
      // Token expired — clear stored tokens
      localStorage.removeItem('gmail_tokens');
      throw new Error('Gmail session expired. Please sign in with Google again.');
    }
    throw new Error(`Failed to fetch emails: ${listResponse.status}`);
  }

  const listData = await listResponse.json();
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch full message details (batch up to maxResults)
  const messages = await Promise.all(
    listData.messages.slice(0, maxResults).map((msg: { id: string }) =>
      fetchMessageDetail(msg.id, tokens.access_token)
    )
  );

  return messages.filter(Boolean) as GmailMessage[];
}

/**
 * Search emails specifically for compliance-related content
 */
export async function fetchComplianceEmails(maxResults: number = 20): Promise<GmailMessage[]> {
  // Build a Gmail search query for compliance topics
  const complianceQuery = COMPLIANCE_KEYWORDS.slice(0, 10).map(k => `"${k}"`).join(' OR ');
  return fetchEmails(maxResults, `in:inbox (${complianceQuery})`);
}

/**
 * Fetch a single message with full details
 */
async function fetchMessageDetail(
  messageId: string,
  accessToken: string
): Promise<GmailMessage | null> {
  try {
    const response = await fetch(
      `${GMAIL_API_BASE}/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) { return null; }

    const data = await response.json();
    return parseGmailMessage(data);
  } catch (err) {
    console.error(`Failed to fetch message ${messageId}:`, err);
    return null;
  }
}

/**
 * Parse raw Gmail API message into our format
 */
function parseGmailMessage(raw: any): GmailMessage {
  const headers = raw.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('Subject');
  const from = getHeader('From');
  const to = getHeader('To');
  const date = getHeader('Date');

  // Extract body text
  const body = extractBody(raw.payload);

  // Analyze for compliance relevance
  const fullText = `${subject} ${from} ${body} ${raw.snippet || ''}`.toLowerCase();
  const { isCompliance, category, tags } = analyzeComplianceRelevance(fullText);

  return {
    id: raw.id,
    threadId: raw.threadId,
    subject: subject || '(No Subject)',
    from,
    to,
    date,
    snippet: raw.snippet || '',
    body,
    labels: raw.labelIds || [],
    isComplianceRelated: isCompliance,
    complianceCategory: category,
    complianceTags: tags,
    isUnread: (raw.labelIds || []).includes('UNREAD'),
  };
}

/**
 * Extract text body from Gmail message payload
 */
function extractBody(payload: any): string {
  if (!payload) { return ''; }

  // Simple text/plain body
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart — look for text/plain or text/html
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to HTML stripped of tags
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        return stripHtml(html);
      }
    }
    // Recurse into nested parts
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) { return nested; }
    }
  }

  // Direct body
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return '';
}

/**
 * Decode base64url encoded string (Gmail API format)
 */
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    try {
      return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
}

/**
 * Strip HTML tags from string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000); // Limit size
}

/**
 * AI-powered compliance relevance analysis
 * Tags emails with compliance categories based on content
 */
function analyzeComplianceRelevance(text: string): {
  isCompliance: boolean;
  category: string | null;
  tags: string[];
} {
  const tags: string[] = [];
  let category: string | null = null;

  // GST related
  if (/\b(gst|gstin|gstr|e-?way\s*bill|input\s*tax\s*credit|itc)\b/i.test(text)) {
    tags.push('GST');
    category = 'GST / Indirect Tax';
  }

  // Income Tax related
  if (/\b(income\s*tax|itr|tds|tcs|form\s*16|form\s*26as|pan\s*card|challan|assessment\s*year|a\.?y\.?)\b/i.test(text)) {
    tags.push('Income Tax');
    if (!category) { category = 'Income Tax / Direct Tax'; }
  }

  // MCA / Company Law
  if (/\b(mca|roc|annual\s*return|dir-?3|adt-?1|aoc-?4|mgt-?7|company\s*law|registrar\s*of\s*companies)\b/i.test(text)) {
    tags.push('MCA');
    if (!category) { category = 'Company Law / MCA'; }
  }

  // RBI related
  if (/\b(rbi|reserve\s*bank|fema|foreign\s*exchange|ecb|liberalised\s*remittance)\b/i.test(text)) {
    tags.push('RBI');
    if (!category) { category = 'Banking / RBI'; }
  }

  // SEBI related
  if (/\b(sebi|securities|listing\s*obligation|insider\s*trading|lodr)\b/i.test(text)) {
    tags.push('SEBI');
    if (!category) { category = 'Securities / SEBI'; }
  }

  // EPFO / Labor
  if (/\b(epfo?|esi[c]?|provident\s*fund|pf\s*contribution|gratuity|labour\s*law|labor\s*law)\b/i.test(text)) {
    tags.push('EPFO');
    if (!category) { category = 'Labour / EPFO'; }
  }

  // FSSAI
  if (/\b(fssai|food\s*safety|food\s*license)\b/i.test(text)) {
    tags.push('FSSAI');
    if (!category) { category = 'Food Safety / FSSAI'; }
  }

  // General compliance
  if (/\b(compliance|statutory|penalty|notice|filing\s*deadline|due\s*date|regulatory)\b/i.test(text)) {
    tags.push('Compliance');
    if (!category) { category = 'General Compliance'; }
  }

  return {
    isCompliance: tags.length > 0,
    category,
    tags,
  };
}
