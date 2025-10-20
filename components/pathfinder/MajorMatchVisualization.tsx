/**
 * Major Match Visualization Component
 * Shows % match between completed coursework and major requirements
 * with a circular progress ring and detailed course breakdown
 */

'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseMatch {
  code: string;
  title: string;
  credits: number;
  matchType: 'core' | 'elective' | 'prerequisite';
}

interface MajorMatchData {
  matchPercentage: number; // 0-100
  completedCourses: CourseMatch[];
  totalRequiredCourses: number;
  totalMatchedCredits: number;
  totalRequiredCredits: number;
}

interface MajorMatchVisualizationProps {
  matchData: MajorMatchData;
  majorName: string;
  className?: string;
}

export function MajorMatchVisualization({
  matchData,
  majorName,
  className
}: MajorMatchVisualizationProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const { matchPercentage, completedCourses, totalRequiredCourses, totalMatchedCredits, totalRequiredCredits } = matchData;

  // Determine color and label based on match percentage
  const getMatchStatus = (percentage: number) => {
    if (percentage >= 75) return {
      color: 'var(--primary)',
      label: 'Excellent Match',
      bgColor: 'bg-[color-mix(in_srgb,var(--primary)_12%,white)]',
      borderColor: 'border-[color-mix(in_srgb,var(--primary)_38%,transparent)]',
      textColor: 'text-[color-mix(in_srgb,var(--foreground)_80%,var(--primary)_20%)]',
    };
    if (percentage >= 50) return {
      color: '#2196f3',
      label: 'Good Match',
      bgColor: 'bg-[color-mix(in_srgb,#2196f3_12%,white)]',
      borderColor: 'border-[color-mix(in_srgb,#2196f3_38%,transparent)]',
      textColor: 'text-[color-mix(in_srgb,var(--foreground)_80%,#2196f3_20%)]',
    };
    if (percentage >= 25) return {
      color: 'var(--action-edit)',
      label: 'Moderate Match',
      bgColor: 'bg-[color-mix(in_srgb,var(--action-edit)_12%,white)]',
      borderColor: 'border-[color-mix(in_srgb,var(--action-edit)_38%,transparent)]',
      textColor: 'text-[color-mix(in_srgb,var(--foreground)_80%,var(--action-edit)_20%)]',
    };
    return {
      color: 'var(--muted-foreground)',
      label: 'Low Match',
      bgColor: 'bg-[color-mix(in_srgb,var(--muted)_22%,white)]',
      borderColor: 'border-[color-mix(in_srgb,var(--muted-foreground)_36%,transparent)]',
      textColor: 'text-[color-mix(in_srgb,var(--foreground)_78%,var(--muted-foreground)_22%)]',
    };
  };

  const status = getMatchStatus(matchPercentage);

  // SVG circle properties
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (matchPercentage / 100) * circumference;

  // Group courses by match type
  const coreMatches = completedCourses.filter(c => c.matchType === 'core');
  const electiveMatches = completedCourses.filter(c => c.matchType === 'elective');
  const prerequisiteMatches = completedCourses.filter(c => c.matchType === 'prerequisite');

  return (
    <div className={cn("flex flex-col gap-4 rounded-[7px] border bg-white p-5 shadow-sm", className)}
      style={{ borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)' }}
    >
      {/* Header with Ring and Stats */}
      <div className="flex items-center gap-5">
        {/* Circular Progress Ring */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="color-mix(in srgb, var(--muted) 40%, transparent)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={status.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${status.color}40)`
              }}
            />
          </svg>
          {/* Percentage Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tracking-tight"
              style={{ color: status.color }}
            >
              {Math.round(matchPercentage)}%
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
              Match
            </span>
          </div>
        </div>

        {/* Stats Column */}
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h4 className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)] mb-1">
              Coursework Alignment
            </h4>
            <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1", status.bgColor, status.borderColor)}>
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
              <span className={cn("text-xs font-semibold", status.textColor)}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Courses Matched */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
                Courses Matched
              </span>
              <span className="text-lg font-bold" style={{ color: status.color }}>
                {completedCourses.length}/{totalRequiredCourses}
              </span>
            </div>

            {/* Credits Matched */}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
                Credits Matched
              </span>
              <span className="text-lg font-bold" style={{ color: status.color }}>
                {totalMatchedCredits}/{totalRequiredCredits}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Course Details */}
      {completedCourses.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-[color-mix(in_srgb,var(--border)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--muted)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: status.color }}
            aria-expanded={isExpanded}
          >
            <span className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_88%,transparent)]">
              View Matched Courses
            </span>
            {isExpanded ? (
              <ChevronUp size={18} className="text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]" />
            ) : (
              <ChevronDown size={18} className="text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]" />
            )}
          </button>

          {isExpanded && (
            <div className="flex flex-col gap-4 rounded-xl border p-4"
              style={{
                borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
                backgroundColor: `color-mix(in srgb, ${status.color} 4%, white)`
              }}
            >
              {/* Core Courses */}
              {coreMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--primary)_85%,var(--foreground)_15%)]">
                    ✓ Core Requirements ({coreMatches.length})
                  </h5>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {coreMatches.map((course) => (
                      <div
                        key={course.code}
                        className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
                        style={{ borderColor: 'color-mix(in srgb, var(--primary) 38%, transparent)' }}
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: 'var(--primary)' }}
                        >
                          ✓
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)] truncate">
                            {course.code}
                          </span>
                          <span className="text-xs text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
                            {course.credits} cr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites */}
              {prerequisiteMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,#2196f3_85%,var(--foreground)_15%)]">
                    ✓ Prerequisites ({prerequisiteMatches.length})
                  </h5>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {prerequisiteMatches.map((course) => (
                      <div
                        key={course.code}
                        className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
                        style={{ borderColor: 'color-mix(in srgb, #2196f3 38%, transparent)' }}
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: '#2196f3' }}
                        >
                          ✓
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)] truncate">
                            {course.code}
                          </span>
                          <span className="text-xs text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
                            {course.credits} cr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Electives */}
              {electiveMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,#9C27B0_85%,var(--foreground)_15%)]">
                    ✓ Electives ({electiveMatches.length})
                  </h5>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {electiveMatches.map((course) => (
                      <div
                        key={course.code}
                        className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
                        style={{ borderColor: 'color-mix(in srgb, #9C27B0 38%, transparent)' }}
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: '#9C27B0' }}
                        >
                          ✓
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)] truncate">
                            {course.code}
                          </span>
                          <span className="text-xs text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
                            {course.credits} cr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completedCourses.length === 0 && (
                <p className="text-sm text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
                  No matching courses found in your completed coursework.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Insight Message */}
      <div className="rounded-lg border p-3"
        style={{
          borderColor: `color-mix(in srgb, ${status.color} 30%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${status.color} 6%, white)`
        }}
      >
        <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_85%,transparent)]">
          {matchPercentage >= 75 && (
            <>
              <strong>Great alignment!</strong> Your completed coursework covers most of the {majorName} requirements. You could transition with minimal additional courses.
            </>
          )}
          {matchPercentage >= 50 && matchPercentage < 75 && (
            <>
              <strong>Solid foundation!</strong> You&apos;ve completed several {majorName} requirements. Switching majors would require some additional coursework.
            </>
          )}
          {matchPercentage >= 25 && matchPercentage < 50 && (
            <>
              <strong>Partial overlap.</strong> Some of your coursework applies to {majorName}, but you&apos;d need to complete a significant portion of the major requirements.
            </>
          )}
          {matchPercentage < 25 && (
            <>
              <strong>Different path.</strong> {majorName} has limited overlap with your current coursework. Consider if this aligns with your long-term goals before switching.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Calculate match data from completed courses and major info
 */
export function calculateMajorMatch(
  completedCourses: Array<{ code: string; title: string; credits: number; }>,
  major: {
    coreCourses: string[];
    electiveCourses?: string[];
    prerequisites: string[];
    totalCredits: number;
  }
): MajorMatchData {
  const completedCodes = new Set(
    completedCourses.map(c => c.code.trim().toUpperCase())
  );

  const matchedCourses: CourseMatch[] = [];
  let totalMatchedCredits = 0;

  // Check core courses
  major.coreCourses.forEach(courseStr => {
    const code = courseStr.split('-')[0]?.trim().toUpperCase();
    if (code && completedCodes.has(code)) {
      const completedCourse = completedCourses.find(
        c => c.code.trim().toUpperCase() === code
      );
      if (completedCourse) {
        matchedCourses.push({
          code: completedCourse.code,
          title: completedCourse.title,
          credits: completedCourse.credits,
          matchType: 'core',
        });
        totalMatchedCredits += completedCourse.credits;
      }
    }
  });

  // Check prerequisites
  major.prerequisites.forEach(prereqStr => {
    // Extract course code from prerequisite string (e.g., "MATH 112" from "MATH 112 or higher")
    const match = prereqStr.match(/([A-Z]+\s+\d+)/i);
    if (match) {
      const code = match[1].trim().toUpperCase().replace(/\s+/g, ' ');
      const completedCourse = completedCourses.find(
        c => c.code.trim().toUpperCase().replace(/\s+/g, ' ') === code
      );
      if (completedCourse && !matchedCourses.some(m => m.code === completedCourse.code)) {
        matchedCourses.push({
          code: completedCourse.code,
          title: completedCourse.title,
          credits: completedCourse.credits,
          matchType: 'prerequisite',
        });
        totalMatchedCredits += completedCourse.credits;
      }
    }
  });

  // Check electives
  if (major.electiveCourses) {
    major.electiveCourses.forEach(courseStr => {
      const code = courseStr.split('-')[0]?.trim().toUpperCase();
      if (code && completedCodes.has(code)) {
        const completedCourse = completedCourses.find(
          c => c.code.trim().toUpperCase() === code
        );
        if (completedCourse && !matchedCourses.some(m => m.code === completedCourse.code)) {
          matchedCourses.push({
            code: completedCourse.code,
            title: completedCourse.title,
            credits: completedCourse.credits,
            matchType: 'elective',
          });
          totalMatchedCredits += completedCourse.credits;
        }
      }
    });
  }

  // Calculate total required courses
  const totalRequiredCourses =
    major.coreCourses.length +
    (major.electiveCourses?.length || 0) +
    major.prerequisites.filter(p => p.match(/([A-Z]+\s+\d+)/i)).length;

  // Calculate match percentage based on both course count and credits
  const courseMatchRate = totalRequiredCourses > 0
    ? (matchedCourses.length / totalRequiredCourses) * 100
    : 0;
  const creditMatchRate = major.totalCredits > 0
    ? (totalMatchedCredits / major.totalCredits) * 100
    : 0;

  // Weight course match rate more heavily (60/40 split)
  const matchPercentage = (courseMatchRate * 0.6) + (creditMatchRate * 0.4);

  return {
    matchPercentage,
    completedCourses: matchedCourses,
    totalRequiredCourses,
    totalMatchedCredits,
    totalRequiredCredits: major.totalCredits,
  };
}
