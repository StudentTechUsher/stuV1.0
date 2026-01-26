"use client";
import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  SegmentedProgressBar,
  StatusLegend,
  PathfinderCourseItem,
  PATHFINDER_COLORS,
} from './pathfinder-progress-ui';

export interface MajorProgramRequirementCourse {
  code: string;
  title?: string;
  credits?: number;
}

export interface MajorProgramData {
  id: number | string;
  name: string;
  requirements: unknown; // raw JSON blob from program.requirements
}

interface MajorOverlapDialogProps {
  open: boolean;
  onClose: () => void;
  major: MajorProgramData | null;
  completedCourses: Array<{
    code: string;
    title: string;
    credits: number;
    term?: string;
    grade?: string;
    tags?: string[];
  }>;
  matchedClasses?: number;
  totalClassesInSemester?: number;
  selectedSemesterName?: string;
}

interface ProgramOverlapPanelProps {
  major: MajorProgramData | null;
  completedCourses: Array<{
    code: string;
    title: string;
    credits: number;
    term?: string;
    grade?: string;
    tags?: string[];
  }>;
  matchedClasses?: number;
  totalClassesInSemester?: number;
  selectedSemesterName?: string;
  className?: string;
}

// Utility to walk an unknown requirements JSON tree and collect course codes
function extractRequirementCourseCodes(requirements: unknown): string[] {
  const out = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object') {
      const record = node as Record<string, unknown>;
      const maybeCode = record.code || record.course_code || record.courseCode;
      if (typeof maybeCode === 'string') {
        out.add(maybeCode.trim().toUpperCase());
      }
      Object.values(record).forEach(visit);
      return;
    }
    if (typeof node === 'string') {
      const trimmed = node.trim().toUpperCase();
      if (/^[A-Z]{2,4}\s?\d{3}[A-Z]?$/i.test(trimmed)) {
        out.add(trimmed.replace(/\s+/, ' '));
      }
    }
  };
  visit(requirements);
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  categoryColor: string;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  defaultExpanded = false,
  categoryColor,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border border-[color-mix(in_srgb,var(--border)_60%,transparent)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] text-left transition-colors"
        type="button"
      >
        <span className="text-sm font-bold text-[var(--foreground)]">
          {title}
          <span
            className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${categoryColor} 20%, transparent)`,
              color: 'var(--foreground)',
            }}
          >
            {count}
          </span>
        </span>
        <span className="text-[var(--muted-foreground)]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {expanded && (
        <div className="p-3 border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[color-mix(in_srgb,var(--muted)_8%,transparent)] max-h-48 overflow-y-auto custom-scroll">
          {children}
        </div>
      )}
    </div>
  );
}

export function ProgramOverlapDialog({
  open,
  onClose,
  major,
  completedCourses,
  matchedClasses,
  totalClassesInSemester,
  selectedSemesterName,
}: Readonly<MajorOverlapDialogProps>) {
  if (!open) return null;

  const categoryColor = PATHFINDER_COLORS.minor;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl rounded-2xl shadow-xl border flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: `color-mix(in srgb, ${categoryColor} 30%, var(--border))`,
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-start justify-between gap-4"
          style={{
            borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
          }}
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wide">
              Program Fit Overview
            </h2>
            {major && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Selected Program:{' '}
                <span className="font-semibold text-[var(--foreground)]">{major.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
            type="button"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <ProgramOverlapPanel
            major={major}
            completedCourses={completedCourses}
            matchedClasses={matchedClasses}
            totalClassesInSemester={totalClassesInSemester}
            selectedSemesterName={selectedSemesterName}
          />
        </div>
        <div
          className="px-5 py-3 border-t flex justify-end gap-3"
          style={{
            borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
            backgroundColor: `color-mix(in srgb, var(--muted) 30%, var(--background))`,
          }}
        >
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-xs font-semibold transition-colors"
            style={{
              borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
            }}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProgramOverlapPanel({
  major,
  completedCourses,
  matchedClasses,
  totalClassesInSemester,
  selectedSemesterName,
  className,
}: Readonly<ProgramOverlapPanelProps>) {
  const [showAllExtras, setShowAllExtras] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const categoryColor = PATHFINDER_COLORS.minor;

  const requirementCodes = React.useMemo(
    () => (major ? extractRequirementCourseCodes(major.requirements) : []),
    [major]
  );
  const completedCodes = React.useMemo(
    () => completedCourses.map((c) => c.code.trim().toUpperCase()),
    [completedCourses]
  );
  const completedSet = React.useMemo(() => new Set(completedCodes), [completedCodes]);

  const matched = requirementCodes.filter((c) => completedSet.has(c));
  const missing = requirementCodes.filter((c) => !completedSet.has(c));
  // Extra courses (completed but not explicitly in requirements list)
  const requirementSet = new Set(requirementCodes);
  const extras = completedCodes.filter((c) => !requirementSet.has(c));

  const derivedCounts = React.useMemo(():
    | { matched: number; total: number; type: 'provided' | 'semester' | 'overall' }
    | null => {
    if (typeof matchedClasses === 'number' && typeof totalClassesInSemester === 'number') {
      return { matched: matchedClasses, total: totalClassesInSemester, type: 'provided' };
    }
    if (selectedSemesterName) {
      const inTerm = completedCourses.filter(
        (c) => (c.term || '').toLowerCase() === selectedSemesterName.toLowerCase()
      );
      const total = inTerm.length;
      const reqSet = new Set(requirementCodes);
      const matchedCount = inTerm.filter((c) =>
        reqSet.has((c.code || '').trim().toUpperCase())
      ).length;
      return { matched: matchedCount, total, type: 'semester' };
    }
    // Fallback: compute from overall Matched/Missing lists
    const totalOverall = matched.length + missing.length;
    return { matched: matched.length, total: totalOverall, type: 'overall' };
  }, [
    matchedClasses,
    totalClassesInSemester,
    selectedSemesterName,
    completedCourses,
    requirementCodes,
    matched.length,
    missing.length,
  ]);

  // Percentage is calculated inside SegmentedProgressBar

  const totalReqs = derivedCounts?.total ?? 0;
  const completedReqs = derivedCounts?.matched ?? 0;
  const remainingReqs = totalReqs - completedReqs;

  return (
    <div className={className}>
      <div
        className="rounded-2xl shadow-sm overflow-hidden border border-[color-mix(in_srgb,var(--border)_60%,transparent)]"
        style={{
          backgroundColor: 'var(--background)',
          borderLeftWidth: '4px',
          borderLeftColor: categoryColor,
        }}
      >
        {/* Header */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3 className="text-lg font-black text-[var(--foreground)] flex-1 line-clamp-2">
              {major?.name ?? 'Selected Program'}
            </h3>
            <span className="text-xs font-semibold text-[var(--muted-foreground)] shrink-0">
              <span className="font-black">{totalReqs}</span> REQUIREMENTS
            </span>
          </div>

          {/* Main Progress Bar with Tooltip */}
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <SegmentedProgressBar
              total={totalReqs}
              completed={completedReqs}
              categoryColor={categoryColor}
              heightClass="h-12"
              showPercentText={true}
              compact={true}
            />
            {showTooltip && (
              <div className="absolute z-10 mt-2 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                {totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0}% requirements met
              </div>
            )}
          </div>

          {/* Status Legend */}
          <div className="mt-4">
            <StatusLegend
              completed={completedReqs}
              remaining={remainingReqs}
              categoryColor={categoryColor}
              compact={true}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="px-5 pb-5 space-y-3">
          {/* Completed/Matched Courses */}
          <CollapsibleSection
            title="Completed"
            count={matched.length}
            defaultExpanded={true}
            categoryColor={categoryColor}
          >
            {matched.length > 0 ? (
              <div className="space-y-1.5">
                {matched.map((code) => {
                  const course = completedCourses.find(
                    (c) => c.code.trim().toUpperCase() === code
                  );
                  return (
                    <PathfinderCourseItem
                      key={code}
                      code={code}
                      title={course?.title ?? ''}
                      credits={course?.credits}
                      status="completed"
                      categoryColor={categoryColor}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-2">
                No direct matches yet.
              </p>
            )}
          </CollapsibleSection>

          {/* Missing/Remaining Courses */}
          <CollapsibleSection
            title="Still Needed"
            count={missing.length}
            defaultExpanded={missing.length <= 5}
            categoryColor={categoryColor}
          >
            {missing.length > 0 ? (
              <div className="space-y-1.5">
                {missing.map((code) => (
                  <PathfinderCourseItem
                    key={code}
                    code={code}
                    title=""
                    status="remaining"
                    categoryColor={categoryColor}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-2">
                All required courses covered or elective-heavy program.
              </p>
            )}
          </CollapsibleSection>

          {/* Extra Courses (Not Used) */}
          {extras.length > 0 && (
            <CollapsibleSection
              title="Completed but Not Used"
              count={extras.length}
              defaultExpanded={false}
              categoryColor={categoryColor}
            >
              <div className="space-y-1.5">
                {(showAllExtras ? extras : extras.slice(0, 10)).map((code) => {
                  const course = completedCourses.find(
                    (c) => c.code.trim().toUpperCase() === code
                  );
                  return (
                    <div
                      key={code}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] border border-[color-mix(in_srgb,var(--border)_40%,transparent)]"
                    >
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {code}
                      </span>
                      {course?.title && (
                        <span className="text-xs text-[var(--muted-foreground)] truncate flex-1">
                          {course.title}
                        </span>
                      )}
                    </div>
                  );
                })}
                {!showAllExtras && extras.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setShowAllExtras(true)}
                    className="w-full text-[10px] text-[var(--foreground)] font-semibold hover:text-[var(--primary)] transition-colors italic text-center pt-1"
                  >
                    + {extras.length - 10} more courses
                  </button>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Explanation */}
          <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed pt-2">
            Comparison derived by course code matching. Electives, categories, or conditional
            groups may not be fully represented.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgramOverlapDialog;
