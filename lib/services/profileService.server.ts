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
 * AUTHORIZATION: AUTHENTICATED USERS
 * Gets the university ID for a given user (server-side)
 * @param userId - The user's ID
 * @returns The university ID
 */
export async function getUserUniversityId(userId: string): Promise<number> {
  const supabase = await createSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('university_id')
    .eq('id', userId)
    .single();

  if (error) throw new ProfileFetchError('Failed to fetch university ID', error);

  const raw = data?.university_id;
  if (raw === undefined || raw === null) {
    throw new ProfileNotFoundError('profiles.university_id not set for this user');
  }

  return typeof raw === 'string' ? Number(raw) : raw;
}

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
export async function getStudentsWithProgramsServer(): Promise<AdvisorStudentRow[]> {
  try {
    const supabaseSrv = await createSupabaseServerComponentClient();
    const { data: profiles, error: profilesError } = await supabaseSrv
      .from('profiles')
      .select('id, fname, lname')
      .eq('role_id', 3);
    if (profilesError || !profiles?.length) return [];

    const profileIds = profiles.map(p => p.id);
    const { data: students, error: studentsError } = await supabaseSrv
      .from('student')
      .select('profile_id, selected_programs')
      .in('profile_id', profileIds);
    if (studentsError) return profiles.map(p => ({ id: p.id, fname: p.fname, lname: p.lname, programs: '' }));

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
    return profiles.map(p => {
      const ids = studentProgramsMap.get(p.id) || [];
      const names = ids.map(id => programNameMap.get(id)).filter(Boolean) as string[];
      return { id: p.id, fname: p.fname, lname: p.lname, programs: names.join(', ') };
    });
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
 * If no profile exists, creates one first
 * @param userId - The authenticated user's ID
 * @param universityId - The university ID to set
 * @param fname - The user's first name (optional)
 * @param lname - The user's last name (optional)
 */
export async function completeOnboarding(userId: string, universityId: number, fname?: string, lname?: string) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    // First, check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      // Profile doesn't exist, create it with the university and name
      const profileData: Record<string, unknown> = {
        id: userId,
        role_id: 3, // Default to student role
        university_id: universityId,
        onboarded: true,
      };

      if (fname) profileData.fname = fname;
      if (lname) profileData.lname = lname;

      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (insertError) {
        console.error('Profile insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw new ProfileUpdateError('Failed to create profile during onboarding', insertError);
      }
    } else {
      // Profile exists, update it
      const updateData: Record<string, unknown> = {
        university_id: universityId,
        onboarded: true,
      };

      if (fname) updateData.fname = fname;
      if (lname) updateData.lname = lname;

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        throw new ProfileUpdateError('Failed to complete onboarding', updateError);
      }
    }
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error completing onboarding', error);
  }
}
