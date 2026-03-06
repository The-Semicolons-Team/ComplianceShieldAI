# Google OAuth Testing Guide

Your Google OAuth credentials have been configured! Here's how to test the integration.

## Configuration Summary

✅ **Client ID**: `YOUR_CLIENT_ID.apps.googleusercontent.com`
✅ **Project ID**: `complianceshieldai`
✅ **Redirect URI**: `http://localhost:3000/auth/google/callback`
✅ **Environment Variables**: Configured in `frontend/.env.local`
✅ **Dev Server**: Running at http://localhost:3000

## Important: Verify Google Cloud Console Settings

Before testing, make sure you've completed these steps in Google Cloud Console:

### 1. Enable Required APIs
- [ ] Gmail API is enabled
- [ ] Google+ API (or People API) is enabled

### 2. OAuth Consent Screen
- [ ] User Type: External
- [ ] App name: ComplianceShield (or your preferred name)
- [ ] Scopes added:
  - `userinfo.email`
  - `userinfo.profile`
  - `gmail.readonly`
- [ ] Test users added (your Gmail address)

### 3. OAuth Credentials
- [ ] Authorized JavaScript origins includes: `http://localhost:3000`
- [ ] Authorized redirect URIs includes: `http://localhost:3000/auth/google/callback`

## Testing Steps

### Step 1: Open the Login Page
1. Open your browser
2. Navigate to: http://localhost:3000/login
3. You should see the login page with a "Continue with Google" button

### Step 2: Click "Continue with Google"
1. Click the "Continue with Google" button
2. You'll be redirected to Google's consent screen

### Step 3: Grant Permissions
You'll see a consent screen asking for:
- ✅ View your email address
- ✅ View your basic profile info
- ✅ Read your Gmail messages (read-only)

**Important**: If you see an error like "This app isn't verified", click "Advanced" → "Go to ComplianceShield (unsafe)" - this is normal for development apps.

### Step 4: Verify Success
After granting permissions:
1. You'll be redirected to: `http://localhost:3000/auth/google/callback`
2. You'll see a "Completing Sign In" message
3. Then you'll be redirected to: `http://localhost:3000/dashboard`
4. You should be logged in and see your dashboard

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console

**Solution**:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", make sure you have EXACTLY:
   ```
   http://localhost:3000/auth/google/callback
   ```
   (No trailing slash, no extra spaces)

### Error: "access_denied"
**Problem**: User cancelled the consent screen or app is not verified

**Solution**:
- If you cancelled, try again
- If app is not verified, click "Advanced" → "Go to ComplianceShield (unsafe)"

### Error: "invalid_client"
**Problem**: Client ID or Client Secret is incorrect

**Solution**:
1. Check `frontend/.env.local` has the correct values
2. Restart the dev server: Stop and run `npm run dev` again

### Error: "unauthorized_client"
**Problem**: OAuth consent screen not configured or test users not added

**Solution**:
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Make sure it's configured and published (or in Testing mode)
3. Add your Gmail address to test users

### Error: "This app isn't verified"
**Problem**: Your app is in testing mode (normal for development)

**Solution**:
- Click "Advanced" at the bottom
- Click "Go to ComplianceShield (unsafe)"
- This is safe because it's your own app

## What Happens After Login?

Once logged in:
1. Your user info is stored in `localStorage`
2. A flag `gmail_access` is set to `true`
3. You're redirected to the dashboard
4. The dashboard shows your profile information

## Next Steps

After successful login:
1. ✅ OAuth flow is working
2. ✅ Gmail access is granted
3. 🔄 Next: Implement backend email monitoring (Task 4 in implementation plan)
4. 🔄 Next: Set up AWS Lambda for email processing
5. 🔄 Next: Implement compliance extraction with AI

## Security Notes

- ✅ Client Secret is stored server-side only (not exposed to browser)
- ✅ CSRF protection with state parameter
- ✅ Tokens are exchanged server-side
- ✅ Read-only Gmail access (cannot modify or delete emails)
- ⚠️ In production, tokens should be stored in database, not localStorage
- ⚠️ In production, implement proper session management

## Testing Checklist

- [ ] Login page loads at http://localhost:3000/login
- [ ] "Continue with Google" button is visible
- [ ] Clicking button redirects to Google
- [ ] Consent screen shows correct permissions
- [ ] After approval, redirects back to app
- [ ] User is logged in successfully
- [ ] Dashboard shows user information
- [ ] Can see user's email and name
- [ ] `gmail_access` flag is set

## Support

If you encounter issues:
1. Check the browser console for errors (F12)
2. Check the terminal where `npm run dev` is running
3. Verify all steps in `GOOGLE_OAUTH_SETUP.md` are completed
4. Make sure test users are added in Google Cloud Console

---

**Status**: Ready to test! 🚀
**Server**: http://localhost:3000
**Login Page**: http://localhost:3000/login
