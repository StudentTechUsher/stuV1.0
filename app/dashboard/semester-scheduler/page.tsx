import SemesterScheduler from "@/components/scheduler/semester-scheduler";
import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { GetAllGradPlans } from '@/lib/services/gradPlanService';
import { redirect } from "next/navigation";

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

type GradPlanRecord = {
  id: string;
  plan_name?: string;
  is_active?: boolean;
  plan_details?: unknown;
  [key: string]: unknown;
};

export default async function SchedulerPage() {
  // Get the verified user
  const user = await getVerifiedUser();
  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const userProfile = await getVerifiedUserProfile();
  if (!userProfile) {
    return <div>Profile not found</div>;
  }

  // Load graduation plans
  const allGradPlans: GradPlanRecord[] = userProfile.id ? await GetAllGradPlans(userProfile.id) : [];

  // Convert to the format expected by the scheduler
  const formattedGradPlans = allGradPlans.map(plan => ({
    id: plan.id,
    name: plan.plan_name || `Graduation Plan ${plan.id}`,
    isActive: plan.is_active || false,
    requiredCourses: { major: 4, minor: 1, ge: 2, elective: 1, rel: 1 }, // Default requirements
  }));

  return <SemesterScheduler gradPlans={formattedGradPlans} />;
}
