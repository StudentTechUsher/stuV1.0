// app/auth/callback/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  // Determine the correct base URL from request headers (client-facing URL)
  const getBaseUrl = () => {
    // Check for forwarded headers from proxies/load balancers
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || req.headers.get('x-forwarded-protocol');
    const host = req.headers.get('host');
    
    if (forwardedHost) {
      // Use forwarded headers if available (common in production with proxies)
      const protocol = forwardedProto || 'https';
      return `${protocol}://${forwardedHost}`;
    } else if (host) {
      // Use host header with appropriate protocol
      const protocol = req.headers.get('x-forwarded-proto') || 
                      (host.includes('localhost') ? 'http' : 'https');
      return `${protocol}://${host}`;
    } else {
      // Fallback to environment-based detection
      return process.env.NODE_ENV === 'production' 
        ? 'https://stuplanning.com' 
        : url.origin;
    }
  };
  
  const baseUrl = getBaseUrl();

  if (!code) {
    // If you ever see a URL with #access_token here, you’re still on implicit flow.
    return NextResponse.redirect(new URL("/login?error=missing_code", baseUrl));
  }

  // Create a response object to collect Set-Cookie from Supabase
  const cookieCollector = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieCollector.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  // 1) Exchange the PKCE code for a session (writes cookies via setAll above)
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=exchange_failed", baseUrl), {
      headers: cookieCollector.headers, // forward Set-Cookie
    });
  }

  // 2) Decide destination based on onboarding
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl), {
      headers: cookieCollector.headers,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, authorization_agreed")
    .eq("id", user.id)
    .maybeSingle();

  // Check authorization agreement first, then onboarding
  let dest;
  if (!profile?.authorization_agreed) {
    // User hasn't agreed to authorization yet
    dest = `/auth/authorize?next=${encodeURIComponent(next)}`;
  } else if (!profile?.onboarded) {
    // User has authorized but not completed onboarding
    dest = "/create-account";
  } else {
    // User is fully set up
    dest = next;
  }

  // 3) Return the final redirect, carrying along any Set-Cookie headers
  return NextResponse.redirect(new URL(dest, baseUrl), {
    headers: cookieCollector.headers,
  });
}