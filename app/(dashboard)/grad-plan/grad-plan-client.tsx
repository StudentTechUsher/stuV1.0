'use client';

import { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { PlanOverview } from '@/components/grad-planner/PlanOverview';
import { SpaceView } from '@/components/space/SpaceView';
import { usePlanParser } from '@/components/grad-planner/usePlanParser';
import PlanHeader from '@/components/grad-planner/PlanHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Event, EventType } from '@/components/grad-planner/types';
import { ProgressOverviewContainer } from '@/components/progress-overview/ProgressOverviewContainer';
import { mockAllCategoriesWithMinor } from '@/components/progress-overview/mockProgressData';

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
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Plan Overview Component - Show in both views */}
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
                events: events,
              }}
              isEditMode={isEditMode}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Detail View - 2 terms per row grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {planData.map((term, index) => {
                const termCredits = term.courses?.reduce((sum, course) => sum + (course.credits || 0), 0) || 0;

                // Helper to get category color - matches Progress Overview colors
                const getCategoryColor = (fulfills: string[] | undefined) => {
                  if (!fulfills || fulfills.length === 0) return '#6b7280';
                  const req = fulfills[0].toLowerCase();
                  if (req.includes('major') || req.includes('core')) return '#12F987'; // var(--primary)
                  if (req.includes('general') || req.includes('ge ')) return '#2196f3';
                  if (req.includes('religion') || req.includes('rel ')) return '#5E35B1';
                  if (req.includes('elective')) return '#9C27B0';
                  if (req.includes('minor')) return '#003D82';
                  return '#6b7280';
                };

                // Helper to check if course is a placeholder
                const isPlaceholder = (code: string | undefined) => {
                  if (!code) return true;
                  return /^(elective|ge|general|religion|rel|minor|major)s?$/i.test(code.trim()) ||
                    /^(free\s+)?elective$/i.test(code.trim()) ||
                    (code.toUpperCase() === code && !code.match(/\d/));
                };

                // Helper to get background style based on course status
                const getCourseBackground = (course: { code?: string; isCompleted?: boolean }) => {
                  if (isPlaceholder(course.code)) {
                    return { backgroundColor: 'white', borderColor: 'rgb(212 212 216)' };
                  }
                  if (course.isCompleted) {
                    return { backgroundColor: 'color-mix(in srgb, #12F987 20%, white)', borderColor: '#12F987' };
                  }
                  return { backgroundColor: 'rgb(212 212 216)', borderColor: 'rgb(161 161 170)' };
                };

                return (
                  <div key={index} className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_8%,transparent)] bg-white dark:bg-[var(--card)] p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                    {/* Term Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-[var(--foreground)]">{term.term || `Term ${index + 1}`}</h3>
                        {term.is_active && (
                          <span className="flex h-5 items-center gap-1 rounded-full bg-[var(--foreground)] px-2 text-[9px] font-bold uppercase tracking-wide text-[var(--background)]">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold text-[var(--foreground)]">
                        {termCredits} credits
                      </span>
                    </div>

                    {/* Courses List */}
                    {term.courses && term.courses.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {term.courses.map((course, courseIndex) => {
                          const bgStyle = getCourseBackground(course);

                          return (
                            <div
                              key={courseIndex}
                              className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-200 hover:shadow-sm"
                              style={bgStyle}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Category indicator dots - show multiple if course fulfills multiple reqs */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {course.fulfills && course.fulfills.length > 0 ? (
                                    course.fulfills.slice(0, 3).map((req, dotIndex) => (
                                      <span
                                        key={dotIndex}
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: getCategoryColor([req]) }}
                                      />
                                    ))
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-[#6b7280]" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    {course.isCompleted && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="shrink-0 text-[#12F987]"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                    <span className="text-xs font-bold text-[var(--muted-foreground)]">
                                      {course.code}
                                    </span>
                                    <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                                      {course.title}
                                    </span>
                                  </div>
                                  {course.fulfills && course.fulfills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {course.fulfills.map((req, reqIndex) => {
                                        const reqColor = getCategoryColor([req]);
                                        return (
                                          <span
                                            key={reqIndex}
                                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                            style={{
                                              backgroundColor: `color-mix(in srgb, ${reqColor} 15%, transparent)`,
                                              color: reqColor,
                                            }}
                                          >
                                            {req}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[var(--muted-foreground)] shrink-0">
                                {course.credits} cr
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)] text-center py-6">No courses</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Events/Milestones Section */}
            {events.length > 0 && (
              <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_8%,transparent)] bg-white dark:bg-[var(--card)] p-5 shadow-sm">
                <h3 className="text-sm font-black text-[var(--foreground)] mb-3">Milestones</h3>
                <div className="flex flex-wrap gap-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--muted)] px-3 py-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
                      <span className="text-xs font-bold text-[var(--foreground)]">{event.title}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">after Term {event.afterTerm}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          </div>

          {/* Progress Overview Sidebar */}
          <div className="lg:w-[550px] lg:min-w-[530px] lg:max-w-[550px] lg:sticky lg:top-6 self-start">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-4 shadow-sm overflow-auto max-h-[calc(100vh-70px)]">
              <ProgressOverviewContainer categories={mockAllCategoriesWithMinor} />
            </div>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
