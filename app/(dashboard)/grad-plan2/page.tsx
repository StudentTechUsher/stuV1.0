import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import GradPlan2Client from './grad-plan2-client';
import { GetAllGradPlans } from '@/lib/services/gradPlanService';

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

export default async function GradPlan2Page() {
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

  // Find active plan, or fallback to most recent plan
  let activePlan = allGradPlans.find(plan => plan.is_active) || null;

  // If no active plan, get most recent one
  if (!activePlan && allGradPlans.length > 0) {
    activePlan = allGradPlans.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  // Handle no plans state
  if (!activePlan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Graduation Plan Found</h2>
          <p className="text-muted-foreground mb-4">
            You don't have any graduation plans yet. Create one to get started!
          </p>
          {/* TODO: Add "Create New Plan" button here later */}
        </div>
      </div>
    );
  }

  return (
    <GradPlan2Client
      user={user}
      studentProfile={userProfile}
      gradPlan={activePlan}
    />
  );
}
