/**
 * CLIENT-SIDE Profile Service
 *
 * This module contains client-side functions that use the browser-based Supabase client.
 * These functions rely on Row Level Security (RLS) for authorization.
 *
 * WHEN TO USE:
 * - Import these functions in Client Components (components with "use client")
 * - Use when you need to interact with Supabase from the browser
 * - User authentication is handled via browser session
 *
 * DO NOT USE:
 * - In Server Components or Server Actions
 * - For that, use @/lib/services/profileService.server.ts instead
 *
 * @see profileService.server.ts - Server-side equivalent
 */

import { supabase } from '@/lib/supabaseClient';

export async function getUserUniversityId(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', userId)
        .single();

    if (error) throw error;
    const raw = data?.university_id;
    if (raw === undefined || raw === null) {
        throw new Error('profiles.university_id not set for this user');
    }
    return typeof raw === 'string' ? Number(raw) : raw;
}

// Shape returned for advisor student roster table
export interface AdvisorStudentRow {
    id: string; // profile id (UUID)
    fname: string;
    lname: string;
    programs: string; // comma separated list of program names (empty string if none)
    avatar_url?: string | null; // profile picture URL from auth metadata
}

/**
 * Fetch students (profiles with role_id = 3) along with a comma-separated list of their selected program names.
 * This runs client-side with the browser supabase client and depends on RLS to ensure the caller is authorized (advisor/admin).
 * For stricter access or to avoid exposing structure, create a server route wrapper.
 */
export async function getStudentsWithPrograms(): Promise<AdvisorStudentRow[]> {
    // 1. Get all profiles that are students (role_id = 3)
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, fname, lname')
        .eq('role_id', 3);

    if (profilesError) {
        console.error('❌ Error fetching student profiles:', profilesError);
        return [];
    }
    if (!profiles || profiles.length === 0) return [];

    const profileIds = profiles.map(p => p.id);

    // 2. Map profiles -> student rows to access selected_programs
    const { data: students, error: studentsError } = await supabase
        .from('student')
        .select('id, profile_id, selected_programs')
        .in('profile_id', profileIds);

    if (studentsError) {
        console.error('❌ Error fetching student rows:', studentsError);
        return profiles.map(p => ({ id: p.id, fname: p.fname, lname: p.lname, programs: '' }));
    }

    const programIds = new Set<number>();
    const studentProgramsMap = new Map<string, number[]>(); // profile_id -> number[]

    students?.forEach(s => {
        const list = Array.isArray(s.selected_programs) 
            ? s.selected_programs.filter((x: unknown): x is number => Number.isInteger(x)) 
            : [];
        studentProgramsMap.set(s.profile_id, list);
        list.forEach(id => programIds.add(id));
    });

    // 3. Fetch program names for all referenced ids
    let programNameMap = new Map<number, string>();
    if (programIds.size > 0) {
        const { data: programs, error: programsError } = await supabase
            .from('program')
            .select('id, name')
            .in('id', Array.from(programIds));
        if (programsError) {
            console.error('❌ Error fetching program names:', programsError);
        } else {
            programNameMap = new Map(programs.map(p => [p.id, p.name]));
        }
    }

    // 4. Assemble final rows
    return profiles.map(p => {
        const ids = studentProgramsMap.get(p.id) || [];
        const names = ids.map(id => programNameMap.get(id)).filter(Boolean) as string[];
        return {
            id: p.id,
            fname: p.fname,
            lname: p.lname,
            programs: names.join(', ')
        };
    });
}

/** Server-side variant to be called in RSC pages (avoids exposing multiple round trips client-side). */
// NOTE: The server-side variant has been moved to profileService.server.ts to avoid bundling server-only
// next/headers usage into client modules. Import getStudentsWithProgramsServer from:
//   '@/lib/services/profileService.server'

/**
 * Persist a targeted career string for the authenticated student profile.
 * Assumes a `student` table with columns: profile_id (FK to profiles.id), targeted_career (text).
 * Relies on RLS allowing the current user to update their own student row.
 */
export async function saveTargetedCareerClient(careerTitle: string): Promise<{ success: boolean; error?: string }> {
    const title = careerTitle.trim();
    if (!title) return { success: false, error: 'Empty career title' };
    // Ensure we have current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { error: updateError } = await supabase
        .from('student')
        .update({ targeted_career: title })
        .eq('profile_id', user.id);

    if (updateError) return { success: false, error: updateError.message };
    return { success: true };
}

/**
 * Update profile fields for the authenticated user.
 * Updates fields like est_grad_date, est_grad_sem, career_goals in the profiles table.
 * Relies on RLS allowing the current user to update their own profile row.
 */
export async function updateProfileClient(updates: Record<string, string | null>): Promise<{ success: boolean; error?: string }> {
    // Ensure we have current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (updateError) return { success: false, error: updateError.message };
    return { success: true };
}