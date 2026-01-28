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
const finalUrl = supabaseUrl || (isBuildTime ? 'https://placeholder.supabase.co' : '');
const finalKey = supabaseAnonKey || (isBuildTime ? 'placeholder-anon-key' : '');

export const supabase = createBrowserClient(finalUrl, finalKey);