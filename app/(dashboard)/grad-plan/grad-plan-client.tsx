'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { PlanOverview } from '@/components/grad-planner/PlanOverview';
import { SpaceView } from '@/components/space/SpaceView';
import { usePlanParser } from '@/components/grad-planner/usePlanParser';
import PlanHeader from '@/components/grad-planner/PlanHeader';

interface GradPlanRecord {
  id: string;
  plan_details: unknown;
  plan_name?: string | null;
  created_at?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

interface GradPlanClientProps {
  user: User;
  studentProfile: {
    id: string;
    university_id: number;
    [key: string]: unknown;
  };
  gradPlan: GradPlanRecord | null;
  allGradPlans: GradPlanRecord[];
  prompt: string;
}

export default function GradPlanClient({
  user,
  studentProfile: initialStudentProfile,
  gradPlan,
  allGradPlans,
  prompt,
}: Readonly<GradPlanClientProps>) {
  const [isZoomOut, setIsZoomOut] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedGradPlan, setSelectedGradPlan] = useState<GradPlanRecord | null>(gradPlan);
  const [studentProfile, setStudentProfile] = useState(initialStudentProfile);

  // Parse the plan data - only if we have a plan
  const { planData, assumptions } = usePlanParser(selectedGradPlan || undefined);

  // Check if plan is approved
  const isApproved = (selectedGradPlan?.is_active as boolean) || false;
  const isActive = (selectedGradPlan?.is_active as boolean) || false;

  // Handle profile updates
  const handleProfileUpdate = (updates: Record<string, string | null>) => {
    setStudentProfile(prev => ({
      ...prev,
      ...updates,
    }));
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Plan Header - Always show */}
      <PlanHeader
        selectedGradPlan={selectedGradPlan}
        allGradPlans={allGradPlans}
        onPlanChange={setSelectedGradPlan}
        universityId={studentProfile.university_id}
        prompt={prompt}
        showCreateButton={true}
        showEditButton={!!selectedGradPlan}
        showPlanSelector={allGradPlans.length > 0}
        showStatusBadge={!!selectedGradPlan}
        useChatbotFlow={true}
        studentProfile={studentProfile}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Show fallback if no plan selected */}
      {!selectedGradPlan ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <div className="mb-4 text-6xl">📋</div>
            <h2 className="text-2xl font-bold mb-2">No Graduation Plan Yet</h2>
            <p className="text-muted-foreground mb-4">
              You haven't created any graduation plans yet. Click "Create New Plan" above to get started with our AI-powered planner!
            </p>
          </div>
        </div>
      ) : (
        <>

      {/* Plan Overview Component */}
      <PlanOverview
        currentPlanData={planData}
        durationYears={Math.ceil(planData.length / 2)} // Rough estimate
        fulfilledRequirements={[]} // TODO: Calculate from plan data
        isEditMode={isEditMode}
        isSpaceView={isZoomOut}
        onToggleView={() => setIsZoomOut(!isZoomOut)}
        onAddEvent={() => {/* TODO: Implement */}}
        programs={(selectedGradPlan?.programs as Array<{ id: number; name: string }>) || []}
        estGradSem={(selectedGradPlan?.est_grad_sem as string) || undefined}
      />

      {/* Terms View - Grid or Zoom out */}
      <div>
        {isZoomOut ? (
          <div>
            <SpaceView
              plan={{
                planName: (selectedGradPlan?.plan_name as string) || 'My Graduation Plan',
                degree: (selectedGradPlan?.programs as Array<{ name: string }>)?.map(p => p.name).join(', ') || 'No programs selected',
                gradSemester: (selectedGradPlan?.est_grad_sem as string) || 'Not set',
                terms: planData.map((term, index) => ({
                  id: `term-${index}`,
                  label: term.term || `Term ${index + 1}`,
                  courses: (term.courses || []).map((course, courseIndex) => ({
                    id: `course-${index}-${courseIndex}`,
                    code: course.code || '',
                    title: course.title || '',
                    credits: course.credits || 0,
                    requirements: course.fulfills || [],
                    termIndex: index,
                    courseIndex,
                    rawCourse: course,
                  })),
                  termIndex: index,
                  rawTerm: term,
                })),
              }}
              isEditMode={isEditMode}
            />
          </div>
        ) : (
          <div>
            <div className={`grid gap-6 ${
              planData.length <= 4 ? 'grid-cols-4' :
              planData.length <= 6 ? 'grid-cols-3' :
              'grid-cols-4'
            }`}>
              {planData.map((term, index) => (
                <div key={index} className="relative min-h-[450px]">
                  {/* Term Card */}
                  <div className="border rounded-lg p-4 bg-card shadow-sm h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">{term.term || `Term ${index + 1}`}</h3>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {term.courses?.reduce((sum, course) => sum + (course.credits || 0), 0) || 0} credits
                      </span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {term.courses?.map((course, courseIndex) => (
                        <div
                          key={courseIndex}
                          className="p-2 bg-muted rounded text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{course.code}</div>
                              <div className="text-xs text-muted-foreground truncate">{course.title}</div>
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                              {course.credits || 0} cr
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Arrow to next term (if not last in row and not last term) */}
                  {index < planData.length - 1 && (
                    (planData.length <= 4 ? (index + 1) % 4 !== 0 :
                     planData.length <= 6 ? (index + 1) % 3 !== 0 :
                     (index + 1) % 4 !== 0) && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 w-6 flex items-center justify-center">
                        <div className="bg-gray-100 rounded-full p-1.5">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            className="text-gray-900 drop-shadow-lg"
                          >
                            <path
                              d="M4 16 L22 16 M22 16 L17 11 M22 16 L17 21"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Plan Assumptions - TODO */}
      {assumptions && assumptions.length > 0 && (
        <div className="border-t pt-6">
          <details>
            <summary className="cursor-pointer font-semibold">Plan Assumptions</summary>
            <div className="mt-2 space-y-1">
              {assumptions.map((assumption, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {assumption}
                </p>
              ))}
            </div>
          </details>
        </div>
      )}
        </>
      )}
    </div>
  );
}
