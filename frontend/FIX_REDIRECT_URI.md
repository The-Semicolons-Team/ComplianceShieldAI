# Fix: redirect_uri_mismatch Error

## The Problem

You're seeing this error:
```
Error 400: redirect_uri_mismatch
```

This means the redirect URI in your Google Cloud Console doesn't match what the app is sending.

## The Solution

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com/apis/credentials
2. Make sure you're in the correct project: **complianceshieldai**

### Step 2: Find Your OAuth Client ID
1. Look for your OAuth 2.0 Client ID in the list
2. It should be named something like "ComplianceShield Web Client"
3. Click on it to edit

### Step 3: Add the Redirect URI
1. Scroll down to **"Authorized redirect URIs"**
2. Click **"+ ADD URI"**
3. Copy and paste this EXACT URI:
   ```
   http://localhost:3000/auth/google/callback
   ```
4. Make sure there are NO:
   - Trailing slashes (/)
   - Extra spaces
   - Different ports
   - HTTPS (use HTTP for localhost)

### Step 4: Also Add JavaScript Origins
1. Scroll up to **"Authorized JavaScript origins"**
2. Click **"+ ADD URI"**
3. Add:
   ```
   http://localhost:3000
   ```

### Step 5: Save Changes
1. Click **"SAVE"** at the bottom of the page
2. Wait 1-2 minutes for changes to propagate

### Step 6: Test Again
1. Go to: http://localhost:3000/login
2. Click "Continue with Google"
3. It should work now!

## Visual Checklist

Your OAuth Client configuration should look like this:

```
OAuth 2.0 Client ID
├── Client ID: YOUR_CLIENT_ID.apps.googleusercontent.com
├── Client Secret: YOUR_CLIENT_SECRET
│
├── Authorized JavaScript origins
│   └── http://localhost:3000
│
└── Authorized redirect URIs
    └── http://localhost:3000/auth/google/callback
```

## Common Mistakes to Avoid

❌ **Wrong**: `http://localhost:3000/auth/google/callback/` (trailing slash)
✅ **Correct**: `http://localhost:3000/auth/google/callback`

❌ **Wrong**: `https://localhost:3000/auth/google/callback` (HTTPS)
✅ **Correct**: `http://localhost:3000/auth/google/callback` (HTTP)

❌ **Wrong**: `http://localhost:3001/auth/google/callback` (wrong port)
✅ **Correct**: `http://localhost:3000/auth/google/callback` (port 3000)

## Still Not Working?

### Check the Browser URL
When you click "Continue with Google", check the URL that opens. It should include:
```
redirect_uri=http://localhost:3000/auth/google/callback
```

### Clear Browser Cache
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## Need More Help?

If you're still seeing the error:
1. Take a screenshot of your OAuth Client configuration in Google Cloud Console
2. Check that the redirect URI is EXACTLY: `http://localhost:3000/auth/google/callback`
3. Make sure you clicked "SAVE" in Google Cloud Console
4. Wait 2-3 minutes after saving for changes to take effect

---

**Quick Link**: https://console.cloud.google.com/apis/credentials
