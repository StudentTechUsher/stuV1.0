'use client';
import { createBrowserClient } from '@supabase/ssr';

const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development';
const hasDevConfig = !!(process.env.SUPABASE_DEV_URL && process.env.SUPABASE_DEV_ANON_KEY);
const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true';

const supabaseUrl = (isDevelopment && hasDevConfig)
  ? process.env.SUPABASE_DEV_URL!
  : process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey = (isDevelopment && hasDevConfig)
  ? process.env.SUPABASE_DEV_ANON_KEY!
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use placeholders during build time if env vars are missing
// Using standard Supabase local development credentials that pass validation
const finalUrl = supabaseUrl || (isBuildTime ? 'http://127.0.0.1:54321' : '');
const finalKey = supabaseAnonKey || (isBuildTime ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '');

export const supabase = createBrowserClient(finalUrl, finalKey);