/**
 * Supabase client for interacting with the Supabase API.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Export BOTH ways so named or default imports work
export { supabase };
export default supabase;

