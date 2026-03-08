'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleGoogleCallback } from '@/lib/googleAuth';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    async function processCallback() {
      // Prevent double execution in React Strict Mode
      if (processingRef.current) {
        return;
      }
      processingRef.current = true;

      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        console.log('OAuth callback received:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!errorParam,
          error: errorParam,
        });

        if (errorParam) {
          setError(`Google returned error: ${errorParam}`);
          return;
        }

        if (!code || !state) {
          setError('Invalid callback parameters — missing code or state');
          return;
        }

        // Exchange code for tokens
        const result = await handleGoogleCallback(code, state);

        console.log('OAuth callback successful:', {
          userId: result.user.userId,
          email: result.user.email,
          hasRefreshToken: !!result.tokens.refresh_token,
          scopes: result.tokens.scope,
        });

        // Store Gmail tokens for email scanning feature
        if (result.tokens?.access_token) {
          localStorage.setItem('gmail_tokens', JSON.stringify({
            access_token: result.tokens.access_token,
            refresh_token: result.tokens.refresh_token,
            expires_at: Date.now() + (result.tokens.expires_in || 3600) * 1000,
            scope: result.tokens.scope,
          }));
          localStorage.setItem('gmail_access', 'true');
        }

        // Update AuthContext directly — this sets the user in-memory AND persists to localStorage
        loginWithGoogle({
          userId: result.user.userId,
          email: result.user.email,
          name: result.user.name,
        });

        // Navigate to dashboard — works because AuthContext user is already set
        router.push('/dashboard');
      } catch (err: any) {
        console.error('Google callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    }

    processCallback();
  }, [searchParams, router, loginWithGoogle]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-600 rounded-full p-4">
            <Shield className="h-12 w-12 text-white" />
          </div>
        </div>

        {error ? (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Failed</h1>
            <p className="text-red-600 mb-4 text-sm font-mono break-all bg-red-50 p-3 rounded">{error}</p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Login
            </a>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Completing Sign In</h1>
            <p className="text-gray-600 mb-6">Please wait while we set up your account...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-600 rounded-full p-4">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
