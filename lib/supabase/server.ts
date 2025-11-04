import { createServerClient } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function getSupabaseConfig() {
  const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
  const hasDevConfig = !!(process.env.SUPABASE_DEV_URL && process.env.SUPABASE_DEV_ANON_KEY)

  const supabaseUrl = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabaseAnonKey = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_ANON_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return { supabaseUrl, supabaseAnonKey }
}

export function createSupabaseServerClient(
  request: NextRequest,
  response: NextResponse
) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}