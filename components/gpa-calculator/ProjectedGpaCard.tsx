/**
 * Projected GPA Card Component
 * Shows graduation GPA projection based on goal grades set
 */

'use client';

import { useMemo } from 'react';
import { TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { gp, type GradeKey } from '@/lib/gpa/gradeScale';
import type { RemainingCourseDTO } from '@/lib/services/gpaService';

interface ProjectedGpaCardProps {
  completedCredits: number;
  completedQualityPoints: number;
  remaining: RemainingCourseDTO[];
  targetGpa: number | null;
}

export function ProjectedGpaCard({
  completedCredits,
  completedQualityPoints,
  remaining,
  targetGpa,
}: ProjectedGpaCardProps) {
  // Calculate projected graduation GPA based on goal grades
  const projectionData = useMemo(() => {
    // Calculate QP from courses with goal grades set
    let goalGradeQP = 0;
    let goalGradeCredits = 0;
    let coursesWithoutGoals = 0;
    const coursesWithoutGoalsDetails: string[] = [];

    for (const course of remaining) {
      if (course.goalGrade) {
        goalGradeQP += course.credits * gp(course.goalGrade as GradeKey);
        goalGradeCredits += course.credits;
      } else {
        coursesWithoutGoals++;
        coursesWithoutGoalsDetails.push(`${course.courseCode} (${course.credits}cr, term: ${course.termName})`);
      }
    }

    // Total graduation credits and QP if all goal-grade courses count
    const projectedTotalCredits = completedCredits + goalGradeCredits;
    const projectedTotalQP = completedQualityPoints + goalGradeQP;

    // If we have courses without goal grades, we can't calculate a final GPA
    const hasUnassignedCourses = coursesWithoutGoals > 0;
    const projectedGPA = projectedTotalCredits > 0
      ? projectedTotalQP / projectedTotalCredits
      : 0;

    // Determine if we're on track to meet target GPA
    let status: 'on-track' | 'below' | 'above' | 'incomplete' = 'incomplete';
    if (hasUnassignedCourses) {
      status = 'incomplete';
    } else if (targetGpa) {
      if (projectedGPA >= targetGpa - 0.01) {
        status = 'on-track';
      } else {
        status = 'below';
      }
    }

    return {
      projectedGPA,
      coursesWithGoals: remaining.length - coursesWithoutGoals,
      totalCourses: remaining.length,
      hasUnassignedCourses,
      status,
      goalGradeCredits,
      remainingCredits: remaining.reduce((sum, c) => sum + c.credits, 0) - goalGradeCredits,
    };
  }, [remaining, completedCredits, completedQualityPoints, targetGpa]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Bold black header matching design system */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
        <h2 className="flex items-center gap-2 font-header text-sm font-bold uppercase tracking-wider text-white">
          <TrendingUp size={18} />
          Projected Graduation GPA
        </h2>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {/* Main projection display */}
          <div className="rounded-lg border border-[var(--border)] bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_srgb,var(--primary)_80%,transparent)] p-6">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-white/90">
                  Projected GPA
                </p>
                <p
                  className={`font-header mt-2 text-4xl font-bold ${
                    projectionData.hasUnassignedCourses
                      ? 'text-white/50'
                      : 'text-white'
                  }`}
                >
                  {projectionData.hasUnassignedCourses
                    ? '—'
                    : projectionData.projectedGPA.toFixed(2)}
                </p>
              </div>

              {targetGpa !== null && !projectionData.hasUnassignedCourses && (
                <div className="flex-1 text-right">
                  <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-white/90">
                    Target GPA
                  </p>
                  <p className="font-header mt-2 text-2xl font-bold text-white">
                    {targetGpa.toFixed(2)}
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {projectionData.status === 'on-track' ? (
                      <>
                        <CheckCircle2 size={16} className="text-white/90" />
                        <span className="font-body-semi text-xs font-bold text-white/90">On Track</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-white/90" />
                        <span className="font-body-semi text-xs font-bold text-white/90">Below Target</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress details - using cards like CurrentStandingCard */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Goal Grades Set Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-4">
              <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Goal Grades Set
              </p>
              <p className="font-header mt-2 text-2xl font-bold text-[var(--foreground)]">
                {projectionData.coursesWithGoals}/{projectionData.totalCourses}
              </p>
              <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">
                courses
              </p>
            </div>

            {/* Status Card - Changes based on state */}
            {projectionData.hasUnassignedCourses ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-amber-900">
                  Incomplete Setup
                </p>
                <p className="font-body mt-2 text-sm font-semibold text-amber-900">
                  Set grades for {projectionData.totalCourses - projectionData.coursesWithGoals} remaining {projectionData.totalCourses - projectionData.coursesWithGoals === 1 ? 'course' : 'courses'}
                </p>
              </div>
            ) : targetGpa !== null ? (
              <div
                className={`rounded-lg border p-4 ${
                  projectionData.status === 'on-track'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <p
                  className={`font-body-semi text-xs font-semibold uppercase tracking-wider ${
                    projectionData.status === 'on-track'
                      ? 'text-green-900'
                      : 'text-red-900'
                  }`}
                >
                  {projectionData.status === 'on-track'
                    ? '✓ Goal Achievable'
                    : '✗ Goal Not Met'}
                </p>
                <p
                  className={`font-body mt-2 text-sm font-semibold ${
                    projectionData.status === 'on-track'
                      ? 'text-green-900'
                      : 'text-red-900'
                  }`}
                >
                  {projectionData.status === 'on-track'
                    ? `You&apos;ll reach ${targetGpa.toFixed(2)}`
                    : `Short by ${(targetGpa - projectionData.projectedGPA).toFixed(2)}`}
                </p>
              </div>
            ) : null}
          </div>

          {/* Helper text */}
          <div className="rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-4">
            <p className="font-body text-sm text-[var(--foreground)]">
              <strong>💡 Tip:</strong> Set goal grades for all remaining courses to see your projected graduation GPA compared to your target.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
