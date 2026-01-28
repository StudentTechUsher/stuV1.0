# E2E Test Authentication Setup

Since your app uses **Google Auth** or **Magic Links** for authentication, you need to set up a test user with email/password credentials for E2E testing.

## Option 1: Automatic Setup (Recommended)

Run the automated setup script to create a test user:

```bash
pnpm test:e2e:setup
```

This will:
- ✅ Check if test user already exists
- ✅ Create test user with email/password if needed
- ✅ Auto-confirm the user's email
- ✅ Use credentials from your `.env` file

### Prerequisites

Make sure your `.env` file has:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test credentials
E2E_TEST_EMAIL=e2e-test@example.com
E2E_TEST_PASSWORD=TestPassword123!
```

---

## Option 2: Manual Setup via Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to: Authentication → Users

2. **Create New User**
   - Click "Invite User" or "Add User"
   - Email: Use the email from `E2E_TEST_EMAIL` in your `.env` file
   - Password: Use the password from `E2E_TEST_PASSWORD`
   - ✅ Check "Auto Confirm User" to bypass email verification

3. **Verify Email Provider is Enabled**
   - Go to: Authentication → Providers
   - Ensure "Email" provider is enabled (should be enabled by default)

---

## How It Works

### Your Production Users
- Continue using Google Auth or Magic Links
- No changes needed

### E2E Test User
- Uses email/password authentication
- Separate from production users
- Only used for automated testing

### Test Flow

```
1. Playwright starts → e2e/auth.setup.ts runs
2. Login with test credentials → Creates authenticated session
3. Session saved to e2e/.auth/user.json
4. All tests reuse this session (no repeated logins)
```

---

## Troubleshooting

### "Failed to create test user"

**Problem:** Email provider might not be enabled.

**Solution:**
```bash
# In Supabase Dashboard:
Authentication → Providers → Enable "Email"
```

### "Invalid login credentials"

**Problem:** Test user doesn't exist or credentials are wrong.

**Solution:**
```bash
# Run setup script to create user
pnpm test:e2e:setup

# Or verify .env file has correct credentials
```

### "Email not confirmed"

**Problem:** Email confirmation required but not set.

**Solution:**
```bash
# When creating user manually, check "Auto Confirm User"
# Or run setup script which auto-confirms
pnpm test:e2e:setup
```

---

## Testing Your Setup

### 1. Start Dev Server
```bash
pnpm dev
```

### 2. Run Tests
```bash
# In another terminal
pnpm test:e2e:ui
```

If tests pass authentication, your setup is complete! ✅

---

## Advanced: Testing Magic Links (Optional)

If you want to test the actual Magic Link flow instead of email/password:

1. **Set up email interception** (e.g., MailHog, Mailpit)
2. **Update auth.setup.ts** to:
   - Trigger magic link email
   - Intercept email
   - Extract link
   - Navigate to link in Playwright

This is more complex and typically not needed for most E2E tests.

---

## Security Notes

- ⚠️ Never commit real user passwords to git
- ✅ Use `.env` file (already in `.gitignore`)
- ✅ Test user is separate from production users
- ✅ Use different credentials for CI/CD (GitHub Secrets)

---

## Files Modified

- ✅ `playwright.config.ts` - Added dotenv to load .env
- ✅ `e2e/setup-test-user.ts` - Script to create test user
- ✅ `package.json` - Added `test:e2e:setup` script
- ✅ `e2e/AUTH_SETUP.md` - This documentation
