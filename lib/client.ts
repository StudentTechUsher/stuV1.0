"use client"
import { createBrowserClient } from "@supabase/ssr"

export function createBrowserSupabase() {
  const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true'

  // Use placeholders during build time if env vars are missing
  // Using standard Supabase local development credentials that pass validation
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildTime ? 'http://127.0.0.1:54321' : '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBuildTime ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '')

  return createBrowserClient(url, key)
}
