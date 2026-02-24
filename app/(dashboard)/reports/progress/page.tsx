/**
 * Progress Report Page (Server Component)
 * Fetches student data and active grad plan, then renders the progress report client.
 * Includes transcript courses so the report can show accurate completion status.
 */

import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { GetAllGradPlans } from '@/lib/services/gradPlanService';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { ProgressReportClient } from './progress-report-client';

export const dynamic = 'force-dynamic';

export default async function ProgressReportPage() {
  // Get the verified user
  const user = await getVerifiedUser();
  if (!user) {
    return <div className="p-4">Authentication required</div>;
  }

  // Get user profile
  const userProfile = await getVerifiedUserProfile();
  if (!userProfile) {
    return <div className="p-4">Profile not found</div>;
  }

  // Get all graduation plans for this student
  const allGradPlans = userProfile.id ? await GetAllGradPlans(userProfile.id) : [];

  // Find active plan, or fallback to most recent plan
  let activePlan = allGradPlans.find((plan) => plan.is_active) || null;

  // If no active plan, get most recent one
  if (!activePlan && allGradPlans.length > 0) {
    activePlan = allGradPlans.sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0];
  }

  // Fetch transcript courses so buildPlanProgress can derive completion from transcript data
  // This is the fix for 0% completion when plan courses lack isCompleted markers
  const supabase = await createSupabaseServerComponentClient();
  const transcriptCourses = await fetchUserCoursesArray(supabase, user.id).catch(() => []);

  return (
    <ProgressReportClient
      user={user}
      userProfile={userProfile}
      activePlan={activePlan}
      transcriptCourses={transcriptCourses}
    />
  );
}
