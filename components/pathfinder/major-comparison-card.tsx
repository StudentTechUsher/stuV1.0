"use client";

import * as React from 'react';
import type { MajorComparisonResult, CourseWithAnnotation } from '@/lib/services/majorComparisonService';
import type { RequirementAuditResult } from '@/lib/services/degreeAuditService';
import type { Course as RequirementCourse } from '@/types/programRequirements';

interface MajorComparisonCardProps {
  comparison: MajorComparisonResult;
}

interface SectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

function Section({ title, expanded, onToggle, children, count }: Readonly<SectionProps>) {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
        type="button"
      >
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          {expanded ? '▼' : '▶'}
        </span>
      </button>
      {expanded && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-white/30 dark:bg-gray-700/30 max-h-96 overflow-y-auto custom-scroll">
          {children}
        </div>
      )}
    </div>
  );
}

interface RequirementNodeProps {
  result: RequirementAuditResult;
  coursesThatCount: CourseWithAnnotation[];
  level?: number;
}

function RequirementNode({ result, coursesThatCount, level = 0 }: Readonly<RequirementNodeProps>) {
  const [expanded, setExpanded] = React.useState(level === 0);

  // Find courses that apply to this requirement
  const appliedCoursesForReq = coursesThatCount.filter(c =>
    c.satisfiesRequirements.includes(String(result.requirementId))
  );

  // Determine satisfaction status
  const icon = result.satisfied ? '✓' : (result.satisfiedCount && result.totalCount && result.satisfiedCount > 0) ? '◐' : '○';
  const statusColor = result.satisfied
    ? 'text-emerald-600 dark:text-emerald-400'
    : (result.satisfiedCount && result.totalCount && result.satisfiedCount > 0)
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-gray-400 dark:text-gray-500';

  // Get missing courses for this requirement
  const missingCourses = React.useMemo(() => {
    if (!result.requiredCourses || result.type === 'noteOnly') return [];

    // Find courses that are required but not yet completed
    const appliedCodes = new Set(result.appliedCourses.map(c => c.replace(/[\s-]/g, '').toUpperCase()));

    return result.requiredCourses.filter(reqCourse => {
      const normalized = reqCourse.code.replace(/[\s-]/g, '').toUpperCase();
      return !appliedCodes.has(normalized);
    });
  }, [result]);

  const hasContent = (result.subResults && result.subResults.length > 0) ||
                     appliedCoursesForReq.length > 0 ||
                     missingCourses.length > 0;

  // Format the progress display based on requirement type
  const progressDisplay = React.useMemo(() => {
    if (result.type === 'creditBucket' && result.earnedCredits !== undefined && result.requiredCredits !== undefined) {
      return `${result.earnedCredits}/${result.requiredCredits} hours`;
    } else if (result.satisfiedCount !== undefined && result.totalCount !== undefined) {
      return `${result.satisfiedCount}/${result.totalCount}`;
    } else if (result.type === 'chooseNOf' && result.satisfiedCount !== undefined && result.requiredCount !== undefined) {
      return `${result.satisfiedCount}/${result.requiredCount}`;
    }
    return null;
  }, [result]);

  return (
    <div className={`${level > 0 ? 'ml-4 border-l-2 border-gray-200 dark:border-gray-600 pl-3 mt-2' : 'mt-2'}`}>
      <div>
        <button
          onClick={() => hasContent && setExpanded(!expanded)}
          className={`w-full text-left text-sm py-2 px-2 ${hasContent ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md' : ''} transition-colors`}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className={`${statusColor} font-bold text-base`}>{icon}</span>
            <span className="text-gray-400 dark:text-gray-500 text-[11px] font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              #{result.requirementId}
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-100 flex-1">
              {result.description}
            </span>
            {progressDisplay && (
              <span className="text-gray-600 dark:text-gray-400 text-xs font-medium bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                {progressDisplay}
              </span>
            )}
            {hasContent && (
              <span className="text-gray-400 text-sm">{expanded ? '▼' : '▶'}</span>
            )}
          </div>
        </button>

        {expanded && hasContent && (
          <div className="mt-2 space-y-1.5 ml-2">
            {/* Show applied courses (completed) */}
            {appliedCoursesForReq.map((item, idx) => (
              <div
                key={`completed-${idx}`}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30"
              >
                <span className="text-emerald-600 dark:text-emerald-400 text-base font-bold">✓</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">
                      {item.course.subject} {item.course.number}
                    </span>
                    {item.isDoubleCount && (
                      <span
                        className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 px-2 py-0.5 text-[10px] font-medium"
                        title={`Also satisfies: ${item.doubleCountsWith.filter(p => p !== item.course.subject).join(', ')}`}
                      >
                        🔄 Double Count
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">
                    {item.course.title}
                  </div>
                </div>
              </div>
            ))}

            {/* Show missing courses (not yet completed) */}
            {missingCourses.map((course, idx) => (
              <div
                key={`missing-${idx}`}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <span className="text-gray-400 dark:text-gray-500 text-base">○</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                      {course.code}
                    </span>
                    {course.credits && (
                      <span className="text-gray-500 dark:text-gray-400 text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {course.credits} cr
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">
                    {course.title}
                  </div>
                </div>
              </div>
            ))}

            {/* Recursively show subrequirements */}
            {result.subResults?.map((subResult, idx) => (
              <RequirementNode
                key={idx}
                result={subResult}
                coursesThatCount={coursesThatCount}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MajorComparisonCard({ comparison }: Readonly<MajorComparisonCardProps>) {
  const [expandedSections, setExpandedSections] = React.useState({
    coursesThatCount: true,
    notUsed: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/70 dark:bg-gray-800/70 backdrop-blur shadow-sm overflow-hidden flex flex-col h-full print:break-inside-avoid print:bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 p-4">
        <h3 className="text-sm font-semibold mb-3 line-clamp-2 min-h-[2.5rem] text-white">
          {comparison.program.name}
        </h3>
        <div className="text-center">
          <div className="text-4xl font-bold mb-1 text-white">
            {comparison.percentComplete}%
          </div>
          <div className="text-xs text-white opacity-90">Complete</div>
        </div>
        <div className="mt-3 text-center text-xs bg-white/20 dark:bg-white/10 rounded py-1 text-white">
          {comparison.requirementsSatisfied}/{comparison.totalRequirements} Requirements ✓
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scroll dark:bg-gray-800/50">
        {/* Requirements Breakdown */}
        <Section
          title="Requirements Breakdown"
          count={comparison.requirementsSatisfied}
          expanded={expandedSections.coursesThatCount}
          onToggle={() => toggleSection('coursesThatCount')}
        >
          {comparison.auditDetails.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No requirements found
            </p>
          ) : (
            <div className="space-y-0.5">
              {comparison.auditDetails.map((result, idx) => (
                <RequirementNode
                  key={idx}
                  result={result}
                  coursesThatCount={comparison.coursesThatCount}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Not Used */}
        <Section
          title="Completed but Not Used"
          count={comparison.notUsed.length}
          expanded={expandedSections.notUsed}
          onToggle={() => toggleSection('notUsed')}
        >
          {comparison.notUsed.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              All completed courses apply
            </p>
          ) : (
            <div className="space-y-1">
              {comparison.notUsed.slice(0, 10).map((course, idx) => (
                <div key={idx} className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium">
                    {course.subject} {course.number}
                  </span>
                  {' - '}
                  <span className="line-clamp-1 inline">
                    {course.title}
                  </span>
                </div>
              ))}
              {comparison.notUsed.length > 10 && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                  ... and {comparison.notUsed.length - 10} more
                </p>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
