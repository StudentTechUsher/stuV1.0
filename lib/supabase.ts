import { createClient } from '@supabase/supabase-js'

const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'

const supabaseUrl = isDevelopment
  ? process.env.SUPABASE_DEV_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseAnonKey = isDevelopment
  ? process.env.SUPABASE_DEV_ANON_KEY
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// During build time, use placeholder values if env vars are missing
// This allows the build to complete without actually connecting to Supabase
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true'

const finalUrl = supabaseUrl || (isBuildTime ? 'https://placeholder.supabase.co' : '')
const finalKey = supabaseAnonKey || (isBuildTime ? 'placeholder-anon-key' : '')

// Only enforce env vars at runtime, not during build
if (!isBuildTime && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(finalUrl, finalKey)