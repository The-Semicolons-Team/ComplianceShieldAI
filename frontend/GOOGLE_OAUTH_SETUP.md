# Google OAuth Setup Guide

This guide will help you set up Google OAuth 2.0 with Gmail API access for ComplianceShield.

## Prerequisites

- Google Account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" dropdown at the top
   - Click "NEW PROJECT"
   - Enter project name: `ComplianceShield`
   - Click "CREATE"

## Step 2: Enable Gmail API

1. **Navigate to APIs & Services**
   - In the left sidebar, click "APIs & Services" → "Library"

2. **Enable Gmail API**
   - Search for "Gmail API"
   - Click on "Gmail API"
   - Click "ENABLE"

3. **Enable Google+ API** (for user info)
   - Search for "Google+ API"
   - Click on "Google+ API"
   - Click "ENABLE"

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Click "APIs & Services" → "OAuth consent screen"

2. **Choose User Type**
   - Select "External" (for testing with any Google account)
   - Click "CREATE"

3. **Fill App Information**
   - **App name**: ComplianceShield
   - **User support email**: Your email
   - **App logo**: (Optional) Upload your logo
   - **Application home page**: http://localhost:3000
   - **Application privacy policy**: http://localhost:3000/privacy
   - **Application terms of service**: http://localhost:3000/terms
   - **Authorized domains**: localhost (for development)
   - **Developer contact information**: Your email
   - Click "SAVE AND CONTINUE"

4. **Add Scopes**
   - Click "ADD OR REMOVE SCOPES"
   - Search and select these scopes:
     - `userinfo.email` - See your email address
     - `userinfo.profile` - See your personal info
     - `gmail.readonly` - Read all resources and their metadata—no write operations
   - Click "UPDATE"
   - Click "SAVE AND CONTINUE"

5. **Add Test Users** (for development)
   - Click "ADD USERS"
   - Add your Gmail addresses for testing
   - Click "ADD"
   - Click "SAVE AND CONTINUE"

6. **Review and Submit**
   - Review your settings
   - Click "BACK TO DASHBOARD"

## Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Click "APIs & Services" → "Credentials"

2. **Create OAuth Client ID**
   - Click "CREATE CREDENTIALS" → "OAuth client ID"
   - **Application type**: Web application
   - **Name**: ComplianceShield Web Client

3. **Configure Authorized URLs**
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:3001` (if using different port)
   
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback`
     - `http://localhost:3001/auth/google/callback`

4. **Create**
   - Click "CREATE"
   - **IMPORTANT**: Copy your Client ID and Client Secret
   - Keep these secure!

## Step 5: Configure Environment Variables

1. **Copy the example environment file**
   ```bash
   cd frontend
   copy .env.example .env.local
   ```

2. **Update `.env.local` with your credentials**
   ```env
   # Google OAuth Configuration
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```

3. **Save the file**

## Step 6: Test the Integration

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Navigate to login page**
   - Open: http://localhost:3000/login

3. **Click "Continue with Google"**
   - You'll be redirected to Google's consent screen
   - Review the permissions requested:
     - ✅ View your email address
     - ✅ View your basic profile info
     - ✅ Read your Gmail messages (read-only)

4. **Grant Permissions**
   - Click "Continue" or "Allow"
   - You'll be redirected back to the application
   - You should be logged in and redirected to the dashboard

## What Permissions Are Requested?

### 1. **Email & Profile** (`userinfo.email`, `userinfo.profile`)
   - **Purpose**: Identify the user and create their account
   - **Access**: Read-only
   - **Data**: Email address, name, profile picture

### 2. **Gmail Read-Only** (`gmail.readonly`)
   - **Purpose**: Monitor government compliance emails
   - **Access**: Read-only (cannot send, delete, or modify emails)
   - **Data**: Email subject, sender, body, attachments
   - **Filtering**: Only emails from government domains (.gov.in, .nic.in)

## Security & Privacy

### Data Handling
- ✅ **Read-only access**: Cannot modify or delete emails
- ✅ **Filtered access**: Only government domain emails are processed
- ✅ **Metadata only**: Only compliance-related data is stored
- ✅ **Encrypted storage**: OAuth tokens encrypted with AWS KMS
- ✅ **Automatic rotation**: Tokens refreshed automatically
- ✅ **Revocable**: Users can revoke access anytime

### Token Storage
- Access tokens stored securely in backend
- Refresh tokens encrypted with AWS KMS
- Tokens stored in AWS Secrets Manager
- Automatic rotation every 45 days

### User Control
Users can revoke access at any time:
1. Go to: https://myaccount.google.com/permissions
2. Find "ComplianceShield"
3. Click "Remove Access"

## Production Deployment

### For Production Use:

1. **Verify Your App**
   - Submit your app for Google verification
   - Required for production use with external users
   - Process takes 1-2 weeks

2. **Update OAuth Consent Screen**
   - Change from "Testing" to "In Production"
   - Add production domain to authorized domains

3. **Update Redirect URIs**
   - Add production URLs:
     - `https://yourdomain.com`
     - `https://yourdomain.com/auth/google/callback`

4. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
   ```

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Solution**: Ensure redirect URI in code matches exactly with Google Console
- Check for trailing slashes, http vs https, port numbers

### Error: "access_denied"
- **Solution**: User cancelled the consent screen
- Or app is not verified for production use

### Error: "invalid_client"
- **Solution**: Check Client ID and Client Secret are correct
- Ensure they're properly set in `.env.local`

### Error: "unauthorized_client"
- **Solution**: Ensure OAuth consent screen is configured
- Add test users if in testing mode

## Testing Checklist

- [ ] Google Cloud Project created
- [ ] Gmail API enabled
- [ ] OAuth consent screen configured
- [ ] Test users added (for development)
- [ ] OAuth credentials created
- [ ] Redirect URIs configured
- [ ] Environment variables set
- [ ] Application starts without errors
- [ ] Google login button appears
- [ ] Clicking button redirects to Google
- [ ] Consent screen shows correct permissions
- [ ] After approval, redirects back to app
- [ ] User is logged in successfully
- [ ] Dashboard shows user information

## Support

For issues or questions:
- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- Gmail API Documentation: https://developers.google.com/gmail/api
- ComplianceShield Documentation: See README.md

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Rotate tokens regularly** (automated in production)
4. **Monitor API usage** in Google Cloud Console
5. **Implement rate limiting** to prevent abuse
6. **Log all access** for audit purposes
7. **Use HTTPS** in production
8. **Validate all tokens** server-side

## Next Steps

After setup:
1. Test the login flow thoroughly
2. Implement email monitoring backend
3. Set up AWS Lambda for email processing
4. Configure DynamoDB for metadata storage
5. Implement compliance extraction with AWS Bedrock
6. Set up notification system

---

**Last Updated**: 2026
**Version**: 1.0.0
