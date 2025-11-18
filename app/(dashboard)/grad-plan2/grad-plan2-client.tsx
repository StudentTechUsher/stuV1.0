'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { PlanOverview } from '@/components/grad-planner/PlanOverview';
import { SpaceView, PlanSpaceView } from '@/components/space/SpaceView';
import { usePlanParser } from '@/components/grad-planner/usePlanParser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface GradPlan2ClientProps {
  user: User;
  studentProfile: {
    id: string;
    university_id: number;
    [key: string]: unknown;
  };
  gradPlan: Record<string, unknown>;
}

export default function GradPlan2Client({
  user,
  studentProfile,
  gradPlan,
}: Readonly<GradPlan2ClientProps>) {
  const [isZoomOut, setIsZoomOut] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Parse the plan data
  const { planData, assumptions } = usePlanParser(gradPlan);

  // Check if plan is approved
  const isApproved = (gradPlan.is_active as boolean) || false;
  const isActive = (gradPlan.is_active as boolean) || false;

  return (
    <div className="flex flex-col h-full">
      {/* Header with Status Badge and Edit Button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            {(gradPlan.plan_name as string) || 'My Graduation Plan'}
          </h1>
          {!isActive && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Not Yet Approved
            </Badge>
          )}
        </div>
        <Button
          onClick={() => setIsEditMode(!isEditMode)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Pencil className="h-4 w-4" />
          {isEditMode ? 'View Mode' : 'Edit This Plan'}
        </Button>
      </div>

      {/* Plan Overview Component */}
      <div className="p-4">
        <PlanOverview
          currentPlanData={planData}
          durationYears={Math.ceil(planData.length / 2)} // Rough estimate
          fulfilledRequirements={[]} // TODO: Calculate from plan data
          isEditMode={isEditMode}
          isSpaceView={isZoomOut}
          onToggleView={() => setIsZoomOut(!isZoomOut)}
          onAddEvent={() => {/* TODO: Implement */}}
          programs={(gradPlan.programs as Array<{ id: number; name: string }>) || []}
          estGradSem={(gradPlan.est_grad_sem as string) || undefined}
        />
      </div>

      {/* Terms View - Horizontal scroll or Zoom out */}
      <div className="flex-1 overflow-hidden">
        {isZoomOut ? (
          <div className="p-4">
            <SpaceView
              plan={{
                planName: (gradPlan.plan_name as string) || 'My Graduation Plan',
                degree: (gradPlan.programs as Array<{ name: string }>)?.map(p => p.name).join(', ') || 'No programs selected',
                gradSemester: (gradPlan.est_grad_sem as string) || 'Not set',
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
          <div className="h-full overflow-x-auto overflow-y-hidden p-4">
            <div className="flex gap-6 h-full">
              {planData.map((term, index) => (
                <div key={index} className="flex items-center gap-4">
                  {/* Term Card */}
                  <div className="flex-shrink-0 w-80 h-full border rounded-lg p-4 bg-card shadow-sm">
                    <h3 className="font-semibold mb-2">{term.term || `Term ${index + 1}`}</h3>
                    <div className="space-y-2">
                      {term.courses?.map((course, courseIndex) => (
                        <div
                          key={courseIndex}
                          className="p-2 bg-muted rounded text-sm"
                        >
                          <div className="font-medium">{course.code}</div>
                          <div className="text-xs text-muted-foreground">{course.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arrow connector (if not last term) */}
                  {index < planData.length - 1 && (
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        className="text-muted-foreground"
                      >
                        <path
                          d="M5 20 L25 20 M25 20 L20 15 M25 20 L20 25"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Plan Assumptions - TODO */}
      {assumptions && assumptions.length > 0 && (
        <div className="p-4 border-t">
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
  );
}
