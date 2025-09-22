import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import GradPlanClient from "@/components/grad-planner/grad-plan-client";
import GetProgramsForUniversity, { GetAllGradPlans, GetGenEdsForUniversity } from '@/lib/api/server-actions';

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

  // STEP 4: Get programs data and general education data for user's university
  const programsData = userProfile.university_id ? await GetProgramsForUniversity(userProfile.university_id) : [];
  const genEdData = userProfile.university_id ? await GetGenEdsForUniversity(userProfile.university_id) : [];

  // Log status for debugging (remove in production)
  console.log(`📋 Grad Plan Page - User: ${user.id}, Profile: ${userProfile.id}, Plans: ${allGradPlans.length}, Active: ${activeGradPlan ? 'Found' : 'None'}`);

  return (
    <GradPlanClient 
      user={user}
      studentRecord={userProfile}
      allGradPlans={allGradPlans}
      activeGradPlan={activeGradPlan}
      programsData={programsData}
      genEdData={genEdData}
    />
  );
}
