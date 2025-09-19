'use client';

import { useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';
import { Typography } from '@mui/material';
import { Suspense, useEffect, useState } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const [redirectTo, setRedirectTo] = useState<string>('');

  useEffect(() => {
    // Only access window on the client side
    if (typeof window !== 'undefined') {
      setRedirectTo(`${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`);
    }
  }, [next]);

  // Don't render Auth component until we have the redirect URL
  if (!redirectTo) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <Typography className="font-bold" variant="h4" component="h1" gutterBottom>
            Welcome to stu.
          </Typography>
          <div>Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <Typography className="font-bold" variant="h4" component="h1" gutterBottom>
          Welcome to stu.
        </Typography>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          onlyThirdPartyProviders
          redirectTo={redirectTo}
          socialLayout="vertical"
        />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
