import { createClient } from '@supabase/supabase-js'

const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'

const supabaseUrl = isDevelopment
  ? process.env.SUPABASE_DEV_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseAnonKey = isDevelopment
  ? process.env.SUPABASE_DEV_ANON_KEY
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// During build time / Storybook, use placeholder values if env vars are missing
// This allows Storybook and builds to complete without actually connecting to Supabase
// Using standard Supabase local development credentials that pass validation
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true'
const isStorybook =
  typeof window !== 'undefined' &&
  (
    // Common Storybook globals (set early in preview)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_PREVIEW__ ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_STORY_STORE__ ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__STORYBOOK_ADDONS_CHANNEL__
  )

const allowPlaceholder = isBuildTime || isStorybook
const finalUrl = supabaseUrl || (allowPlaceholder ? 'http://127.0.0.1:54321' : '')
const finalKey = supabaseAnonKey || (allowPlaceholder ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '')

// Only enforce env vars at runtime, not during build or Storybook
if (!allowPlaceholder && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(finalUrl, finalKey)
