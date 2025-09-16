import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import GradPlanClient from "@/components/grad-planner/grad-plan-client";
import GetProgramsForUniversity, { GetActiveGradPlan, GetGenEdsForUniversity } from '@/lib/api/server-actions';

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

  // STEP 3: Get graduation plan record
  // This may return null for new users - that's expected behavior
  const gradPlanRecord = userProfile.id ? await GetActiveGradPlan(userProfile.id) : null;

  // STEP 4: Get programs data and general education data for user's university
  const programsData = userProfile.university_id ? await GetProgramsForUniversity(userProfile.university_id) : [];
  const genEdData = userProfile.university_id ? await GetGenEdsForUniversity(userProfile.university_id) : [];

  // Log status for debugging (remove in production)
  console.log(`📋 Grad Plan Page - User: ${user.id}, Profile: ${userProfile.id}, Plan: ${gradPlanRecord ? 'Found' : 'None'}`);

  return (
    <GradPlanClient 
      user={user}
      studentRecord={userProfile}
      gradPlanRecord={gradPlanRecord}
      programsData={programsData}
      genEdData={genEdData}
    />
  );
}
