/**
 * Authorization Service
 *
 * Centralized authorization helpers that use the new user_roles table
 * for database-enforced authorization.
 *
 * These functions use supabaseAdmin (service_role) to bypass RLS and
 * provide authoritative authorization checks.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

// =============================================================================
// Custom Error Classes
// =============================================================================

export class AuthorizationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class RoleNotFoundError extends Error {
  constructor(message = 'User role not found') {
    super(message);
    this.name = 'RoleNotFoundError';
  }
}

// =============================================================================
// Type Definitions
// =============================================================================

export type UserRole = 'student' | 'advisor' | 'university_admin' | 'super_admin';

export interface UserRoleRecord {
  id: number;
  user_id: string;
  role: UserRole;
  university_id: number | null;
  granted_at: string;
  granted_by: string | null;
}

// =============================================================================
// Core Authorization Functions
// =============================================================================

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Check if a user has a specific role
 *
 * @param userId - The user's UUID
 * @param role - The role to check for
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    if (error) {
      // PGRST116 = no rows returned (user doesn't have this role)
      if (error.code === 'PGRST116') {
        return false;
      }
      throw new AuthorizationError(`Failed to check role for user ${userId}`, error);
    }

    return !!data;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('hasRole error:', error);
    throw new AuthorizationError('Failed to check user role', error);
  }
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Get all roles for a user
 *
 * @param userId - The user's UUID
 * @returns Array of role records for the user
 */
export async function getUserRoles(userId: string): Promise<UserRoleRecord[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new AuthorizationError(`Failed to fetch roles for user ${userId}`, error);
    }

    return data || [];
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('getUserRoles error:', error);
    throw new AuthorizationError('Failed to fetch user roles', error);
  }
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Check if a user is an advisor of a specific student
 *
 * Checks both:
 * 1. Direct advisor-student relationship (advisor_students table)
 * 2. Advisor-program relationship (if advisor has access to student's programs)
 *
 * @param advisorId - The advisor's UUID
 * @param studentId - The student's UUID (profile_id)
 * @returns true if advisor has access to this student
 */
export async function isAdvisorOfStudent(
  advisorId: string,
  studentId: string
): Promise<boolean> {
  try {
    // Check 1: Direct advisor-student relationship
    const { data: directRelationship, error: directError } = await supabaseAdmin
      .from('advisor_students')
      .select('id')
      .eq('advisor_id', advisorId)
      .eq('student_id', studentId)
      .single();

    if (directError && directError.code !== 'PGRST116') {
      throw new AuthorizationError('Failed to check direct advisor relationship', directError);
    }

    if (directRelationship) {
      return true;
    }

    // Check 2: Advisor-program relationship
    // Get student's programs
    const { data: student, error: studentError } = await supabaseAdmin
      .from('student')
      .select('selected_programs')
      .eq('profile_id', studentId)
      .single();

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        // Student not found
        return false;
      }
      throw new AuthorizationError('Failed to fetch student programs', studentError);
    }

    if (!student?.selected_programs || student.selected_programs.length === 0) {
      return false;
    }

    // Check if advisor has access to any of the student's programs
    const { data: advisorPrograms, error: programError } = await supabaseAdmin
      .from('advisor_programs')
      .select('program_id')
      .eq('advisor_id', advisorId)
      .in('program_id', student.selected_programs);

    if (programError) {
      throw new AuthorizationError('Failed to check advisor program access', programError);
    }

    return (advisorPrograms?.length || 0) > 0;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('isAdvisorOfStudent error:', error);
    throw new AuthorizationError('Failed to check advisor-student relationship', error);
  }
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Check if a user is a university admin of a specific university
 *
 * @param userId - The user's UUID
 * @param universityId - The university ID to check
 * @returns true if user is admin of this university (or super_admin)
 */
export async function isUniversityAdminOf(
  userId: string,
  universityId: number
): Promise<boolean> {
  try {
    // Check if user is super_admin (has access to all universities)
    const { data: superAdmin, error: superError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .single();

    if (superError && superError.code !== 'PGRST116') {
      throw new AuthorizationError('Failed to check super_admin role', superError);
    }

    if (superAdmin) {
      return true;
    }

    // Check if user is university_admin for this specific university
    const { data: uniAdmin, error: uniError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'university_admin')
      .eq('university_id', universityId)
      .single();

    if (uniError && uniError.code !== 'PGRST116') {
      throw new AuthorizationError('Failed to check university_admin role', uniError);
    }

    return !!uniAdmin;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('isUniversityAdminOf error:', error);
    throw new AuthorizationError('Failed to check university admin status', error);
  }
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Check if a user has the advisor role
 *
 * @param userId - The user's UUID
 * @returns true if user is an advisor
 */
export async function isAdvisor(userId: string): Promise<boolean> {
  return hasRole(userId, 'advisor');
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Check if a user has the student role
 *
 * @param userId - The user's UUID
 * @returns true if user is a student
 */
export async function isStudent(userId: string): Promise<boolean> {
  return hasRole(userId, 'student');
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Check if a user is a super admin
 *
 * @param userId - The user's UUID
 * @returns true if user is a super_admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'super_admin');
}

/**
 * AUTHORIZATION: SERVER-SIDE ONLY (uses service_role)
 * Get the user's university ID from their profile
 *
 * @param userId - The user's UUID
 * @returns The university ID or null if not found
 */
export async function getUserUniversityId(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('university_id')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new AuthorizationError('Failed to fetch user university ID', error);
    }

    return data?.university_id || null;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('getUserUniversityId error:', error);
    throw new AuthorizationError('Failed to get user university ID', error);
  }
}

// =============================================================================
// Role Management Functions (Admin Only)
// =============================================================================

/**
 * AUTHORIZATION: SUPER_ADMIN or UNIVERSITY_ADMIN ONLY
 * Grant a role to a user
 *
 * @param userId - The user to grant the role to
 * @param role - The role to grant
 * @param universityId - The university context (required for most roles)
 * @param grantedBy - The user granting the role
 */
export async function grantRole(
  userId: string,
  role: UserRole,
  universityId: number | null,
  grantedBy: string
): Promise<UserRoleRecord> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        university_id: universityId,
        granted_by: grantedBy,
      })
      .select()
      .single();

    if (error) {
      throw new AuthorizationError(`Failed to grant role ${role} to user ${userId}`, error);
    }

    return data;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('grantRole error:', error);
    throw new AuthorizationError('Failed to grant role', error);
  }
}

/**
 * AUTHORIZATION: SUPER_ADMIN or UNIVERSITY_ADMIN ONLY
 * Revoke a role from a user
 *
 * @param userId - The user to revoke the role from
 * @param role - The role to revoke
 */
export async function revokeRole(userId: string, role: UserRole): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      throw new AuthorizationError(`Failed to revoke role ${role} from user ${userId}`, error);
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    console.error('revokeRole error:', error);
    throw new AuthorizationError('Failed to revoke role', error);
  }
}
