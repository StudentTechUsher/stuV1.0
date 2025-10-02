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
  requirements: any; // raw JSON blob from program.requirements
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

// Utility to walk an unknown requirements JSON tree and collect course codes (simple heuristic: look for objects with code or course_code keys or strings that look like codes)
function extractRequirementCourseCodes(requirements: any): string[] {
  const out = new Set<string>();
  const visit = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node === 'object') {
      const maybeCode = (node.code || node.course_code || node.courseCode);
      if (typeof maybeCode === 'string') {
        out.add(maybeCode.trim().toUpperCase());
      }
      // also look for strings inside value/values arrays
      Object.values(node).forEach(visit);
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
    if (!derivedCounts || derivedCounts.total <= 0) return null;
    const pct = Math.round((derivedCounts.matched / derivedCounts.total) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [derivedCounts]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl border border-emerald-200 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-emerald-800">Program Fit Overview</h2>
            {major && <p className="text-xs text-gray-600 mt-1">Selected Major: <span className="font-medium text-gray-800">{major.name}</span></p>}
            {typeof percentSimilar === 'number' && derivedCounts && (
              <div className="mt-2 inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1">
                <span className="inline-flex items-center justify-center rounded bg-emerald-600 text-white text-[11px] font-semibold px-1.5 py-0.5">
                  {percentSimilar}% similar
                </span>
                <span className="text-[11px] text-emerald-800 truncate">
                  {derivedCounts.matched} of {derivedCounts.total} {derivedCounts.type === 'overall' ? 'requirements' : `classes${selectedSemesterName ? ` in ${selectedSemesterName}` : ''}`} match
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-6 text-sm">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded border bg-emerald-50/70 border-emerald-200 p-3">
              <h3 className="text-[11px] font-bold tracking-wide text-emerald-800 uppercase mb-2">Matched ({matched.length})</h3>
              {matched.length ? (
                <ul className="space-y-1 max-h-40 overflow-auto text-[12px]">
                  {matched.map(c => <li key={c} className="text-emerald-800">{c}</li>)}
                </ul>
              ) : <p className="text-[11px] text-emerald-700">No direct matches yet.</p>}
            </div>
            <div className="rounded border bg-amber-50/70 border-amber-200 p-3">
              <h3 className="text-[11px] font-bold tracking-wide text-amber-800 uppercase mb-2">Missing ({missing.length})</h3>
              {missing.length ? (
                <ul className="space-y-1 max-h-40 overflow-auto text-[12px]">
                  {missing.map(c => <li key={c} className="text-amber-800">{c}</li>)}
                </ul>
              ) : <p className="text-[11px] text-amber-700">All required courses covered or elective-heavy major.</p>}
            </div>
            <div className="rounded border bg-gray-50 border-gray-200 p-3">
              <h3 className="text-[11px] font-bold tracking-wide text-gray-700 uppercase mb-2">Extra / Other ({extras.length})</h3>
              {extras.length ? (
                <ul className="space-y-1 max-h-40 overflow-auto text-[12px]">
                  {extras.map(c => <li key={c} className="text-gray-700">{c}</li>)}
                </ul>
              ) : <p className="text-[11px] text-gray-600">No additional courses beyond requirements.</p>}
            </div>
          </div>
          <div className="text-[11px] text-gray-500 leading-relaxed">
            Comparison derived by simple course code matching. Electives, categories, or conditional groups may not be fully represented yet.
          </div>
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/80 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >Close</button>
          <button
            onClick={() => { /* placeholder for continue-to-plan action */ onClose(); }}
            className="inline-flex items-center justify-center rounded bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >Continue</button>
        </div>
      </div>
    </div>
  );
}

export default ProgramOverlapDialog;
