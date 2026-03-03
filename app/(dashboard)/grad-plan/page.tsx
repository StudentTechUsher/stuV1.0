import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import GradPlanClient from './grad-plan-client';
import { GetAllGradPlans } from '@/lib/services/gradPlanService';
import { GetAiPrompt } from '@/lib/services/aiDbService';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

export default async function GradPlanPage() {
  // Get the verified user (includes session validation)
  const user = await getVerifiedUser();

  if (!user) {
    console.error('❌ Page: No verified user found');
    return <div>Authentication required</div>;
  }

  // Get user profile with university_id
  const userProfile = await getVerifiedUserProfile();

  if (!userProfile) {
    console.error('❌ Page: No user profile found');
    return <div>Profile not found</div>;
  }

  // Get all graduation plans for this student
  const allGradPlans = userProfile.id ? await GetAllGradPlans(userProfile.id) : [];

  // Get user's completed courses for the left panel
  const supabase = await createSupabaseServerComponentClient();
  const userCourses = userProfile.id
    ? await fetchUserCoursesArray(supabase, userProfile.id)
    : [];

  // Get AI prompt for organizing grad plan
  const prompt = (await GetAiPrompt('organize_grad_plan')) ?? '';

  // Find active plan, or fallback to most recent plan
  let activePlan = allGradPlans.find(plan => plan.is_active) || null;

  // If no active plan, get most recent one
  if (!activePlan && allGradPlans.length > 0) {
    activePlan = allGradPlans.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  return (
    <GradPlanClient
      user={user}
      studentProfile={userProfile}
      gradPlan={activePlan}
      allGradPlans={allGradPlans}
      prompt={prompt}
      userCourses={userCourses}
    />
  );
}
