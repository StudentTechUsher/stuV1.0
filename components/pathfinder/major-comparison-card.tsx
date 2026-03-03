"use client";

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MajorComparisonResult, CourseWithAnnotation } from '@/types/major-comparison';
import type { RequirementAuditResult } from '@/types/degree-audit';
import {
  SegmentedProgressBar,
  InlineProgressBar,
  StatusLegend,
  PathfinderCourseItem,
  PATHFINDER_COLORS,
  getCompletedColor,
  getInProgressColor,
} from './pathfinder-progress-ui';

interface MajorComparisonCardProps {
  comparison: MajorComparisonResult;
}

interface SectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
  categoryColor: string;
}

function Section({ title, expanded, onToggle, children, count, categoryColor }: Readonly<SectionProps>) {
  return (
    <div className="border border-[color-mix(in_srgb,var(--border)_60%,transparent)] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] text-left transition-colors"
        type="button"
      >
        <span className="text-sm font-bold text-[var(--foreground)]">
          {title}
          {count !== undefined && (
            <span
              className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${categoryColor} 20%, transparent)`,
                color: 'var(--foreground)',
              }}
            >
              {count}
            </span>
          )}
        </span>
        <span className="text-[var(--muted-foreground)]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {expanded && (
        <div className="p-3 border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[color-mix(in_srgb,var(--muted)_8%,transparent)] max-h-80 overflow-y-auto custom-scroll">
          {children}
        </div>
      )}
    </div>
  );
}

interface RequirementNodeProps {
  result: RequirementAuditResult;
  coursesThatCount: CourseWithAnnotation[];
  categoryColor: string;
  level?: number;
  parentNumber?: string;
  index?: number;
}

function RequirementNode({
  result,
  coursesThatCount,
  categoryColor,
  level = 0,
  parentNumber = '',
  index = 0,
}: Readonly<RequirementNodeProps>) {
  const [expanded, setExpanded] = React.useState(level === 0);

  // Generate requirement number (1, 1.1, 1.2, etc.)
  const reqNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;

  // Find courses that apply to this requirement
  const appliedCoursesForReq = coursesThatCount.filter((c) =>
    c.satisfiesRequirements.includes(String(result.requirementId))
  );

  // Get missing courses for this requirement
  const missingCourses = React.useMemo(() => {
    if (!result.requiredCourses || result.type === 'noteOnly') return [];
    const appliedCodes = new Set(
      result.appliedCourses.map((c) => c.replace(/[\s-]/g, '').toUpperCase())
    );
    return result.requiredCourses.filter((reqCourse) => {
      const normalized = reqCourse.code.replace(/[\s-]/g, '').toUpperCase();
      return !appliedCodes.has(normalized);
    });
  }, [result]);

  const hasContent =
    (result.subResults && result.subResults.length > 0) ||
    appliedCoursesForReq.length > 0 ||
    missingCourses.length > 0;

  // Determine status
  const isCompleted = result.satisfied;
  const isInProgress =
    !isCompleted &&
    result.satisfiedCount !== undefined &&
    result.totalCount !== undefined &&
    result.satisfiedCount > 0;

  // Calculate progress values
  const completed = result.satisfiedCount ?? (result.satisfied ? 1 : 0);
  const total = result.totalCount ?? 1;

  // Badge styling
  const getBadgeBackground = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    return 'white';
  };

  const badgeClassName =
    !isCompleted && !isInProgress
      ? 'text-black dark:text-white border-2 border-zinc-400 dark:border-zinc-500 bg-white dark:bg-zinc-800'
      : 'text-black border-2 border-transparent';

  // Format the progress display
  const progressDisplay = React.useMemo(() => {
    if (
      result.type === 'creditBucket' &&
      result.earnedCredits !== undefined &&
      result.requiredCredits !== undefined
    ) {
      return `${result.earnedCredits}/${result.requiredCredits} hrs`;
    } else if (result.satisfiedCount !== undefined && result.totalCount !== undefined) {
      return `${result.satisfiedCount}/${result.totalCount}`;
    } else if (
      result.type === 'chooseNOf' &&
      result.satisfiedCount !== undefined &&
      result.requiredCount !== undefined
    ) {
      return `${result.satisfiedCount}/${result.requiredCount}`;
    }
    return null;
  }, [result]);

  return (
    <div
      className={`${level > 0
          ? 'ml-4 border-l-2 border-[color-mix(in_srgb,var(--border)_50%,transparent)] pl-3 mt-2'
          : 'border-b border-[color-mix(in_srgb,var(--border)_30%,transparent)] last:border-b-0'
        }`}
    >
      <button
        onClick={() => hasContent && setExpanded(!expanded)}
        className={`w-full text-left py-2 px-1 ${hasContent
            ? 'hover:bg-[color-mix(in_srgb,var(--muted)_12%,transparent)] rounded-lg cursor-pointer'
            : ''
          } transition-colors`}
        type="button"
        disabled={!hasContent}
      >
        <div className="flex items-center gap-2">
          {/* Number badge */}
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClassName}`}
            style={
              isCompleted || isInProgress ? { backgroundColor: getBadgeBackground() } : undefined
            }
          >
            {reqNumber}
          </div>

          {/* Description */}
          <span className="font-semibold text-sm text-[var(--foreground)] flex-1 line-clamp-2">
            {result.description}
          </span>

          {/* Progress indicator */}
          {progressDisplay && (
            <span className="text-xs font-medium text-[var(--muted-foreground)] bg-[color-mix(in_srgb,var(--muted)_30%,transparent)] px-2 py-1 rounded-lg shrink-0">
              {progressDisplay}
            </span>
          )}

          {hasContent && (
            <span className="text-[var(--muted-foreground)] shrink-0">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          )}
        </div>
      </button>

      {expanded && hasContent && (
        <div className="mt-2 space-y-1.5 ml-2 pb-2">
          {/* Show applied courses (completed) */}
          {appliedCoursesForReq.map((item, idx) => (
            <PathfinderCourseItem
              key={`completed-${idx}`}
              code={`${item.course.subject} ${item.course.number}`}
              title={item.course.title}
              credits={item.course.credits ?? undefined}
              status="completed"
              categoryColor={categoryColor}
              annotation={item.isDoubleCount ? 'Double Count' : undefined}
            />
          ))}

          {/* Show missing courses (not yet completed) */}
          {missingCourses.map((course, idx) => (
            <PathfinderCourseItem
              key={`missing-${idx}`}
              code={course.code}
              title={course.title}
              credits={course.credits}
              status="remaining"
              categoryColor={categoryColor}
            />
          ))}

          {/* Recursively show subrequirements */}
          {result.subResults?.map((subResult, idx) => (
            <RequirementNode
              key={idx}
              result={subResult}
              coursesThatCount={coursesThatCount}
              categoryColor={categoryColor}
              level={level + 1}
              parentNumber={reqNumber}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MajorComparisonCard({ comparison }: Readonly<MajorComparisonCardProps>) {
  const [expandedSections, setExpandedSections] = React.useState({
    coursesThatCount: true,
    notUsed: false,
  });
  const [showAllNotUsedCourses, setShowAllNotUsedCourses] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const categoryColor = PATHFINDER_COLORS.comparison;

  // Calculate status counts from requirements
  const satisfiedCount = comparison.requirementsSatisfied;
  const totalCount = comparison.totalRequirements;
  const remainingCount = totalCount - satisfiedCount;

  return (
    <div
      className="rounded-2xl shadow-sm overflow-hidden flex flex-col h-full print:break-inside-avoid border border-[color-mix(in_srgb,var(--border)_60%,transparent)]"
      style={{
        backgroundColor: 'var(--background)',
        borderLeftWidth: '4px',
        borderLeftColor: categoryColor,
      }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-black text-[var(--foreground)] line-clamp-2">
              {comparison.program.name}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {comparison.program.target_total_credits ? `${comparison.program.target_total_credits} credits required` : 'Credits required'}
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--muted-foreground)] shrink-0">
            <span className="font-black">{totalCount}</span> REQUIREMENTS
          </span>
        </div>

        {/* Main Progress Bar with Tooltip */}
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <SegmentedProgressBar
            total={totalCount}
            completed={satisfiedCount}
            categoryColor={categoryColor}
            heightClass="h-12"
            showPercentText={true}
            compact={true}
          />
          {showTooltip && comparison.program.target_total_credits && (
            <div className="absolute z-10 mt-2 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
              {comparison.percentComplete}% of requirements met
            </div>
          )}
        </div>

        {/* Status Legend */}
        <div className="mt-4">
          <StatusLegend
            completed={satisfiedCount}
            remaining={remainingCount}
            categoryColor={categoryColor}
            compact={true}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="px-5 pb-5 space-y-3 flex-1 overflow-y-auto custom-scroll">
        {/* Requirements Breakdown */}
        <Section
          title="Requirements"
          count={satisfiedCount}
          expanded={expandedSections.coursesThatCount}
          onToggle={() => toggleSection('coursesThatCount')}
          categoryColor={categoryColor}
        >
          {comparison.auditDetails.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              No requirements found
            </p>
          ) : (
            <div>
              {comparison.auditDetails.map((result, idx) => (
                <RequirementNode
                  key={idx}
                  result={result}
                  coursesThatCount={comparison.coursesThatCount}
                  categoryColor={categoryColor}
                  index={idx}
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
          categoryColor={categoryColor}
        >
          {comparison.notUsed.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-2">
              All completed courses apply
            </p>
          ) : (
            <div className="space-y-1.5">
              {(showAllNotUsedCourses ? comparison.notUsed : comparison.notUsed.slice(0, 15)).map((course, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] border border-[color-mix(in_srgb,var(--border)_40%,transparent)]"
                >
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {course.subject} {course.number}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] truncate flex-1">
                    {course.title}
                  </span>
                </div>
              ))}
              {!showAllNotUsedCourses && comparison.notUsed.length > 15 && (
                <button
                  type="button"
                  onClick={() => setShowAllNotUsedCourses(true)}
                  className="w-full text-[10px] text-[var(--foreground)] font-semibold hover:text-[var(--primary)] transition-colors italic text-center pt-1"
                >
                  + {comparison.notUsed.length - 15} more courses
                </button>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
