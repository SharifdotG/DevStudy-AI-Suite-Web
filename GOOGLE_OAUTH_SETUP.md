# Google OAuth Setup Guide

## Quick Setup via Supabase Dashboard (Recommended)

1. **Go to**: <https://supabase.com/dashboard/project/inbhpxujxhrtrpbuufcb/auth/providers>
2. **Enable Google provider**
3. **Add credentials** (see below)

---

## Getting Google OAuth Credentials

### Step 1: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**

### Step 2: Configure OAuth Consent Screen (if first time)

1. Select **External** user type
2. Fill in required fields:
   - App name: `DevStudy AI Suite`
   - User support email: your email
   - Developer contact: your email
3. Add scopes (optional for now):
   - `profile`
   - `email`
4. Save and continue

### Step 3: Create OAuth Client ID

1. Application type: **Web application**
2. Name: `DevStudy AI Suite Web`
3. **Authorized redirect URIs**:

   ```plaintext
   https://inbhpxujxhrtrpbuufcb.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```

4. Click **Create**
5. Copy the **Client ID** and **Client Secret**

---

## Adding to Supabase

### Option 1: Dashboard (Easiest)

1. Go to: <https://supabase.com/dashboard/project/inbhpxujxhrtrpbuufcb/auth/providers>
2. Find Google provider
3. Toggle **Enabled**
4. Paste **Client ID**
5. Paste **Client Secret**
6. Click **Save**

### Option 2: Management API

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="inbhpxujxhrtrpbuufcb"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_google_enabled": true,
    "external_google_client_id": "your-google-client-id",
    "external_google_secret": "your-google-client-secret"
  }'
```

---

## Testing for Development

### Quick Test Mode

Supabase provides a shared OAuth credential for testing:

1. In Supabase Dashboard → Auth → Providers → Google
2. Look for **"Use Supabase OAuth provider for development"**
3. Toggle it ON
4. ⚠️ **This is for development only** - use your own credentials for production

---

## Troubleshooting

### Error: "Unsupported provider: provider is not enabled"

- ✅ Make sure Google provider is **toggled ON** in Supabase Dashboard
- ✅ Verify Client ID and Secret are saved
- ✅ Check that the redirect URI in Google Cloud matches exactly

### Error: "redirect_uri_mismatch"

- ✅ Add both production and localhost URLs to Google Cloud Console
- ✅ Ensure no trailing slashes in redirect URIs

### Can't retrieve user email

- ✅ Add email scope in your code (already done in `app/(auth)/actions.ts`):

  ```typescript
  scopes: "profile email"
  ```

---

## Security Notes

- Never commit Client Secret to git
- For production, use your own OAuth credentials
- Consider adding authorized domains in Google Cloud Console
- Rotate credentials periodically
