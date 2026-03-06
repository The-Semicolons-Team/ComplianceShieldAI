# AWS Amplify Deployment Guide

This guide will help you deploy the ComplianceShield frontend to AWS Amplify.

## Prerequisites

- AWS Account
- GitHub repository with your code
- Google OAuth credentials configured

## Step 1: Access AWS Amplify Console

1. **Sign in to AWS Console**: https://console.aws.amazon.com/
2. **Navigate to AWS Amplify**: Search for "Amplify" in the services search bar
3. **Select Region**: Choose `ap-south-1` (Mumbai) or `ap-south-2` (Hyderabad) for India

## Step 2: Create New Amplify App

1. **Click "New app"** → **"Host web app"**
2. **Select GitHub** as your repository service
3. **Authorize AWS Amplify** to access your GitHub account
4. **Select your repository**: `The-Semicolons-Team/ComplianceShieldAI`
5. **Select branch**: `main`
6. **Click "Next"**

## Step 3: Configure Build Settings

### App Name
- **App name**: `ComplianceShield`

### Build Settings
The `amplify.yml` file in your frontend directory will be automatically detected.

**Verify the build settings**:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### Monorepo Configuration
Since your frontend is in a subdirectory:

1. **Click "Advanced settings"**
2. **Set build settings**:
   - **Build command**: `cd frontend && npm ci && npm run build`
   - **Base directory**: `frontend`
   - **Output directory**: `.next`

Or update the amplify.yml to:
```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - cd frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: frontend/.next
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
          - frontend/.next/cache/**/*
    appRoot: frontend
```

## Step 4: Configure Environment Variables

**CRITICAL**: Add these environment variables in Amplify Console:

1. **Click "Advanced settings"** (or go to App settings → Environment variables after creation)
2. **Add the following variables**:

```
NEXT_PUBLIC_API_URL=https://YOUR_AMPLIFY_DOMAIN/api
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_APP_NAME=ComplianceShield
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_USE_MOCK_AUTH=true

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://YOUR_AMPLIFY_DOMAIN/auth/google/callback
```

**Important Notes**:
- Replace `YOUR_AMPLIFY_DOMAIN` with your actual Amplify domain (you'll get this after deployment)
- Replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with your actual Google OAuth credentials
- Keep `GOOGLE_CLIENT_SECRET` secure - it's only accessible server-side

## Step 5: Deploy

1. **Review your settings**
2. **Click "Save and deploy"**
3. **Wait for deployment** (usually 5-10 minutes)

You'll see these stages:
- ✅ Provision
- ✅ Build
- ✅ Deploy
- ✅ Verify

## Step 6: Update Google OAuth Redirect URIs

After deployment, you'll get an Amplify URL like:
```
https://main.d1234567890abc.amplifyapp.com
```

**Update Google Cloud Console**:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. **Add to "Authorized JavaScript origins"**:
   ```
   https://main.d1234567890abc.amplifyapp.com
   ```

4. **Add to "Authorized redirect URIs"**:
   ```
   https://main.d1234567890abc.amplifyapp.com/auth/google/callback
   ```

5. **Click "SAVE"**

## Step 7: Update Environment Variables with Actual Domain

1. **Go to Amplify Console** → Your app → **App settings** → **Environment variables**
2. **Update these variables** with your actual Amplify domain:
   ```
   NEXT_PUBLIC_API_URL=https://main.d1234567890abc.amplifyapp.com/api
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://main.d1234567890abc.amplifyapp.com/auth/google/callback
   ```
3. **Click "Save"**
4. **Redeploy** the app (Amplify will automatically redeploy when you save env vars)

## Step 8: Configure Custom Domain (Optional)

If you have a custom domain:

1. **Go to App settings** → **Domain management**
2. **Click "Add domain"**
3. **Enter your domain**: `complianceshield.com`
4. **Configure DNS** as instructed by Amplify
5. **Wait for SSL certificate** to be provisioned (can take up to 24 hours)

Then update:
- Google OAuth redirect URIs
- Environment variables with your custom domain

## Step 9: Test Your Deployment

1. **Visit your Amplify URL**: https://main.d1234567890abc.amplifyapp.com
2. **Test the landing page**: Should load correctly
3. **Test Google OAuth**:
   - Click "Continue with Google"
   - Grant permissions
   - Should redirect back and log you in
4. **Test the dashboard**: Should display your user info

## Troubleshooting

### Build Fails

**Error**: `npm ci` fails
- **Solution**: Make sure `package-lock.json` is committed to git

**Error**: Build command not found
- **Solution**: Check that `amplify.yml` is in the correct location

### OAuth Redirect URI Mismatch

**Error**: `redirect_uri_mismatch`
- **Solution**: Make sure you added the Amplify URL to Google Cloud Console
- **Check**: URL must match exactly (no trailing slash)

### Environment Variables Not Working

**Error**: OAuth credentials not found
- **Solution**: 
  1. Check environment variables are set in Amplify Console
  2. Redeploy the app after adding variables
  3. Make sure variable names match exactly

### App Not Loading

**Error**: 404 or blank page
- **Solution**: 
  1. Check build logs in Amplify Console
  2. Verify `baseDirectory` and `appRoot` settings
  3. Make sure Next.js build completed successfully

## Continuous Deployment

AWS Amplify automatically deploys when you push to the `main` branch:

1. **Make changes** to your code
2. **Commit and push** to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. **Amplify automatically detects** the push and starts a new build
4. **Monitor deployment** in Amplify Console

## Cost Estimation

AWS Amplify pricing (as of 2026):
- **Build minutes**: $0.01 per build minute
- **Hosting**: $0.15 per GB served
- **Free tier**: 1000 build minutes/month, 15 GB served/month

**Estimated monthly cost** for development:
- ~10 builds/month × 5 minutes = 50 build minutes = $0.50
- ~5 GB served = $0.75
- **Total**: ~$1.25/month (well within free tier)

## Security Best Practices

1. ✅ **Environment variables** stored securely in Amplify
2. ✅ **HTTPS** enabled by default
3. ✅ **Client secret** never exposed to browser
4. ✅ **OAuth tokens** handled server-side
5. ⚠️ **Enable AWS WAF** for production (additional cost)
6. ⚠️ **Set up CloudWatch alarms** for monitoring

## Next Steps After Deployment

1. ✅ Frontend deployed to Amplify
2. 🔄 Set up custom domain (optional)
3. 🔄 Deploy backend Lambda functions
4. 🔄 Set up API Gateway
5. 🔄 Configure DynamoDB tables
6. 🔄 Implement email monitoring service
7. 🔄 Set up CI/CD pipeline for backend

## Useful Commands

### View Logs
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure CLI
amplify configure

# View logs
amplify console
```

### Manual Deployment
If you need to deploy manually:
```bash
# In frontend directory
npm run build

# Upload to S3 (if using custom setup)
aws s3 sync .next s3://your-bucket-name
```

## Support

- **AWS Amplify Docs**: https://docs.amplify.aws/
- **Next.js on Amplify**: https://docs.amplify.aws/guides/hosting/nextjs/
- **Amplify Console**: https://console.aws.amazon.com/amplify/

---

**Ready to deploy!** Follow the steps above to get your app live on AWS Amplify. 🚀
