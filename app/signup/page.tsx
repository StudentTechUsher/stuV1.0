'use client';

import { useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';
import { Typography } from '@mui/material';
import { Suspense } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function SignupContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

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

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
