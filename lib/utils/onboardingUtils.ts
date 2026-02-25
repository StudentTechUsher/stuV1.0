/**
 * Determines if a user needs to complete onboarding based on their profile data.
 * A user needs onboarding if ANY of the following are true:
 * - university_id is null/undefined
 * - role_id is null/undefined
 * - role is student (role_id === 3) and onboarded is not explicitly true
 */
export function needsOnboarding(profile: {
  university_id?: number | null;
  role_id?: number | null;
  onboarded?: boolean | null;
}): boolean {
  const missingUniversity = profile.university_id === null || profile.university_id === undefined;
  const missingRole = profile.role_id === null || profile.role_id === undefined;
  if (missingUniversity || missingRole) {
    return true;
  }

  const isStudent = profile.role_id === 3;
  const studentNotOnboarded = isStudent && profile.onboarded !== true;
  return studentNotOnboarded;
}
