import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")      // OAuth / magic-link code
  const next = url.searchParams.get("next") || "/dashboard"
  const cookieStore = cookies()

  // Prepare a redirect response we can write cookies to
  const res = NextResponse.redirect(new URL(next, url.origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => (await cookieStore).get(name)?.value,
        set: async (name, value, options) => {
          (await cookieStore).set({ name, value, ...options })
        },
        remove: async (name, options) => {
          (await cookieStore).set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    }
  )

  if (code) {
    // Exchange the code for a session & set cookies on `res`
    await supabase.auth.exchangeCodeForSession(code)
  }

  return res
}
