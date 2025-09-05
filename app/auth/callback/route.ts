// app/auth/callback/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    // If you ever see a URL with #access_token here, you’re still on implicit flow.
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
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
    return NextResponse.redirect(new URL("/login?error=exchange_failed", url.origin), {
      headers: cookieCollector.headers, // forward Set-Cookie
    });
  }

  // 2) Decide destination based on onboarding
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin), {
      headers: cookieCollector.headers,
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();

  const dest = profile?.onboarded ? next : "/create-account";

  // 3) Return the final redirect, carrying along any Set-Cookie headers
  return NextResponse.redirect(new URL(dest, url.origin), {
    headers: cookieCollector.headers,
  });
}
