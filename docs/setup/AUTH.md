# Authentication System

This document describes how authentication works end-to-end in the app. It is intended as a reference for agents and developers working on features that touch auth, sessions, roles, or user identity.

---

## Provider

Authentication is handled entirely by **Supabase Auth** via the `@supabase/ssr` package. The app does not implement its own session management — Supabase issues JWTs stored as HTTP-only cookies with the naming pattern `sb-*-auth-token`.

---

## Login Methods

### Magic Link (primary, production)
Users enter their email and receive a one-time login link. This is the default and only login method in production.

**Flow:**
1. User submits email on `/login`
2. `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` is called from the browser client
3. Supabase emails a link pointing to `/auth/callback?code=<pkce_code>&next=<destination>`
4. The PKCE code is exchanged for a session in the callback handler

### Google OAuth
Users can sign in with Google. Clicking "Sign in with Google" calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`, which redirects to Google and then back to `/auth/callback`.

### Password Login (development only)
Password-based login is enabled only when `NEXT_PUBLIC_ENV === 'development'`. It is used exclusively for end-to-end testing. The toggle is hidden in production UI. Password login calls `supabase.auth.signInWithPassword(...)` directly and redirects via `window.location.href` after a short delay for session stabilization.

---

## PKCE Callback: `/auth/callback`

**File:** `app/auth/callback/route.ts`

This is the single redirect destination for all auth methods. It:

1. Reads the `code` query parameter
2. Exchanges it for a session: `supabase.auth.exchangeCodeForSession(code)`
3. Verifies the session is readable from cookies (retries up to 3×, 100ms apart) to avoid race conditions
4. Calls `ensureProfileExists(userId, email)` — creates a profile row if none exists yet
5. Attempts to claim any anonymous browsing identity linked to the user's email (non-blocking)
6. Checks `needsOnboarding(profile)` to determine the destination: `/onboarding` for new/incomplete profiles, or the `next` query param (defaulting to `/dashboard`)
7. Returns an HTML page that does a **client-side redirect** after verifying the session is readable in the browser — this prevents cookie persistence race conditions that a server-side `redirect()` would trigger

---

## Supabase Client Instances

There are several client instantiation patterns. Use the right one for the context.

| File | Pattern | Use in |
|---|---|---|
| `lib/supabaseClient.ts` | `createBrowserClient` (singleton export) | Client components, login page |
| `lib/supabase/client.ts` | `createSupabaseBrowserClient()` factory | Client components needing a fresh instance |
| `lib/supabase/server.ts` → `createSupabaseServerComponentClient()` | `createServerClient` + cookie store | Server Components, Route Handlers reading session |
| `lib/supabase/server.ts` → `createSupabaseServerClient(req, res)` | `createServerClient` + request/response | Middleware-style handlers that must set cookies |

All clients support environment-based switching: when `NEXT_PUBLIC_ENV === 'development'` and both `SUPABASE_DEV_URL` + `SUPABASE_DEV_ANON_KEY` are set, they connect to a local Supabase instance instead of production.

---

## Server-Side Auth Verification

**File:** `lib/supabase/auth.ts`

Two primary functions for server-side use:

### `getVerifiedUser(): Promise<User | null>`
Verifies the session and returns the Supabase `User` object, or `null` if unauthenticated. This is the standard guard to put at the top of Server Components and API route handlers.

```typescript
import { getVerifiedUser } from '@/lib/supabase/auth';

const user = await getVerifiedUser();
if (!user) redirect('/login');
```

### `getVerifiedUserProfile()`
Calls `getVerifiedUser()` and then fetches the user's `profiles` row. For students (`role_id === 3`), it also joins the `student` table and merges fields (`est_grad_date`, `est_grad_sem`, `career_goals`, `admission_year`, `is_transfer`, `student_type`) directly onto the returned object.

---

## Dev Bypass

In development environments, `getVerifiedUser()` first checks for a `DEV_BYPASS_JWT` cookie. If present, it decodes the JWT payload and returns a synthetic `User` object — **no Supabase session needed**. This allows local development and testing without going through the full email/OAuth flow.

The bypass is disabled in production (`NEXT_PUBLIC_ENV !== 'dev'`).

---

## Route Protection

There is **no global middleware** enforcing auth. Protection is enforced per-route by calling `getVerifiedUser()` or `getVerifiedUserProfile()` at the top of each Server Component or Route Handler and redirecting/returning 401 as needed.

All dashboard routes live under `app/(dashboard)/`. That layout (`app/(dashboard)/layout.tsx`) fetches the profile and enforces the auth boundary at the layout level, so individual pages under the dashboard group don't need to re-check.

Public routes that remain unauthenticated:
- `/login`
- `/signup`
- `/auth/callback`
- `/auth/sign-out`
- `/auth/authorize` (checks auth itself and redirects to `/login` if not authenticated)
- `/` (redirects to `/login`)

---

## Role System

Roles are stored as integer `role_id` on the `profiles` table:

| `role_id` | Role | Notes |
|---|---|---|
| `1` | admin | Institution-level admin |
| `2` | advisor | Academic advisor; requires admin approval after onboarding |
| `3` | student | Default role; marked `onboarded = true` immediately |

The string ↔ integer mapping lives in `profileService.server.ts` (`roleIdMap`). When checking roles in code, compare against the integer directly — there is no enum. String role names (`'student'`, `'advisor'`, `'admin'`) are used at the onboarding input boundary only.

---

## Onboarding Gate

**File:** `lib/utils/onboardingUtils.ts` → `needsOnboarding(profile)`

A user needs onboarding if **any** of the following are true:
- `university_id` is null
- `role_id` is null
- `role_id === 3` (student) and `onboarded !== true`

Advisors and admins are not gated by `onboarded` — they can access the app immediately after selecting their role in onboarding, but their account access may be limited until an admin approves them.

---

## Sign Out

**File:** `app/auth/sign-out/route.ts`

`POST /auth/sign-out` calls `supabase.auth.signOut()` server-side and then explicitly deletes all cookies matching `sb-*-auth-token`. Returns `{ success: true }` on success.

---

## Profile Creation

**File:** `lib/services/profileService.server.ts` → `ensureProfileExists(userId, email)`

Called during the auth callback for magic link and OAuth users. Creates a profile row if one does not exist. It is a safe no-op if the profile already exists. The profile starts with no `role_id` or `university_id`, which is what triggers the onboarding flow.

---

## Anonymous Identity

Before a user signs in, anonymous browsing activity is tracked via a cookie (`ANON_ID_COOKIE_NAME`). During the auth callback, `claimAnonymousIdentityForUser` links that anonymous session to the authenticated user. This supports pre-login activity attribution (e.g. pages visited before creating an account). Failure is non-blocking — a failed claim will not prevent login from completing.
