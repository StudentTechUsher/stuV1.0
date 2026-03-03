import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import GradPlanClient from './grad-plan-client';
import { GetAllGradPlans } from '@/lib/services/gradPlanService';
import { GetAiPrompt } from '@/lib/services/aiDbService';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import Link from 'next/link';

// Force dynamic rendering for this page because it uses cookies
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

interface GradPlanPageProps {
  searchParams?: SearchParams | Promise<SearchParams>;
}

function readReason(searchParams: SearchParams | undefined): string | undefined {
  const reasonParam = searchParams?.reason;
  if (Array.isArray(reasonParam)) return reasonParam[0];
  return reasonParam;
}

function SessionMissingMessage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-3">Session Expired</h1>
        <p className="text-[var(--muted-foreground)] mb-6">
          Your planning session is no longer available. Start a new session to continue building your graduation plan.
        </p>
        <Link
          href="/grad-plan/createV2"
          className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          Start New Planning Session
        </Link>
      </div>
    </div>
  );
}

export default async function GradPlanPage({ searchParams }: Readonly<GradPlanPageProps>) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const reason = readReason(resolvedSearchParams);

  if (reason === 'missing_session') {
    return <SessionMissingMessage />;
  }

  try {
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
  } catch (error) {
    console.error('❌ Page: Failed to load graduation planner', error);
    return <SessionMissingMessage />;
  }
}
