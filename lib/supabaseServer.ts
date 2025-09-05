import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        // Server Components can't write cookies; we'll write them in route handlers below.
        set: () => {},
        remove: () => {},
      },
    }
  );
}
