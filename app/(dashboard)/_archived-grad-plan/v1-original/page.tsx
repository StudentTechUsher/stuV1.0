import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import GradPlanClient from "@/components/grad-planner/grad-plan-client";
import { GetAllGradPlans } from '@/lib/services/gradPlanService';
import { GetAiPrompt } from '@/lib/services/aiDbService';

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

export default async function GradPlanPage() {

  // STEP 1: Get the verified user (includes session validation)
  const user = await getVerifiedUser();

  if (!user) {
    // This shouldn't happen due to middleware, but handle gracefully
    console.error('❌ Page: No verified user found');
    return <div>Authentication required</div>;
  }

  // STEP 2: Get user profile with university_id
  const userProfile = await getVerifiedUserProfile();

  if (!userProfile) {
    console.error('❌ Page: No user profile found');
    return <div>Profile not found</div>;
  }

  // STEP 3: Get all graduation plan records for this student
  // This may return empty array for new users - that's expected behavior
  const allGradPlans = userProfile.id ? await GetAllGradPlans(userProfile.id) : [];

  // Find the currently active plan from all plans
  const activeGradPlan = allGradPlans.find(plan => plan.is_active) || null;

  // STEP 4: Get AI prompt for organizing grad plan
  // Program data will be fetched dynamically on the client side when needed
  const prompt = (await GetAiPrompt('organize_grad_plan')) ?? '';

  return (
    <GradPlanClient
      user={user}
      studentRecord={userProfile}
      allGradPlans={allGradPlans}
      activeGradPlan={activeGradPlan}
      prompt={prompt}
    />
  );
}
