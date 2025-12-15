'use client';

import { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { PlanOverview } from '@/components/grad-planner/PlanOverview';
import { SpaceView } from '@/components/space/SpaceView';
import { usePlanParser } from '@/components/grad-planner/usePlanParser';
import PlanHeader from '@/components/grad-planner/PlanHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Event, EventType } from '@/components/grad-planner/types';

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
    career_goals?: string | null;
    student_interests?: string | null;
    [key: string]: unknown;
  };
  gradPlan: GradPlanRecord | null;
  allGradPlans: GradPlanRecord[];
  prompt: string;
}

export default function GradPlanClient({
  studentProfile: initialStudentProfile,
  gradPlan,
  allGradPlans,
  prompt,
}: Readonly<GradPlanClientProps>) {
  const [isZoomOut, setIsZoomOut] = useState(true); // Default to space view (sandbox UX)
  const [isEditMode] = useState(false); // Clean code from main (no unused setter)
  const [selectedGradPlan, setSelectedGradPlan] = useState<GradPlanRecord | null>(gradPlan);
  const [studentProfile, setStudentProfile] = useState(initialStudentProfile);

  // Parse the plan data - only if we have a plan
  const { planData, assumptions } = usePlanParser(selectedGradPlan || undefined);

  // Extract events from the plan (they're stored inline in the plan array)
  const events = useMemo<Event[]>(() => {
    if (!selectedGradPlan?.plan_details) return [];

    let rawPlanArray: unknown[] = [];

    // Try to get the plan array from plan_details
    if (typeof selectedGradPlan.plan_details === 'object' && selectedGradPlan.plan_details !== null) {
      const details = selectedGradPlan.plan_details as Record<string, unknown>;
      if (Array.isArray(details.plan)) {
        rawPlanArray = details.plan;
      } else if (Array.isArray(details.semesters)) {
        rawPlanArray = details.semesters;
      } else if (Array.isArray(details.terms)) {
        rawPlanArray = details.terms;
      }
    }

    // Extract events from the plan array
    const EVENT_TYPES: EventType[] = [
      'Apply for Graduation',
      'Apply for Graduate School',
      'Co-op',
      'Internship',
      'Major/Minor Application',
      'Religious Deferment (Mission)',
      'Research Project',
      'Sabbatical',
      'Study Abroad',
      'Teaching Assistant',
      'Other',
    ];

    const isEventType = (value: unknown): value is EventType =>
      typeof value === 'string' && EVENT_TYPES.includes(value as EventType);

    const extractedEvents: Event[] = [];
    for (const item of rawPlanArray) {
      if (typeof item === 'object' && item !== null) {
        const candidate = item as Record<string, unknown>;
        // Check if this is an event (has type and afterTerm but not term)
        if (isEventType(candidate.type) &&
            typeof candidate.afterTerm === 'number' &&
            !('term' in candidate)) {
          extractedEvents.push({
            type: candidate.type,
            title: typeof candidate.title === 'string' ? candidate.title : candidate.type,
            afterTerm: candidate.afterTerm,
            id: typeof candidate.id === 'string' ? candidate.id : undefined,
          });
        }
      }
    }

    return extractedEvents;
  }, [selectedGradPlan]);

  // Handle profile updates
  const handleProfileUpdate = (updates: Record<string, string | null>) => {
    setStudentProfile(prev => ({
      ...prev,
      ...updates,
    }));
  };

  return (
    <TooltipProvider>
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
              You haven&apos;t created any graduation plans yet. Click &quot;Create New Plan&quot; above to get started with our AI-powered planner!
            </p>
          </div>
        </div>
      ) : (
        <>

      {/* Plan Overview Component - Only show in detail view */}
      {!isZoomOut && (
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
      )}

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
                events: events,
              }}
              isEditMode={isEditMode}
              onToggleView={() => setIsZoomOut(!isZoomOut)}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-header-bold text-[var(--foreground)]">Detailed View</h2>
              <button
                type="button"
                onClick={() => setIsZoomOut(!isZoomOut)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Return to Space View
              </button>
            </div>
            <div className={`grid gap-6 ${
              planData.length <= 4 ? 'grid-cols-4' :
              planData.length <= 6 ? 'grid-cols-3' :
              'grid-cols-4'
            }`}>
              {planData.map((term, index) => (
                <div key={index} className="relative min-h-[450px]">
                  {/* Term Card */}
                  <div className="border border-[var(--border)] rounded-lg p-5 bg-[var(--card)] shadow-sm h-full flex flex-col transition-all duration-300 hover:shadow-md">
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-[var(--border)]">
                      <h3 className="font-header-bold text-lg text-[var(--primary)] uppercase tracking-wide">{term.term || `Term ${index + 1}`}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-sm font-body-semi text-white whitespace-nowrap">
                        {term.courses?.reduce((sum, course) => sum + (course.credits || 0), 0) || 0} credits
                      </span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {term.courses?.map((course, courseIndex) => (
                        <div
                          key={courseIndex}
                          className="p-3 bg-[var(--secondary)] rounded-md text-sm transition-all duration-200 hover:bg-[var(--primary-15)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-header-bold text-[var(--foreground)]">{course.code}</div>
                              <div className="text-xs text-[var(--muted-foreground)] truncate">{course.title}</div>
                            </div>
                            <span className="text-xs font-body-semi text-[var(--foreground)] whitespace-nowrap">
                              {course.credits || 0} cr
                            </span>
                          </div>
                        </div>
                      ))}
                      {!term.courses || term.courses.length === 0 && (
                        <p className="text-xs text-[var(--muted-foreground)] text-center py-8">No courses</p>
                      )}
                    </div>

                  </div>

                  {/* Arrow to next term (if not last in row and not last term) */}
                  {index < planData.length - 1 && (
                    (planData.length <= 4 ? (index + 1) % 4 !== 0 :
                     planData.length <= 6 ? (index + 1) % 3 !== 0 :
                     (index + 1) % 4 !== 0) && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 w-6 flex items-center justify-center">
                        <div className="bg-[var(--secondary)] rounded-full p-1.5">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            className="text-[var(--primary)] drop-shadow-lg"
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
    </TooltipProvider>
  );
}
