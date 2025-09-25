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

      <main className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-100 p-8">

          <a
            href="/students"
            className="absolute top-6 left-6 text-black text-4xl font-brand"
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

           <h2 className="text-center text-xl text-black mb-8 font-header">
            welcome to stu.
          </h2>

          {/* Divider */}
          <div className="relative mb-6">
            <hr className="border-gray-300" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-gray-500 text-sm font-body">
              Sign up with
            </span>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            {/* School SSO */}
            <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <img 
                src="/stu_icon_black.png" 
                alt="Stu logo" 
                className="w-5 h-5 object-contain"
              />
              <span className="text-black font-body-medium">
                Sign up with School SSO
              </span>
            </button>

            {/* Google */}
            <button
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-black font-body-medium">
                Sign up with Google
              </span>
            </button>

            {/* Apple */}
            <button className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#000000"/>
              </svg>
              <span className="text-black font-body-medium">
                Sign up with Apple
              </span>
            </button>
           
            {/* Sign In Link */}
            <p className="text-center mt-6 text-sm font-body">
              <span className="text-gray-600">Already have an account? </span>
              <a href="/login" className="text-zinc-700 hover:text-[var(--primary)] no-underline hover:no-underline">
                Sign In
              </a>
            </p>

          </div>

          {/* Hidden Supabase Auth */}
          <div className="hidden">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={['google']}
              onlyThirdPartyProviders
              redirectTo={redirectTo}
              socialLayout="vertical"
            />
          </div>
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
