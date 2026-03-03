/**
 * Test Grad Plan Pipeline - Server Component
 *
 * Test page for validating the graduation plan orchestration layer.
 * Provides tools to test each step of the pipeline in isolation and as a whole.
 */

import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { checkUserHasCourses } from '@/lib/chatbot/tools/transcriptCheckTool';
import { checkUserHasActivePlan } from '@/lib/services/gradPlanService';
import { fetchUniversityAcademicTerms } from '@/lib/services/institutionService';
import TestPipelineClient from './test-pipeline-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TestGradPlanPipelinePage() {
  // Get the verified user (includes session validation)
  const user = await getVerifiedUser();

  if (!user) {
    return <div>Authentication required</div>;
  }

  // Get user profile with university_id
  const userProfile = await getVerifiedUserProfile();

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">No Student Profile Found</h1>
          <p className="mt-2 text-gray-600">
            Please set up your student profile before testing the grad plan pipeline.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has courses uploaded
  const hasCourses = await checkUserHasCourses(user.id);

  // Check if user has an active grad plan
  const hasActivePlan = await checkUserHasActivePlan(user.id);

  // Fetch academic terms configuration for the university
  const academicTerms = await fetchUniversityAcademicTerms(userProfile.university_id);

  return (
    <TestPipelineClient
      user={user}
      studentProfile={userProfile}
      hasCourses={hasCourses}
      hasActivePlan={hasActivePlan}
      academicTerms={academicTerms}
    />
  );
}
