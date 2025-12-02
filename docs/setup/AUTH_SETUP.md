# Supabase Authentication & Session Management

This guide covers the robust authentication and session management implementation for the Student Tech Usher app using Supabase with Next.js App Router.

## Overview

The implementation provides:
- ✅ Auto-refreshing cookie-backed sessions
- ✅ Server-side session verification
- ✅ Client-side token management with retry logic
- ✅ Row-level security (RLS) for profiles
- ✅ Middleware-based route protection

## Architecture

### Client-Side (`useAuth` Hook)
- Maintains session state and access tokens in memory
- Handles authentication actions (signIn, signUp, signOut)
- Automatic retry on 401 responses with token refresh
- Real-time session updates via `onAuthStateChange`

### Server-Side (Auth Helpers)
- `getVerifiedUser()`: Validates session per request
- `getVerifiedUserProfile()`: Safely queries user profile with RLS
- No trust in client-side state

### Middleware
- Automatic session refresh on all requests
- Route protection for dashboard pages
- Redirects unauthenticated users to login

## File Structure

```
lib/supabase/
├── client.ts          # Browser client with auto-refresh
├── server.ts          # Server clients (middleware & components)
└── auth.ts            # Server-side auth helpers

hooks/
└── useAuth.ts         # Client auth hook

middleware.ts          # Route protection & session refresh
app/api/my-profile/
└── route.ts           # Protected API endpoint example

sql/
└── rls-policies.sql   # Row Level Security policies
```

## Usage Examples

### Server Components (Page/Layout)

```tsx
import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth'

export default async function DashboardPage() {
  // Verify user authentication
  const user = await getVerifiedUser()
  if (!user) {
    return <div>Authentication required</div>
  }

  // Get user profile safely
  const profile = await getVerifiedUserProfile()
  if (!profile) {
    return <div>Profile not found</div>
  }

  return <div>Welcome {user.email}!</div>
}
```

### Client Components

```tsx
'use client'
import { useAuth } from '@/hooks/useAuth'

export default function ProfileComponent() {
  const { user, loading, fetchWithAuth } = useAuth()

  const updateProfile = async () => {
    // Automatically handles auth & retries on 401
    const response = await fetchWithAuth('/api/my-profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' })
    })
    
    if (response.ok) {
      console.log('Profile updated!')
    }
  }

  if (loading) return <div>Loading...</div>
  if (!user) return <div>Please log in</div>

  return (
    <div>
      <p>Email: {user.email}</p>
      <button onClick={updateProfile}>Update Profile</button>
    </div>
  )
}
```

### API Routes

```tsx
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createSupabaseServerClient(request, response)
  
  // Verify authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query with RLS protection
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data)
}
```

## Security Features

### Row Level Security (RLS)

The profiles table is protected with RLS policies:

```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
```

### Automatic Session Refresh

- Middleware refreshes sessions on every request
- Client hook manages tokens and refreshes on 401
- No manual session management required

### Route Protection

Protected routes (like `/dashboard/*`) automatically redirect unauthenticated users:

```tsx
// middleware.ts handles this automatically
const protectedPaths = ['/dashboard']
```

## Authentication Flow

1. **User visits protected route** → Middleware checks session
2. **No session** → Redirect to `/login`
3. **User logs in** → Session created, redirect to intended page
4. **Session expires** → Middleware auto-refreshes
5. **API call with expired token** → Client retries after refresh

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Migration from Old Auth

To migrate existing auth usage:

1. Replace manual Supabase client creation with helper functions
2. Use `getVerifiedUser()` instead of `supabase.auth.getUser()`
3. Use `useAuth` hook for client-side auth state
4. Apply RLS policies to your database tables

## Testing Authentication

1. **Test route protection**: Visit `/dashboard` without login
2. **Test session persistence**: Refresh page while logged in
3. **Test API retry**: Make API calls with expired tokens
4. **Test RLS**: Try accessing other users' data

## Troubleshooting

### "Authentication required" on protected pages
- Check middleware configuration
- Verify Supabase environment variables
- Confirm RLS policies are enabled

### API returns 401 despite being logged in
- Check if API route uses proper server client
- Verify cookies are being passed correctly
- Check browser network tab for cookie issues

### Session not persisting across tabs/refreshes
- Verify middleware is running
- Check cookie settings in Supabase client
- Confirm no client-side auth conflicts

This implementation ensures secure, performant authentication with minimal boilerplate while maintaining the highest security standards.