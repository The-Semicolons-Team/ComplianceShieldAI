# Quick Start: Deploy to AWS Amplify

Follow these steps to deploy your frontend to AWS Amplify in under 15 minutes.

## Prerequisites
- ✅ Code pushed to GitHub
- ✅ Google OAuth credentials ready
- ✅ AWS account

## 5-Step Deployment

### 1. Open AWS Amplify Console
```
https://console.aws.amazon.com/amplify/
```
- Click "New app" → "Host web app"
- Select "GitHub"
- Authorize AWS Amplify

### 2. Connect Repository
- Repository: `The-Semicolons-Team/ComplianceShieldAI`
- Branch: `main`
- Click "Next"

### 3. Configure Build (Auto-detected)
The `amplify.yml` file will be automatically detected.

**Verify**:
- App root: `frontend`
- Build command: `npm run build`
- Output directory: `.next`

Click "Next"

### 4. Add Environment Variables
Click "Advanced settings" and add:

```env
NEXT_PUBLIC_API_URL=https://TEMP_VALUE/api
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_APP_NAME=ComplianceShield
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_USE_MOCK_AUTH=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://TEMP_VALUE/auth/google/callback
```

**Replace**:
- `YOUR_CLIENT_ID` with your actual Google Client ID
- `YOUR_CLIENT_SECRET` with your actual Google Client Secret
- `TEMP_VALUE` will be updated after deployment

Click "Save and deploy"

### 5. Update After Deployment

**A. Get your Amplify URL** (e.g., `https://main.d123.amplifyapp.com`)

**B. Update Google OAuth**:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth Client ID
3. Add to "Authorized JavaScript origins":
   ```
   https://main.d123.amplifyapp.com
   ```
4. Add to "Authorized redirect URIs":
   ```
   https://main.d123.amplifyapp.com/auth/google/callback
   ```
5. Click "SAVE"

**C. Update Amplify Environment Variables**:
1. Go to Amplify Console → App settings → Environment variables
2. Update:
   ```
   NEXT_PUBLIC_API_URL=https://main.d123.amplifyapp.com/api
   NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://main.d123.amplifyapp.com/auth/google/callback
   ```
3. Click "Save" (auto-redeploys)

## Test Your Deployment

1. Visit your Amplify URL
2. Click "Continue with Google"
3. Grant permissions
4. You should be logged in! 🎉

## Troubleshooting

**Build fails?**
- Check build logs in Amplify Console
- Verify `amplify.yml` is in repository root

**OAuth not working?**
- Verify redirect URI matches exactly in Google Console
- Check environment variables are set correctly

**Need help?**
- See `frontend/AWS_AMPLIFY_DEPLOYMENT.md` for detailed guide
- See `frontend/DEPLOYMENT_CHECKLIST.md` for complete checklist

---

**Deployment time**: ~10-15 minutes
**Cost**: Free tier (first year) or ~$1-5/month
