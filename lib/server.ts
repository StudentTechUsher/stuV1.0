// lib/supabase/server.ts
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => (await cookieStore).get(name)?.value,
        set: async (name: string, value: string, options: Record<string, unknown>) => {
          (await cookieStore).set({ name, value, ...options })
        },
        remove: async (name: string, options: Record<string, unknown>) => {
          (await cookieStore).set({ name, value: "", ...options, maxAge: 0 })
        },
      },
    }
  )
}
