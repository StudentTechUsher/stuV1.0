// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Use request origin instead of NODE_ENV for reliable environment detection
  const origin = `${url.protocol}//${url.host}`;

  // Debug logging to see what's happening
  console.log('Auth callback debug:', {
    origin,
    host: url.host,
    protocol: url.protocol,
    next,
    originalUrl: req.url
  });

  if (!code) {
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
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('Exchange error:', exchangeError);
    return NextResponse.redirect(new URL("/login?error=exchange_failed", origin));
  }

  // Get user and check onboarding status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Ensure profile exists (safe operation - won't overwrite existing profiles)
  // This is needed for magic link and new OAuth users
  if (user.email) {
    const { ensureProfileExists } = await import('@/lib/services/profileService.server');
    await ensureProfileExists(user.id, user.email);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, authorization_agreed")
    .eq("id", user.id)
    .maybeSingle();

  const dest = profile?.onboarded ? next : "/create-account";
  
  // Debug the final redirect
  const finalUrl = new URL(dest, origin);
  console.log('Final redirect URL:', finalUrl.toString());
  
  return NextResponse.redirect(finalUrl);
}