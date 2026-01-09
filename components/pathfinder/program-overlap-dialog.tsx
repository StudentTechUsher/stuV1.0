"use client";
import * as React from 'react';

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
  completedCourses: Array<{ code: string; title: string; credits: number; term?: string; grade?: string; tags?: string[] }>;
  matchedClasses?: number;
  totalClassesInSemester?: number;
  selectedSemesterName?: string;
}

interface ProgramOverlapPanelProps {
  major: MajorProgramData | null;
  completedCourses: Array<{ code: string; title: string; credits: number; term?: string; grade?: string; tags?: string[] }>;
  matchedClasses?: number;
  totalClassesInSemester?: number;
  selectedSemesterName?: string;
  className?: string;
}

// Utility to walk an unknown requirements JSON tree and collect course codes (simple heuristic: look for objects with code or course_code keys or strings that look like codes)
function extractRequirementCourseCodes(requirements: unknown): string[] {
  const out = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node === 'object') {
      const record = node as Record<string, unknown>;
      const maybeCode = record.code || record.course_code || record.courseCode;
      if (typeof maybeCode === 'string') {
        out.add(maybeCode.trim().toUpperCase());
      }
      // also look for strings inside value/values arrays
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

export function ProgramOverlapDialog({ open, onClose, major, completedCourses, matchedClasses, totalClassesInSemester, selectedSemesterName }: Readonly<MajorOverlapDialogProps>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-emerald-200 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-emerald-800">Program Fit Overview</h2>
            {major && <p className="text-xs text-gray-600 mt-1">Selected Program: <span className="font-medium text-gray-800">{major.name}</span></p>}
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
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
        <div className="px-5 py-3 border-t flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/80 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >Close</button>
        </div>
      </div>
    </div>
  );
}

export function ProgramOverlapPanel({ major, completedCourses, matchedClasses, totalClassesInSemester, selectedSemesterName, className }: Readonly<ProgramOverlapPanelProps>) {
  const requirementCodes = React.useMemo(() => major ? extractRequirementCourseCodes(major.requirements) : [], [major]);
  const completedCodes = React.useMemo(() => completedCourses.map(c => c.code.trim().toUpperCase()), [completedCourses]);
  const completedSet = React.useMemo(() => new Set(completedCodes), [completedCodes]);

  const matched = requirementCodes.filter(c => completedSet.has(c));
  const missing = requirementCodes.filter(c => !completedSet.has(c));
  // Extra courses (completed but not explicitly in requirements list) – maybe electives
  const requirementSet = new Set(requirementCodes);
  const extras = completedCodes.filter(c => !requirementSet.has(c));

  const derivedCounts = React.useMemo((): { matched: number; total: number; type: 'provided' | 'semester' | 'overall' } | null => {
    if (typeof matchedClasses === 'number' && typeof totalClassesInSemester === 'number') {
      return { matched: matchedClasses, total: totalClassesInSemester, type: 'provided' };
    }
    if (selectedSemesterName) {
      const inTerm = completedCourses.filter(c => (c.term || '').toLowerCase() === selectedSemesterName.toLowerCase());
      const total = inTerm.length;
      const reqSet = new Set(requirementCodes);
      const matchedCount = inTerm.filter(c => reqSet.has((c.code || '').trim().toUpperCase())).length;
      return { matched: matchedCount, total, type: 'semester' };
    }
    // Fallback: compute from overall Matched/Missing lists (self-contained)
    const totalOverall = matched.length + missing.length;
    return { matched: matched.length, total: totalOverall, type: 'overall' };
  }, [matchedClasses, totalClassesInSemester, selectedSemesterName, completedCourses, requirementCodes, matched.length, missing.length]);

  const percentSimilar = React.useMemo(() => {
    if (!derivedCounts || derivedCounts.total <= 0) return 0;
    const pct = Math.round((derivedCounts.matched / derivedCounts.total) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [derivedCounts]);

  return (
    <div className={className}>
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white/70 dark:bg-gray-800/70 backdrop-blur shadow-sm overflow-hidden">
        {/* Header (Compare Majors style) */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold mb-3 line-clamp-2 min-h-[2.5rem] text-white flex-1">
              {major?.name ?? 'Selected Program'}
            </h3>
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold mb-1 text-white">
                {percentSimilar}%
              </div>
              <div className="text-xs text-white opacity-90">Complete</div>
            </div>
          </div>

          {derivedCounts && (
            <div className="mt-1 text-center text-xs bg-white/20 dark:bg-white/10 rounded py-1 text-white">
              {derivedCounts.matched}/{derivedCounts.total} {derivedCounts.type === 'overall' ? 'Requirements' : 'Courses'} Count
            </div>
          )}
        </div>

        {/* Sections (always visible) */}
        <div className="p-4 space-y-3 dark:bg-gray-800/50">
          <div className="rounded-lg border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]">
            <div className="px-3 py-2 border-b border-[color-mix(in_srgb,var(--border)_80%,transparent)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--foreground)]">Counts / Completed</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">Matched ({matched.length})</span>
              </div>
            </div>
            <div className="p-3">
              {matched.length ? (
                <ul className="space-y-1 max-h-40 overflow-auto text-xs custom-scroll">
                  {matched.map(c => <li key={c} className="text-[var(--foreground)]">{c}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">No direct matches yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)]">
            <div className="px-3 py-2 border-b border-[color-mix(in_srgb,var(--border)_80%,transparent)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--foreground)]">Still needed / Remaining</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">Missing ({missing.length})</span>
              </div>
            </div>
            <div className="p-3">
              {missing.length ? (
                <ul className="space-y-1 max-h-40 overflow-auto text-xs custom-scroll">
                  {missing.map(c => <li key={c} className="text-[var(--foreground)]">{c}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">All required courses covered or elective-heavy program.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]">
            <div className="px-3 py-2 border-b border-[color-mix(in_srgb,var(--border)_80%,transparent)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--foreground)]">Completed but Not Used</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">Not used ({extras.length})</span>
              </div>
            </div>
            <div className="p-3">
              {extras.length ? (
                <ul className="space-y-1 max-h-40 overflow-auto text-xs custom-scroll">
                  {extras.map(c => <li key={c} className="text-[var(--foreground)]">{c}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">No additional courses beyond the requirement list.</p>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            Comparison derived by simple course code matching. Electives, categories, or conditional groups may not be fully represented yet.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgramOverlapDialog;
