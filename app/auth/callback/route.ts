// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Verify that the session cookie is readable after being set
 * This prevents race conditions where we redirect before cookies are persisted
 */
async function verifySessionReadable(
  supabase: ReturnType<typeof createServerClient>,
  maxRetries = 3,
  delayMs = 100
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      console.log(`Session verified readable on attempt ${attempt + 1}`);
      return true;
    }

    if (attempt < maxRetries - 1) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.warn('Session not readable after all retry attempts');
  return false;
}

/**
 * Return an HTML page that performs a client-side redirect
 * This ensures cookies are fully persisted before navigation
 */
function _htmlRedirect(destinationUrl: string): NextResponse {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${destinationUrl}">
        <title>Redirecting...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 { color: #333; margin: 0 0 0.5rem; font-size: 1.5rem; }
          p { color: #666; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h1>Authentication Successful!</h1>
          <p>Redirecting you to your dashboard...</p>
        </div>
        <script>
          // Fallback in case meta refresh doesn't work
          setTimeout(() => {
            window.location.href = '${destinationUrl}';
          }, 100);
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Use request origin instead of NODE_ENV for reliable environment detection
  const origin = `${url.protocol}//${url.host}`;

  // Enhanced debug logging
  console.log('=== Auth Callback Debug ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Origin:', origin);
  console.log('Host:', url.host);
  console.log('Protocol:', url.protocol);
  console.log('Next param:', next);
  console.log('Original URL:', req.url);
  console.log('Code present:', !!code);

  if (!code) {
    console.log('ERROR: No code provided');
    console.log('========================');
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Exchange the PKCE code for a session
  const exchangeStart = Date.now();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  const exchangeTime = Date.now() - exchangeStart;

  console.log(`Code exchange took ${exchangeTime}ms`);

  if (exchangeError) {
    console.error('Exchange error:', exchangeError);
    console.log('========================');
    return NextResponse.redirect(new URL("/login?error=exchange_failed", origin));
  }

  // Verify session is readable before continuing
  const verifyStart = Date.now();
  const sessionReadable = await verifySessionReadable(supabase);
  const verifyTime = Date.now() - verifyStart;

  console.log(`Session verification took ${verifyTime}ms`);

  if (!sessionReadable) {
    console.error('Session not readable after exchange - potential cookie persistence issue');
  }

  // Get user and check onboarding status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No user found after successful exchange');
    console.log('========================');
    return NextResponse.redirect(new URL("/login", origin));
  }

  console.log('User authenticated:', user.id);
  console.log('User email:', user.email);

  // Ensure profile exists (safe operation - won't overwrite existing profiles)
  // This is needed for magic link and new OAuth users
  if (user.email) {
    const profileStart = Date.now();
    const { ensureProfileExists } = await import('@/lib/services/profileService.server');
    await ensureProfileExists(user.id, user.email);
    const profileTime = Date.now() - profileStart;
    console.log(`Profile creation/verification took ${profileTime}ms`);
  }

  // Always redirect to dashboard - onboarding modal will handle first-time setup
  const dest = next;
  const finalUrl = new URL(dest, origin);

  const totalTime = Date.now() - startTime;
  console.log('=== Final Redirect ===');
  console.log('Destination:', dest);
  console.log('Final redirect URL:', finalUrl.toString());
  console.log(`Total callback processing time: ${totalTime}ms`);
  console.log('=====================');

  // Try server-side redirect after verification
  // If this still doesn't work, the issue is in middleware or dashboard auth checks
  return NextResponse.redirect(finalUrl);
}