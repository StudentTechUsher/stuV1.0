'use client';

import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  async function login() {
    const next = '/dashboard'; // or capture from searchParams for deep return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto' }}>
      <button onClick={login}>Continue with Google</button>
    </main>
  );
}
