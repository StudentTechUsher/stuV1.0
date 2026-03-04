'use client';

import type { ParsedCourse } from '@/lib/services/userCoursesService';

interface UserCoursesPanelProps {
  courses: ParsedCourse[];
}

function gradeColor(grade: string | null): string {
  if (!grade) return 'bg-gray-100 text-gray-500';
  const upper = grade.toUpperCase();
  if (['IP', 'IN PROGRESS', 'W', 'WD'].includes(upper)) return 'bg-blue-100 text-blue-700';
  if (['F', 'D', 'D+', 'D-', 'NP', 'NC', 'UW', 'E'].includes(upper)) return 'bg-red-100 text-red-700';
  return 'bg-green-100 text-green-700';
}

function sortTerms(terms: string[]): string[] {
  const SEASON_ORDER: Record<string, number> = {
    spring: 0, summer: 1, fall: 2, winter: 3,
  };

  return [...terms].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    const aYear = parseInt(aLower.match(/\d{4}/)?.[0] ?? '0', 10);
    const bYear = parseInt(bLower.match(/\d{4}/)?.[0] ?? '0', 10);
    if (aYear !== bYear) return aYear - bYear;

    const aSeason = Object.keys(SEASON_ORDER).find(s => aLower.includes(s));
    const bSeason = Object.keys(SEASON_ORDER).find(s => bLower.includes(s));
    return (SEASON_ORDER[aSeason ?? ''] ?? 99) - (SEASON_ORDER[bSeason ?? ''] ?? 99);
  });
}

export function UserCoursesPanel({ courses }: UserCoursesPanelProps) {
  const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0);

  if (courses.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-header-bold text-sm uppercase tracking-wide text-[var(--foreground)]">
            Completed Courses
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-[var(--muted-foreground)] text-center leading-relaxed">
            No transcript uploaded yet.
          </p>
        </div>
      </div>
    );
  }

  const regularCourses = courses.filter(c => c.origin !== 'transfer');
  const transferCourses = courses.filter(c => c.origin === 'transfer');

  // Group regular courses by term
  const termMap = new Map<string, ParsedCourse[]>();
  for (const course of regularCourses) {
    const key = course.term || 'Unknown Term';
    const existing = termMap.get(key) ?? [];
    termMap.set(key, [...existing, course]);
  }
  const sortedTermKeys = sortTerms(Array.from(termMap.keys()));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="font-header-bold text-sm uppercase tracking-wide text-[var(--foreground)]">
          Completed Courses
        </h2>
        <span className="inline-flex items-center rounded-full bg-black px-2.5 py-1 text-xs font-body-semi text-white whitespace-nowrap">
          {totalCredits} cr
        </span>
      </div>

      {/* Scrollable course list */}
      <div className="space-y-4">
        {sortedTermKeys.map(term => {
          const termCourses = termMap.get(term) ?? [];
          const termCredits = termCourses.reduce((sum, c) => sum + (c.credits ?? 0), 0);
          return (
            <div key={term}>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-header-bold text-foreground uppercase tracking-wide">
                  {term}
                </h3>
                <span className="text-xs text-[var(--muted-foreground)]">{termCredits} cr</span>
              </div>
              <div className="space-y-1">
                {termCourses.map((course, i) => (
                  <div
                    key={course.id ?? `${term}-${i}`}
                    className="p-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-header-bold text-[var(--foreground)] leading-tight">
                          {course.subject} {course.number}
                        </div>
                        {course.title && (
                          <div className="text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
                            {course.title}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {course.grade && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-body-semi ${gradeColor(course.grade)}`}>
                            {course.grade}
                          </span>
                        )}
                        <span className="text-[var(--muted-foreground)] whitespace-nowrap">
                          {course.credits ?? 0}cr
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Transfer Credits section */}
        {transferCourses.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-header-bold text-foreground uppercase tracking-wide">
                Transfer Credits
              </h3>
              <span className="text-xs text-[var(--muted-foreground)]">
                {transferCourses.reduce((sum, c) => sum + (c.credits ?? 0), 0)} cr
              </span>
            </div>
            <div className="space-y-1">
              {transferCourses.map((course, i) => (
                <div
                  key={course.id ?? `transfer-${i}`}
                  className="p-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="font-header-bold text-[var(--foreground)] leading-tight">
                        {course.subject} {course.number}
                      </div>
                      {course.title && (
                        <div className="text-[var(--muted-foreground)] truncate leading-tight mt-0.5">
                          {course.title}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {course.grade && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-body-semi ${gradeColor(course.grade)}`}>
                          {course.grade}
                        </span>
                      )}
                      <span className="text-[var(--muted-foreground)] whitespace-nowrap">
                        {course.credits ?? 0}cr
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
