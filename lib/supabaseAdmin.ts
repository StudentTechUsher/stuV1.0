/**Supabase Client that enforces server-only rules and should never be on the client */
// Enforce server-only use at import time
import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,          // URL can be public
  process.env.SUPABASE_SERVICE_ROLE_KEY!,         // SERVICE ROLE: server only
  { auth: { persistSession: false } }
);
