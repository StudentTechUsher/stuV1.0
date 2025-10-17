import { createServerClient } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export function createSupabaseServerClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // In Next.js 15, cookies can only be modified in Server Actions or Route Handlers
          // Server Components are read-only, so this is a no-op
          // Cookie modifications will happen in Server Actions when needed
        },
      },
    }
  )
}