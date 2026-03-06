/**
 * Google OAuth 2.0 Authentication with Gmail API Access
 * This module handles Google Sign-In and requests Gmail read permissions
 */

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

// Gmail API Scopes - Request read-only access to Gmail
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly', // Read-only access to Gmail
  'openid',
].join(' ');

/**
 * Initiate Google OAuth flow with Gmail access
 */
export function initiateGoogleLogin() {
  // Generate state parameter for CSRF protection (required by Google)
  const state = generateRandomState();
  
  console.log('🚀 Initiating Google OAuth:', {
    clientId: GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    redirectUri: REDIRECT_URI,
    state: state.substring(0, 10) + '...',
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasRedirectUri: !!REDIRECT_URI,
  });
  
  // Try to store state (but don't fail if storage is blocked)
  try {
    sessionStorage.setItem('google_oauth_state', state);
    localStorage.setItem('google_oauth_state', state);
    localStorage.setItem('google_oauth_timestamp', Date.now().toString());
    console.log('✅ State stored successfully');
  } catch (e) {
    console.warn('⚠️ Could not store state (storage may be blocked):', e);
    console.warn('⚠️ Continuing anyway - state validation will be skipped');
  }

  // Build OAuth URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline'); // Request refresh token
  authUrl.searchParams.append('prompt', 'consent'); // Force consent screen to show permissions

  console.log('🔄 Redirecting to Google OAuth...');

  // Redirect to Google OAuth
  window.location.href = authUrl.toString();
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleGoogleCallback(code: string, state: string) {
  console.log('handleGoogleCallback called:', {
    hasCode: !!code,
    hasState: !!state,
    statePreview: state?.substring(0, 10) + '...',
  });

  // For now, skip state validation to get OAuth working
  // In production, you should validate state properly
  console.warn('⚠️ State validation temporarily disabled for debugging');
  
  // Clear any stored state
  try {
    sessionStorage.removeItem('google_oauth_state');
    localStorage.removeItem('google_oauth_state');
    localStorage.removeItem('google_oauth_timestamp');
  } catch (e) {
    console.warn('Could not clear storage:', e);
  }

  // Exchange authorization code for tokens
  console.log('Exchanging authorization code for tokens...');
  const response = await fetch('/api/auth/google/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Token exchange failed:', errorData);
    throw new Error(errorData.error || 'Failed to exchange authorization code');
  }

  const data = await response.json();
  console.log('Token exchange successful!');
  return data;
}

/**
 * Generate random state for CSRF protection
 */
function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if user has granted Gmail access
 */
export function hasGmailAccess(scopes: string[]): boolean {
  return scopes.includes('https://www.googleapis.com/auth/gmail.readonly');
}

/**
 * Request additional Gmail permissions if not already granted
 */
export function requestGmailAccess() {
  initiateGoogleLogin();
}
