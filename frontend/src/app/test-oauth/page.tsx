'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';

export default function TestOAuthPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConfig = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

    setResult({
      clientId: clientId || 'NOT SET',
      redirectUri: redirectUri || 'NOT SET',
      hasClientId: !!clientId,
      hasRedirectUri: !!redirectUri,
      clientIdValid: clientId?.includes('.apps.googleusercontent.com'),
      redirectUriValid: redirectUri?.includes('/auth/google/callback'),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-600 rounded-full p-3">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">OAuth Configuration Test</h1>
          <p className="text-gray-600 mt-2">Check your Google OAuth setup</p>
        </div>

        <div className="card">
          <button
            onClick={checkConfig}
            className="btn-primary w-full mb-6"
          >
            Check Configuration
          </button>

          {result && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Client ID</h3>
                <p className="text-sm font-mono break-all">{result.clientId}</p>
                <p className="text-sm mt-1">
                  {result.hasClientId ? (
                    result.clientIdValid ? (
                      <span className="text-green-600">✅ Valid</span>
                    ) : (
                      <span className="text-red-600">❌ Invalid format</span>
                    )
                  ) : (
                    <span className="text-red-600">❌ Not set</span>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Redirect URI</h3>
                <p className="text-sm font-mono break-all">{result.redirectUri}</p>
                <p className="text-sm mt-1">
                  {result.hasRedirectUri ? (
                    result.redirectUriValid ? (
                      <span className="text-green-600">✅ Valid</span>
                    ) : (
                      <span className="text-red-600">❌ Invalid format</span>
                    )
                  ) : (
                    <span className="text-red-600">❌ Not set</span>
                  )}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
                {result.hasClientId && result.hasRedirectUri && result.clientIdValid && result.redirectUriValid ? (
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">✅ Configuration looks good!</p>
                    <p>Make sure in Google Cloud Console:</p>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Authorized JavaScript origins includes: <code>http://localhost:3000</code></li>
                      <li>Authorized redirect URIs includes: <code>{result.redirectUri}</code></li>
                      <li>Gmail API is enabled</li>
                      <li>Test users are added</li>
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm text-red-800">
                    <p>❌ Configuration issues detected</p>
                    <p className="mt-2">Check your <code>.env.local</code> file</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/login" className="text-primary-600 hover:text-primary-700">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
