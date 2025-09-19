// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://stuplanning.com'
    : 'http://localhost:3000';

  // Debug logging to see what's happening
  console.log('Auth callback debug:', {
    nodeEnv: process.env.NODE_ENV,
    baseUrl,
    next,
    originalUrl: req.url
  });

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", baseUrl));
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
    return NextResponse.redirect(new URL("/login?error=exchange_failed", baseUrl));
  }

  // Get user and check onboarding status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();

  const dest = profile?.onboarded ? next : "/create-account";
  
  // Debug the final redirect
  const finalUrl = new URL(dest, baseUrl);
  console.log('Final redirect URL:', finalUrl.toString());
  
  return NextResponse.redirect(finalUrl);
}