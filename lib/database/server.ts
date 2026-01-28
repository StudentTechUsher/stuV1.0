/**
 * Database Abstraction Layer - Server-Side Client
 *
 * This is the server-side version of the database client.
 * Use this in Server Components, Server Actions, and API Routes.
 *
 * USAGE:
 * ```typescript
 * // Old way (direct Supabase):
 * import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
 * const supabase = await createSupabaseServerComponentClient();
 * const { data } = await supabase.from('program').select('*');
 *
 * // New way (abstracted):
 * import { createServerDatabaseClient } from '@/lib/database/server';
 * const db = await createServerDatabaseClient();
 * const { data } = await db.from('program').select('*');
 * ```
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, type NextResponse } from 'next/server';
import { SupabaseDatabaseAdapter } from './adapters/supabase.adapter';
import type { DatabaseClient } from './interfaces';

/**
 * Create a database client for Server Components
 * Uses cookies for authentication
 */
export async function createServerDatabaseClient(): Promise<DatabaseClient> {
  const cookieStore = await cookies();
  const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true'

  // Use placeholders during build time if env vars are missing
  // Using standard Supabase local development credentials that pass validation
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildTime ? 'http://127.0.0.1:54321' : '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBuildTime ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '')

  const supabaseClient = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  return new SupabaseDatabaseAdapter(supabaseClient);
}

/**
 * Create a database client for Middleware
 * Uses request/response for cookie handling
 */
export function createMiddlewareDatabaseClient(
  request: NextRequest,
  response: NextResponse
): DatabaseClient {
  const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true'

  // Use placeholders during build time if env vars are missing
  // Using standard Supabase local development credentials that pass validation
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildTime ? 'http://127.0.0.1:54321' : '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBuildTime ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '')

  const supabaseClient = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return new SupabaseDatabaseAdapter(supabaseClient);
}

/**
 * Legacy exports for backward compatibility
 * @deprecated Use createServerDatabaseClient instead
 */
export const createSupabaseServerComponentClient = createServerDatabaseClient;
export const createSupabaseServerClient = createMiddlewareDatabaseClient;
