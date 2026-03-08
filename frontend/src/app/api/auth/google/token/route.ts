import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to exchange Google OAuth code for tokens
 * This is a server-side endpoint to keep client secret secure
 */
export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();

    if (!code || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      console.error('Request details:', {
        code: code.substring(0, 20) + '...',
        redirect_uri,
        client_id: clientId,
      });
      // Parse and return the actual Google error for debugging
      let errorDetail = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorDetail = parsed.error_description || parsed.error || errorText;
      } catch {
        // use raw text
      }
      return NextResponse.json(
        { error: errorDetail },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user info' },
        { status: 400 }
      );
    }

    const userInfo = await userInfoResponse.json();

    // Store tokens securely (in production, store in database)
    // For now, we'll return them to be stored client-side
    // In production, you should:
    // 1. Store tokens in your database
    // 2. Create a session
    // 3. Return only session ID to client

    return NextResponse.json({
      user: {
        userId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
      },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
