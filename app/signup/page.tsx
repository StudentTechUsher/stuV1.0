'use client';

import { useSearchParams } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';
import { Suspense } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function SignupContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  
  // Use window.location.origin to get the current origin dynamically
  const redirectTo = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `/auth/callback?next=${encodeURIComponent(next)}`; // fallback for SSR

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&family=Work+Sans:wght@300;400&family=Red+Hat+Display:wght@700&display=swap" rel="stylesheet" />

      <main className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-100 p-8">

          <a
            href="/students"
            className="absolute top-6 left-6 text-black text-4xl"
            style={{ fontFamily: 'Red Hat Display, sans-serif', fontWeight: 800 }}
          >
            stu.
          </a>

          <div className="flex justify-center mb-2">
            <img 
              src="/stu_icon_black.png" 
              alt="Stu logo" 
              className="w-14 h-14 object-contain"
            />
          </div>

           <h2 className="text-center text-xl text-black mb-8" style={{ fontFamily: 'Work+Sans, sans-serif', fontWeight: 800 }}>
            welcome to stu.
          </h2>

          {/* Simple Supabase Auth UI with just Google */}
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: {
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  color: '#000000',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: '400',
                },
                anchor: { color: '#06C96C' },
              },
            }}
            providers={['google']}
            onlyThirdPartyProviders
            redirectTo={redirectTo}
            socialLayout="vertical"
          />

          {/* Sign In Link */}
          <p className="text-center mt-6 text-sm" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
            <span className="text-gray-600">Already have an account? </span>
            <a href="/login" className="text-zinc-700 hover:text-[#12F987] no-underline hover:no-underline">
              Sign In
            </a>
          </p>
        </div>
      </main>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
