/**
 * Database Abstraction Layer - Main Entry Point
 *
 * This is the SINGLE FILE you import from for all database operations.
 * To switch database providers, just swap the adapter import below.
 *
 * USAGE:
 * ```typescript
 * // Old way (direct Supabase):
 * import { supabase } from '@/lib/supabase';
 * const { data } = await supabase.from('program').select('*');
 *
 * // New way (abstracted):
 * import { db } from '@/lib/database';
 * const { data } = await db.from('program').select('*');
 * ```
 *
 * TO SWITCH PROVIDERS:
 * 1. Create new adapter (e.g., adapters/postgres.adapter.ts)
 * 2. Change the import below
 * 3. Change the initialization
 * 4. Done! All services use the new database.
 */

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseDatabaseAdapter } from './adapters/supabase.adapter';
import type { DatabaseClient } from './types';

// =============================================================================
// CONFIGURATION - Change this section to switch database providers
// =============================================================================

/**
 * Initialize the database client (currently Supabase)
 * To use a different provider, replace this with your adapter initialization
 */
function initializeDatabaseClient(): DatabaseClient {
  // Current implementation: Supabase
  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return new SupabaseDatabaseAdapter(supabaseClient);

  // Example: PostgreSQL with Prisma (future)
  // const prismaClient = new PrismaClient();
  // return new PrismaDatabaseAdapter(prismaClient);

  // Example: MySQL (future)
  // const mysqlClient = mysql.createConnection({ ... });
  // return new MySQLDatabaseAdapter(mysqlClient);
}

// =============================================================================
// EXPORTS - Don't change this section
// =============================================================================

/**
 * Main database client export
 * Use this in all your services and components
 */
export const db = initializeDatabaseClient();

/**
 * Legacy export for backward compatibility
 * @deprecated Use `db` instead
 */
export const supabase = db;

/**
 * Re-export types for convenience
 */
export type {
  DatabaseClient,
  QueryBuilder,
  DatabaseResponse,
  DatabaseError,
  DatabaseAuth,
  DatabaseUser,
  TableName,
} from './types';
