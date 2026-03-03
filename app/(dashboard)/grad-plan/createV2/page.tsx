import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { checkUserHasCourses } from '@/lib/chatbot/tools/transcriptCheckTool';
import { checkUserHasActivePlan } from '@/lib/services/gradPlanService';
import { fetchUniversityAcademicTerms } from '@/lib/services/institutionService';
import { isGradPlanAutomaticMastraWorkflowEnabled } from '@/lib/config/featureFlags';
import CreatePlanClientV2 from './create-plan-client-v2';

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

export default async function CreateGradPlanV2Page() {
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

  // Check if user has courses uploaded
  const hasCourses = await checkUserHasCourses(user.id);

  // Check if user has an active grad plan
  const hasActivePlan = await checkUserHasActivePlan(user.id);

  // Fetch academic terms configuration for the university
  const academicTerms = await fetchUniversityAcademicTerms(userProfile.university_id);
  const automaticMastraWorkflowEnabled = isGradPlanAutomaticMastraWorkflowEnabled();

  return (
    <CreatePlanClientV2
      user={user}
      studentProfile={userProfile}
      hasCourses={hasCourses}
      hasActivePlan={hasActivePlan}
      academicTerms={academicTerms}
      automaticMastraWorkflowEnabled={automaticMastraWorkflowEnabled}
    />
  );
}
