import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
  const hasDevConfig = !!(process.env.SUPABASE_DEV_URL && process.env.SUPABASE_DEV_ANON_KEY)

  const supabaseUrl = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabaseAnonKey = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_ANON_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}