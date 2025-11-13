import { createClient } from '@supabase/supabase-js'

const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'

const supabaseUrl = isDevelopment
  ? process.env.SUPABASE_DEV_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseAnonKey = isDevelopment
  ? process.env.SUPABASE_DEV_ANON_KEY
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)