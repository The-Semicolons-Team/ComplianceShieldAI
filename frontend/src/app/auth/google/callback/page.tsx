'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleGoogleCallback } from '@/lib/googleAuth';
import { Shield } from 'lucide-react';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isProcessing = false;

    async function processCallback() {
      // Prevent double execution in React Strict Mode
      if (isProcessing) {
        console.log('⏭️ Skipping duplicate callback processing');
        return;
      }
      isProcessing = true;

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
          setError('Authentication cancelled or failed');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (!code || !state) {
          setError('Invalid callback parameters');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Check if already processed
        const alreadyProcessed = localStorage.getItem('oauth_processing');
        if (alreadyProcessed) {
          console.log('✅ OAuth already processed, redirecting to dashboard...');
          router.push('/dashboard');
          return;
        }

        // Mark as processing
        localStorage.setItem('oauth_processing', 'true');

        // Exchange code for tokens
        const result = await handleGoogleCallback(code, state);

        console.log('OAuth callback successful:', {
          userId: result.user.userId,
          email: result.user.email,
          hasRefreshToken: !!result.tokens.refresh_token,
          scopes: result.tokens.scope,
        });

        // Store user data
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('gmail_access', 'true');
        
        // Clear processing flag
        localStorage.removeItem('oauth_processing');

        // Full page redirect to dashboard (not client-side router.push)
        // This forces AuthProvider to remount and re-read the updated localStorage
        window.location.href = '/dashboard';
      } catch (err: any) {
        console.error('Google callback error:', err);
        localStorage.removeItem('oauth_processing');
        setError(err.message || 'Authentication failed');
        setTimeout(() => router.push('/login'), 3000);
      }
    }

    processCallback();
  }, [searchParams, router]);

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
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
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
