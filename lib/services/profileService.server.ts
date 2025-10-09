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
      const list = Array.isArray(s.selected_programs) ? s.selected_programs.filter((x: any) => Number.isInteger(x)) : [];
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
  } catch (e) {
    console.error('❌ Server fetch students failed:', e);
    return [];
  }
}
