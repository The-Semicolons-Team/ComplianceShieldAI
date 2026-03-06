# AWS Amplify Deployment Checklist

Use this checklist to ensure a smooth deployment to AWS Amplify.

## Pre-Deployment Checklist

### Code Preparation
- [ ] All changes committed to git
- [ ] Code pushed to GitHub main branch
- [ ] No secrets in code (check with `git log -p | grep -i "secret\|password\|key"`)
- [ ] `.env.local` is in `.gitignore`
- [ ] `amplify.yml` is in repository root

### Google OAuth Setup
- [ ] Google Cloud Project created
- [ ] Gmail API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Test users added (for development)
- [ ] Have Client ID and Client Secret ready

### AWS Account
- [ ] AWS account created
- [ ] Billing alerts configured
- [ ] IAM user with appropriate permissions (or using root account)

## Deployment Steps

### Step 1: Create Amplify App
- [ ] Navigate to AWS Amplify Console
- [ ] Click "New app" → "Host web app"
- [ ] Connect to GitHub
- [ ] Select repository: `The-Semicolons-Team/ComplianceShieldAI`
- [ ] Select branch: `main`

### Step 2: Configure Build Settings
- [ ] Verify `amplify.yml` is detected
- [ ] Set app root to `frontend`
- [ ] Verify build command: `npm run build`
- [ ] Verify output directory: `.next`

### Step 3: Add Environment Variables
Add these in Amplify Console → App settings → Environment variables:

- [ ] `NEXT_PUBLIC_API_URL` = `https://YOUR_DOMAIN/api`
- [ ] `NEXT_PUBLIC_AWS_REGION` = `ap-south-1`
- [ ] `NEXT_PUBLIC_APP_NAME` = `ComplianceShield`
- [ ] `NEXT_PUBLIC_APP_VERSION` = `1.0.0`
- [ ] `NEXT_PUBLIC_USE_MOCK_AUTH` = `true`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `YOUR_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET` = `YOUR_CLIENT_SECRET`
- [ ] `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` = `https://YOUR_DOMAIN/auth/google/callback`

**Note**: You'll update `YOUR_DOMAIN` after first deployment

### Step 4: Deploy
- [ ] Click "Save and deploy"
- [ ] Wait for build to complete (5-10 minutes)
- [ ] Note your Amplify URL (e.g., `https://main.d123.amplifyapp.com`)

### Step 5: Update Google OAuth
- [ ] Go to Google Cloud Console → Credentials
- [ ] Click your OAuth 2.0 Client ID
- [ ] Add Amplify URL to "Authorized JavaScript origins"
- [ ] Add `https://YOUR_AMPLIFY_URL/auth/google/callback` to "Authorized redirect URIs"
- [ ] Click "SAVE"

### Step 6: Update Environment Variables
- [ ] Go back to Amplify Console
- [ ] Update `NEXT_PUBLIC_API_URL` with actual Amplify URL
- [ ] Update `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` with actual Amplify URL
- [ ] Save (this will trigger automatic redeploy)

### Step 7: Test Deployment
- [ ] Visit your Amplify URL
- [ ] Landing page loads correctly
- [ ] Click "Continue with Google"
- [ ] OAuth consent screen appears
- [ ] Grant permissions
- [ ] Redirected back to app
- [ ] Logged into dashboard
- [ ] User info displayed correctly

## Post-Deployment

### Monitoring
- [ ] Set up CloudWatch alarms
- [ ] Configure error tracking
- [ ] Set up uptime monitoring

### Security
- [ ] Enable AWS WAF (optional, for production)
- [ ] Review security headers
- [ ] Enable HTTPS (automatic with Amplify)
- [ ] Review IAM permissions

### Custom Domain (Optional)
- [ ] Purchase domain (if needed)
- [ ] Add domain in Amplify Console
- [ ] Configure DNS records
- [ ] Wait for SSL certificate
- [ ] Update Google OAuth with custom domain
- [ ] Update environment variables with custom domain

### Documentation
- [ ] Document deployment process
- [ ] Share Amplify URL with team
- [ ] Update README with deployment info
- [ ] Document environment variables

## Troubleshooting Checklist

### Build Fails
- [ ] Check build logs in Amplify Console
- [ ] Verify `package-lock.json` is committed
- [ ] Verify `amplify.yml` syntax
- [ ] Check Node.js version compatibility

### OAuth Not Working
- [ ] Verify redirect URI in Google Console matches exactly
- [ ] Check environment variables are set correctly
- [ ] Verify Client ID and Secret are correct
- [ ] Check browser console for errors

### App Not Loading
- [ ] Check Amplify deployment status
- [ ] Verify build completed successfully
- [ ] Check for 404 errors in browser console
- [ ] Verify `baseDirectory` in `amplify.yml`

## Rollback Plan

If deployment fails:
- [ ] Go to Amplify Console → Deployments
- [ ] Find last successful deployment
- [ ] Click "Redeploy this version"

Or revert in git:
```bash
git revert HEAD
git push origin main
```

## Cost Monitoring

- [ ] Set up AWS Budget alerts
- [ ] Monitor Amplify usage
- [ ] Review monthly costs
- [ ] Optimize if needed

**Estimated monthly cost**: $1-5 (within free tier for development)

## Success Criteria

Deployment is successful when:
- ✅ Build completes without errors
- ✅ App loads at Amplify URL
- ✅ Google OAuth login works
- ✅ Dashboard displays user info
- ✅ No console errors
- ✅ All pages accessible

---

**Ready to deploy!** Follow this checklist step by step. ✅
