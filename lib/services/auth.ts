'use server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getSessionUser() {
    const cookieStore = await cookies();
    const isBuildTime = process.env.SKIP_ENV_VALIDATION === 'true'

    // Use placeholders during build time if env vars are missing
    // Using standard Supabase local development credentials that pass validation
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildTime ? 'http://127.0.0.1:54321' : '')
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBuildTime ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : '')

    const supabase = createServerClient(
        url,
        key,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll().map((cookie) => ({
                        name: cookie.name,
                        value: cookie.value,
                    }));
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );
    
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const user = data.session?.user;
    if (!user) throw new Error('Not signed in');
    return user;
}