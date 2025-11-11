/**
 * Plan Scenario Table Component
 * Shows remaining courses with ability to set goal grades
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { StuLoader } from '@/components/ui/StuLoader';
import { ALL_GRADES, type GradeKey } from '@/lib/gpa/gradeScale';
import type { RemainingCourseDTO } from '@/lib/services/gpaService';

interface PlanScenarioTableProps {
  remaining: RemainingCourseDTO[];
  gradPlanId: string;
  onGoalGradeChange?: (courseCode: string, grade: GradeKey | null) => void;
}

interface SaveState {
  [courseCode: string]: 'idle' | 'saving' | 'saved' | 'error';
}

export function PlanScenarioTable({
  remaining,
  gradPlanId,
  onGoalGradeChange,
}: PlanScenarioTableProps) {
  const [goalGrades, setGoalGrades] = useState<Record<string, GradeKey | null>>(
    remaining.reduce(
      (acc, course) => {
        acc[course.courseCode] = course.goalGrade || null;
        return acc;
      },
      {} as Record<string, GradeKey | null>
    )
  );

  const [saveStates, setSaveStates] = useState<SaveState>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoalGradeChange = useCallback(
    async (courseCode: string, newGrade: GradeKey | null) => {
      // Optimistic update
      setGoalGrades((prev) => ({ ...prev, [courseCode]: newGrade }));
      setSaveStates((prev) => ({ ...prev, [courseCode]: 'saving' }));
      setErrors((prev) => ({ ...prev, [courseCode]: '' }));

      try {
        const encodedCode = encodeURIComponent(courseCode);
        const response = await fetch(
          `/api/plan-courses/${gradPlanId}/${encodedCode}/goal-grade`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goalGrade: newGrade }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save goal grade');
        }

        setSaveStates((prev) => ({ ...prev, [courseCode]: 'saved' }));

        // Clear saved state after 2 seconds
        setTimeout(() => {
          setSaveStates((prev) => {
            const newState = { ...prev };
            delete newState[courseCode];
            return newState;
          });
        }, 2000);

        // Callback to parent (e.g., to recompute distribution)
        onGoalGradeChange?.(courseCode, newGrade);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setErrors((prev) => ({ ...prev, [courseCode]: errorMsg }));
        setSaveStates((prev) => ({ ...prev, [courseCode]: 'error' }));

        // Revert optimistic update
        setGoalGrades((prev) => ({
          ...prev,
          [courseCode]: remaining.find((c) => c.courseCode === courseCode)?.goalGrade || null,
        }));
      }
    },
    [gradPlanId, remaining, onGoalGradeChange]
  );

  // Group courses by term/semester using termName from data
  const groupedCourses = remaining.reduce(
    (acc, course) => {
      // Use termName if available, otherwise use courseCode as fallback
      const term = course.termName || 'Unassigned Term';
      if (!acc[term]) acc[term] = [];
      acc[term].push(course);
      return acc;
    },
    {} as Record<string, RemainingCourseDTO[]>
  );

  // Sort terms to maintain order (e.g., Term 6, Term 7, Term 8)
  const sortedTerms = Object.entries(groupedCourses).sort(([termA], [termB]) => {
    // Extract term numbers if they follow a pattern like "Term 6"
    const numA = parseInt(termA.match(/\d+/)?.[0] || '0');
    const numB = parseInt(termB.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

  const handleSetAllGrades = async (grade: GradeKey | null) => {
    // Call all goal grade changes in parallel instead of sequential
    await Promise.all(
      remaining.map((course) => handleGoalGradeChange(course.courseCode, grade))
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Bold black header matching design system */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-header text-sm font-bold uppercase tracking-wider text-white">
            Remaining Courses & Goal Grades
          </h2>

          {/* Quick Grade Setter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSetAllGrades('A' as GradeKey)}
              className="font-body-semi rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20"
              title="Set all courses to A"
            >
              Set All A
            </button>
            <button
              onClick={() => handleSetAllGrades('A-' as GradeKey)}
              className="font-body-semi rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20"
              title="Set all courses to A-"
            >
              Set All A-
            </button>
            <button
              onClick={() => handleSetAllGrades(null)}
              className="font-body-semi rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/20"
              title="Clear all goal grades"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">

        {remaining.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] py-8">
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              You have no remaining courses in your graduation plan.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTerms.map(([term, courses]) => (
              <div key={term} className="space-y-4 border-t border-[var(--border)] pt-6 first:border-t-0 first:pt-0">
                <h3 className="font-body-semi font-semibold text-[var(--foreground)]">{term}</h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]">
                      <tr>
                        <th className="font-body-semi px-4 py-3 font-semibold text-[var(--foreground)]">
                          Course Code
                        </th>
                        <th className="font-body-semi px-4 py-3 font-semibold text-[var(--foreground)]">
                          Title
                        </th>
                        <th className="font-body-semi px-4 py-3 font-semibold text-[var(--foreground)]">
                          Credits
                        </th>
                        <th className="font-body-semi px-4 py-3 font-semibold text-[var(--foreground)]">
                          Goal Grade
                        </th>
                        <th className="font-body-semi px-4 py-3 font-semibold text-[var(--foreground)]">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {courses.map((course) => {
                        const saveState = saveStates[course.courseCode];
                        const error = errors[course.courseCode];
                        const currentGrade = goalGrades[course.courseCode];

                        return (
                          <tr key={course.courseCode} className="hover:bg-[color-mix(in_srgb,var(--primary)_3%,transparent)]">
                            <td className="font-body px-4 py-3 font-medium text-[var(--foreground)]">
                              {course.courseCode}
                            </td>
                            <td className="font-body px-4 py-3 text-[var(--foreground)]">
                              {course.title}
                            </td>
                            <td className="font-body px-4 py-3 text-[var(--foreground)]">
                              {course.credits}
                            </td>
                            <td className="px-4 py-3">
                              <Select
                                value={currentGrade || ''}
                                onChange={(e) => {
                                  const value = e.target.value as GradeKey | '';
                                  handleGoalGradeChange(
                                    course.courseCode,
                                    value ? value : null
                                  );
                                }}
                                size="small"
                                disabled={saveState === 'saving'}
                                className="w-24"
                              >
                                <MenuItem value="">
                                  <em>None</em>
                                </MenuItem>
                                {ALL_GRADES.map((grade) => (
                                  <MenuItem key={grade} value={grade}>
                                    {grade}
                                  </MenuItem>
                                ))}
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              {saveState === 'saving' ? (
                                <div className="flex items-center gap-2">
                                  <StuLoader variant="inline" />
                                </div>
                              ) : saveState === 'saved' ? (
                                <Tooltip title="Saved">
                                  <div>
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  </div>
                                </Tooltip>
                              ) : error ? (
                                <Tooltip title={error}>
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                  </div>
                                </Tooltip>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
