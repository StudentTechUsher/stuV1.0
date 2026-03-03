import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
  const hasDevConfig = !!(process.env.SUPABASE_DEV_URL && process.env.SUPABASE_DEV_ANON_KEY)
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

  const supabaseUrl = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  const supabaseAnonKey = (isDevelopment && hasDevConfig)
    ? process.env.SUPABASE_DEV_ANON_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Use placeholders when we know we can't (or don't want to) provide real env vars.
  // This keeps Storybook and build-time evaluation working without configuring Supabase.
  const allowPlaceholder = isBuildTime || isStorybook
  const finalUrl = supabaseUrl || (allowPlaceholder ? 'http://127.0.0.1:54321' : '')
  const finalKey = supabaseAnonKey || (allowPlaceholder ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '')

  return createBrowserClient(finalUrl, finalKey)
}
