"use server";

/**
 * SERVER-SIDE Profile Service
 *
 * This module contains server-side functions that run only on the server.
 * These functions use the server-based Supabase client with cookie-based authentication.
 *
 * WHEN TO USE:
 * - Call these functions in React Server Components
 * - Use in Server Actions
 * - When you need server-side data fetching with direct server access
 * - Can bypass RLS if needed (though not recommended without authorization checks)
 *
 * DO NOT USE:
 * - In Client Components (components with "use client")
 * - For that, use @/lib/services/profileService.ts instead
 *
 * WHY SEPARATE FILES:
 * - Next.js App Router requires strict separation between client and server code
 * - The "use server" directive cannot be mixed with client-side imports
 * - Prevents bundling server-only code (like next/headers) into client bundles
 *
 * @see profileService.ts - Client-side equivalent
 */

import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import type { AdvisorStudentRow } from './profileService';
import { ProfileNotFoundError, ProfileUpdateError, ProfileFetchError } from './errors/profileErrors';

/**
 * AUTHORIZATION: SYSTEM ONLY (called from auth callback)
 * Ensures a profile exists for a user. Creates one if it doesn't exist.
 * This is a safe operation that won't overwrite existing profiles.
 *
 * @param userId - The auth user ID
 * @param email - The user's email address
 * @returns true if profile exists or was created, false on error
 */
export async function ensureProfileExists(userId: string, email: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerComponentClient();

    // First check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // Profile already exists, nothing to do
    if (existingProfile) {
      return true;
    }

    // Create new profile with minimal required fields
    // Default role_id is 3 (student) - can be changed later by admins
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        role_id: 3, // Default to student role
        onboarded: false,
        authorization_agreed: false
      });

    if (insertError) {
      console.error('Error creating profile:', insertError);
      return false;
    }

    console.log('✅ Created new profile for user:', userId);
    return true;
  } catch (error) {
    console.error('Error in ensureProfileExists:', error);
    return false;
  }
}

/** Server-side variant to be called in RSC pages (avoids exposing multiple round trips client-side). */
/**
 * Generate Gravatar URL from email address
 * @param email - User's email address
 * @returns Gravatar URL
 */
async function getGravatarUrl(email: string): Promise<string> {
  // Create MD5 hash of email (Gravatar requires lowercase, trimmed email)
  // Using dynamic import for Node.js crypto module (server-side only)
  const crypto = await import('crypto');
  const hash = crypto
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex');

  // d=404 means return 404 if no Gravatar exists (we'll handle fallback in UI)
  // d=mp generates a generic "mystery person" silhouette
  // s=200 sets size to 200px
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
}

export async function getStudentsWithProgramsServer(): Promise<AdvisorStudentRow[]> {
  try {
    const supabaseSrv = await createSupabaseServerComponentClient();
    const { data: profiles, error: profilesError } = await supabaseSrv
      .from('profiles')
      .select('id, fname, lname')
      .eq('role_id', 3);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return [];
    }
    if (!profiles?.length) {
      console.log('ℹ️ No student profiles found (role_id = 3)');
      return [];
    }

    const profileIds = profiles.map(p => p.id);
    const { data: students, error: studentsError } = await supabaseSrv
      .from('student')
      .select('profile_id, selected_programs')
      .in('profile_id', profileIds);
    if (studentsError) return profiles.map(p => ({ id: p.id, fname: p.fname, lname: p.lname, programs: '', avatar_url: null }));

    const programIds = new Set<number>();
    const studentProgramsMap = new Map<string, number[]>();
    students?.forEach(s => {
      const list = Array.isArray(s.selected_programs)
        ? s.selected_programs.filter((x: unknown): x is number => Number.isInteger(x))
        : [];
      studentProgramsMap.set(s.profile_id, list);
      list.forEach(id => programIds.add(id));
    });

    let programNameMap = new Map<number, string>();
    if (programIds.size) {
      const { data: programs, error: programsError } = await supabaseSrv
        .from('program')
        .select('id, name')
        .in('id', Array.from(programIds));
      if (!programsError && programs) {
        programNameMap = new Map(programs.map(p => [p.id, p.name]));
      }
    }

    // Fetch email addresses from auth.users and generate Gravatar URLs
    const emailMap = new Map<string, string>();
    try {
      for (const profileId of profileIds) {
        try {
          const { data: userData, error: userError } = await supabaseSrv.auth.admin.getUserById(profileId);
          if (!userError && userData?.user?.email) {
            emailMap.set(profileId, userData.user.email);
          }
        } catch (userError) {
          console.error(`Failed to fetch email for user ${profileId}:`, userError);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user emails:', error);
    }

    // Generate Gravatar URLs for each student based on their email
    const result = await Promise.all(profiles.map(async p => {
      const ids = studentProgramsMap.get(p.id) || [];
      const names = ids.map(id => programNameMap.get(id)).filter(Boolean) as string[];
      const email = emailMap.get(p.id);
      return {
        id: p.id,
        fname: p.fname,
        lname: p.lname,
        programs: names.join(', '),
        avatar_url: email ? await getGravatarUrl(email) : null
      };
    }));

    console.log(`✅ Returning ${result.length} students with Gravatar URLs:`,
      result.map(r => ({ name: `${r.fname} ${r.lname}`, email: emailMap.get(r.id), avatar_url: r.avatar_url }))
    );

    return result;
  } catch (error) {
    console.error('❌ Server fetch students failed:', error);
    return [];
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS (fetching their own profile)
 * Fetches the authenticated user's profile
 * @param userId - The authenticated user's ID
 * @returns The user's profile data
 */
export async function fetchMyProfile(userId: string) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ProfileNotFoundError();
      }
      throw new ProfileFetchError('Failed to fetch profile', error);
    }

    if (!profile) {
      throw new ProfileNotFoundError();
    }

    return profile;
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof ProfileFetchError) {
      throw error;
    }
    throw new ProfileFetchError('Unexpected error fetching profile', error);
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS (updating their own targeted career)
 * Updates a student's targeted career field
 * @param userId - The authenticated user's ID (profile_id in student table)
 * @param careerTitle - The career title to set
 */
export async function updateStudentTargetedCareer(userId: string, careerTitle: string) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { error } = await supabase
      .from('student')
      .update({ targeted_career: careerTitle })
      .eq('profile_id', userId);

    if (error) {
      throw new ProfileUpdateError('Failed to update targeted career', error);
    }
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error updating targeted career', error);
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS (updating their own profile)
 * Updates profile fields for the authenticated user
 * @param userId - The authenticated user's ID
 * @param updates - Object containing fields to update
 */
export async function updateProfile(userId: string, updates: Record<string, string | null>) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      throw new ProfileUpdateError('Failed to update profile', error);
    }
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error updating profile', error);
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS (completing their own onboarding)
 * Completes the onboarding process by setting university and marking as onboarded
 * @param userId - The authenticated user's ID
 * @param universityId - The university ID to set
 */
export async function completeOnboarding(userId: string, universityId: number) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { error } = await supabase
      .from('profiles')
      .update({
        university_id: universityId,
        onboarded: true,
      })
      .eq('id', userId);

    if (error) {
      throw new ProfileUpdateError('Failed to complete onboarding', error);
    }
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error completing onboarding', error);
  }
}
