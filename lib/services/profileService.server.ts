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
 * AUTHORIZATION: SYSTEM/INTERNAL USE
 * Fetches basic profile information (name and email) for a user
 * Used for sending notifications and emails
 * @param userId - The user's ID
 * @returns Profile info or null if not found
 */
export async function fetchProfileBasicInfo(userId: string): Promise<{ fname: string; lname: string; email: string } | null> {
  try {
    const supabase = await createSupabaseServerComponentClient();

    // Fetch name from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('fname, lname')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile basic info:', profileError);
      return null;
    }

    if (!profile) {
      return null;
    }

    // Fetch email from auth.users using admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      console.error('Error fetching user email:', userError);
      return null;
    }

    return {
      fname: profile.fname,
      lname: profile.lname,
      email: user.email,
    };
  } catch (error) {
    console.error('Unexpected error fetching profile basic info:', error);
    return null;
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
 * AUTHORIZATION: AUTHENTICATED STUDENTS (updating their own student record)
 * Updates student fields for the authenticated user
 * @param userId - The authenticated user's ID (profile_id in student table)
 * @param updates - Object containing fields to update
 */
export async function updateStudent(userId: string, updates: Record<string, string | null>) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { error } = await supabase
      .from('student')
      .update(updates)
      .eq('profile_id', userId);

    if (error) {
      throw new ProfileUpdateError('Failed to update student record', error);
    }
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error updating student record', error);
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS (completing their own onboarding)
 * Completes the onboarding process by setting university, role, and marking as onboarded
 * If no profile exists, creates one first
 * For students: creates a student record and sets onboarded to true
 * For advisors/admins: sets role but keeps onboarded as false (pending admin approval)
 * @param userId - The authenticated user's ID
 * @param universityId - The university ID to set
 * @param role - The user's role ('student', 'advisor', or 'admin')
 * @param fname - The user's first name (optional)
 * @param lname - The user's last name (optional)
 * @param email - The user's email address (optional)
 * @param estGradSem - Expected graduation semester (required for students)
 * @param estGradDate - Expected graduation date (required for students)
 */
export async function completeOnboarding(
  userId: string,
  universityId: number,
  role: 'student' | 'advisor' | 'admin',
  fname?: string,
  lname?: string,
  email?: string,
  estGradSem?: string,
  estGradDate?: string
) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    // Map role string to role_id
    const roleIdMap = {
      admin: 1,
      advisor: 2,
      student: 3,
    };
    const roleId = roleIdMap[role];

    // Students get onboarded immediately, advisors/admins need admin approval
    const shouldBeOnboarded = role === 'student';

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
        role_id: roleId,
        university_id: universityId,
        onboarded: shouldBeOnboarded,
      };

      if (fname) profileData.fname = fname;
      if (lname) profileData.lname = lname;
      if (email) profileData.email = email;

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
        role_id: roleId,
        onboarded: shouldBeOnboarded,
      };

      if (fname) updateData.fname = fname;
      if (lname) updateData.lname = lname;
      if (email) updateData.email = email;

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        throw new ProfileUpdateError('Failed to complete onboarding', updateError);
      }
    }

    // If role is student, create a student record
    if (role === 'student') {
      // Check if student record already exists
      const { data: existingStudent } = await supabase
        .from('student')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle();

      if (!existingStudent) {
        const studentData: Record<string, unknown> = {
          profile_id: userId,
          selected_programs: [],
          selected_interests: [],
          class_preferences: [],
        };

        if (estGradSem) studentData.est_grad_term = estGradSem;
        if (estGradDate) studentData.est_grad_date = estGradDate;

        const { error: studentInsertError } = await supabase
          .from('student')
          .insert(studentData);

        if (studentInsertError) {
          console.error('Student record insert error:', studentInsertError);
          throw new ProfileUpdateError('Failed to create student record', studentInsertError);
        }
      } else {
        // Update existing student record with graduation info
        const studentUpdateData: Record<string, unknown> = {};
        if (estGradSem) studentUpdateData.est_grad_term = estGradSem;
        if (estGradDate) studentUpdateData.est_grad_date = estGradDate;

        if (Object.keys(studentUpdateData).length > 0) {
          const { error: studentUpdateError } = await supabase
            .from('student')
            .update(studentUpdateData)
            .eq('profile_id', userId);

          if (studentUpdateError) {
            console.error('Student record update error:', studentUpdateError);
            throw new ProfileUpdateError('Failed to update student record', studentUpdateError);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error completing onboarding', error);
  }
}

/**
 * AUTHORIZATION: ADVISORS AND ADMINS ONLY
 * Fetches all pending students (onboarded = false) for approval
 * @returns Array of pending student profiles
 */
interface PendingStudent {
  id: string;
  email: string | null;
  fname: string | null;
  lname: string | null;
  created_at: string;
  university_id: number;
  university: {
    id: number;
    name: string;
  } | null;
}

export async function fetchPendingStudents(): Promise<PendingStudent[]> {
  const supabase = await createSupabaseServerComponentClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      fname,
      lname,
      created_at,
      university_id,
      university:university_id(id, name)
    `)
    .eq('role_id', 3) // Students only
    .eq('onboarded', false) // Not yet approved
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch pending students:', error);
    throw new ProfileFetchError('Failed to fetch pending students', error);
  }

  if (!data) return [];

  // Transform the data to ensure correct types
  return data.map((student) => ({
    id: student.id,
    email: student.email,
    fname: student.fname,
    lname: student.lname,
    created_at: student.created_at,
    university_id: student.university_id,
    university: Array.isArray(student.university)
      ? student.university[0] || null
      : student.university,
  })) as PendingStudent[];
}

/**
 * AUTHORIZATION: ADVISORS AND ADMINS ONLY
 * Approves a pending student by updating their name, setting onboarded=true, and creating student record
 * @param studentId - The student's profile ID
 * @param fname - First name
 * @param lname - Last name
 */
export async function approveStudent(
  studentId: string,
  fname: string,
  lname: string
) {
  const supabase = await createSupabaseServerComponentClient();

  try {
    // Step 1: Update profile with name and onboarded status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        fname,
        lname,
        onboarded: true,
      })
      .eq('id', studentId)
      .eq('role_id', 3); // Safety check: only update students

    if (profileError) {
      console.error('Failed to update student profile:', profileError);
      throw new ProfileUpdateError('Failed to update student profile', profileError);
    }

    // Step 2: Create student record
    const { error: studentError } = await supabase
      .from('student')
      .insert({
        profile_id: studentId,
        selected_programs: [],
        year_in_school: 'Freshman', // Default value
      });

    if (studentError) {
      // Check if student record already exists
      if (studentError.code === '23505') {
        console.warn('Student record already exists for profile:', studentId);
      } else {
        console.error('Failed to create student record:', studentError);
        throw new ProfileUpdateError('Failed to create student record', studentError);
      }
    }

    console.log('Student approved successfully:', studentId);
  } catch (error) {
    if (error instanceof ProfileUpdateError) {
      throw error;
    }
    throw new ProfileUpdateError('Unexpected error approving student', error);
  }
}

/**
 * AUTHORIZATION: AUTHENTICATED USERS
 * Checks if a student record exists for the given user
 * @param userId - The user's profile ID
 * @returns True if student record exists, false otherwise
 */
export async function hasStudentRecord(userId: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { data, error } = await supabase
      .from('student')
      .select('profile_id')
      .eq('profile_id', userId)
      .single();

    if (error) {
      // PGRST116 means no rows returned - student record doesn't exist
      if (error.code === 'PGRST116') {
        return false;
      }
      // Other errors should be logged but we'll return false to be safe
      console.error('Error checking student record:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Unexpected error checking student record:', error);
    return false;
  }
}
