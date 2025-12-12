'use client';

import { useEffect } from 'react';
import { usePostHog } from '@/contexts/posthog-provider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  university_id?: number;
  role_id?: number;
  year_in_school?: string;
  created_at?: string;
}

// Role mapping
const ROLE_MAP: Record<number, string> = {
  1: 'admin',
  2: 'advisor',
  3: 'student',
};

/**
 * Hook to automatically identify PostHog users based on Supabase auth
 * Call this in authenticated layouts/pages
 */
export function usePostHogIdentify() {
  const { identifyUser, resetUser, isReady } = usePostHog();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!isReady) return;

    let subscription: { unsubscribe: () => void } | null = null;

    const identifyCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile for additional safe properties
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, university_id, role_id, year_in_school, created_at')
          .eq('id', user.id)
          .single();

        if (profile) {
          // Identify user with FERPA-safe properties only
          identifyUser(user.id, {
            university_id: profile.university_id,
            role: profile.role_id ? ROLE_MAP[profile.role_id] : 'student',
            year_in_school: profile.year_in_school,
            created_at: profile.created_at,
          });
        } else {
          // Just identify with user ID
          identifyUser(user.id);
        }
      } else {
        // User logged out
        resetUser();
      }
    };

    // Identify on mount
    identifyCurrentUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        identifyCurrentUser();
      } else {
        resetUser();
      }
    });

    subscription = authListener.subscription;

    return () => {
      subscription?.unsubscribe();
    };
  }, [identifyUser, resetUser, isReady, supabase]);
}
