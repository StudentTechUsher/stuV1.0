import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { checkUserHasCourses } from '@/lib/chatbot/tools/transcriptCheckTool';
import CreatePlanClient from './create-plan-client';

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

export default async function CreateGradPlanPage() {
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

  return (
    <CreatePlanClient
      user={user}
      studentProfile={userProfile}
      hasCourses={hasCourses}
    />
  );
}
