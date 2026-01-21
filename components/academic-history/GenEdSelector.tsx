'use client';

import { useEffect, useMemo } from 'react';
import type { ProgramRow } from '@/types/program';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GenEdSelectorProps {
  programs: ProgramRow[];
  selectedPrograms: ProgramRow[];
  onSelectionChange: (programs: ProgramRow[]) => void;
  matchStatus: {
    total: number;
    matched: number;
    unmatched: number;
  };
  enrollmentYear?: number | null;
  isTransfer?: boolean;
  loading?: boolean;
}

function getRecommendedProgram(programs: ProgramRow[], enrollmentYear?: number | null): ProgramRow | null {
  if (!programs.length) {
    return null;
  }

  if (!enrollmentYear) {
    return programs
      .slice()
      .sort((a, b) => (b.applicable_start_year || 0) - (a.applicable_start_year || 0))[0] || null;
  }

  const matchingProgram = programs.find((program) => {
    const start = program.applicable_start_year ?? undefined;
    const end = program.applicable_end_year ?? undefined;

    if (start && end) {
      return enrollmentYear >= start && enrollmentYear <= end;
    }
    if (start && !end) {
      return enrollmentYear >= start;
    }
    if (!start && end) {
      return enrollmentYear <= end;
    }
    return false;
  });

  if (matchingProgram) {
    return matchingProgram;
  }

  return programs
    .slice()
    .sort((a, b) => (b.applicable_start_year || 0) - (a.applicable_start_year || 0))[0] || null;
}

function formatYearRange(program: ProgramRow) {
  const { applicable_start_year: start, applicable_end_year: end } = program;
  if (start && end) {
    return `${start} – ${end}`;
  }
  if (start && !end) {
    return `${start}+`;
  }
  if (!start && end) {
    return `≤ ${end}`;
  }
  return program.version ? `Version ${program.version}` : 'All students';
}

export function GenEdSelector({
  programs,
  selectedPrograms,
  onSelectionChange,
  matchStatus,
  enrollmentYear,
  isTransfer,
  loading,
}: Readonly<GenEdSelectorProps>) {
  const recommendedProgram = useMemo(
    () => getRecommendedProgram(programs, enrollmentYear),
    [programs, enrollmentYear],
  );

  useEffect(() => {
    if (
      recommendedProgram &&
      selectedPrograms.length === 0 &&
      !loading
    ) {
      onSelectionChange([recommendedProgram]);
    }
  }, [recommendedProgram, selectedPrograms.length, onSelectionChange, loading]);

  const handleProgramToggle = (program: ProgramRow) => {
    const alreadySelected = selectedPrograms.some((p) => p.id === program.id);

    if (alreadySelected) {
      onSelectionChange(selectedPrograms.filter((p) => p.id !== program.id));
      return;
    }

    if (isTransfer) {
      onSelectionChange([...selectedPrograms, program]);
    } else {
      onSelectionChange([program]);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="mb-4">
        <p className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
          General Education Programs
        </p>
        <p className="font-body text-xs text-[var(--muted-foreground)]">
          {isTransfer
            ? 'Select all gen-ed catalogs that apply to your transfer credits. Courses will be matched automatically.'
            : 'Choose the catalog that matches your admission year. Courses will be matched automatically.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {loading && (
          <div className="font-body text-sm text-[var(--muted-foreground)]">Loading Gen Ed programs…</div>
        )}

        {!loading && !programs.length && (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
            No general education programs were found for your university.
          </div>
        )}

        {!loading &&
          programs.map((program) => {
            const isSelected = selectedPrograms.some((p) => p.id === program.id);
            const isRecommended = recommendedProgram?.id === program.id;

            return (
              <button
                key={program.id}
                type="button"
                onClick={() => handleProgramToggle(program)}
                className={`flex flex-col rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-md'
                    : 'border-[var(--border)] bg-[var(--card)] hover:-translate-y-0.5 hover:shadow-sm'
                }`}
              >
                <span className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
                  {program.name}
                </span>
                <span className="font-body text-xs text-[var(--muted-foreground)]">
                  {formatYearRange(program)}
                </span>
                {isRecommended && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-xs text-[var(--muted-foreground)] sm:grid-cols-3">
        <div>
          <p className="font-body-semi text-[var(--foreground)]">Total Courses</p>
          <p className="font-body text-sm">{matchStatus.total}</p>
        </div>
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <p className="font-body-semi text-[var(--foreground)]">Matched</p>
                  <Info size={14} className="text-[var(--muted-foreground)]" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Courses automatically matched to program requirements. Auto-matching is limited in scope, so some courses may be incorrectly attributed. Use "Change Requirements" to manually adjust if needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="font-body text-sm text-green-600">{matchStatus.matched}</p>
        </div>
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <p className="font-body-semi text-[var(--foreground)]">Unmatched</p>
                  <Info size={14} className="text-[var(--muted-foreground)]" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Courses not matched to any program requirement. These may be electives or courses not applicable to your selected programs. Use "Change Requirements" to manually assign if needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="font-body text-sm text-red-600">{matchStatus.unmatched}</p>
        </div>
      </div>
    </section>
  );
}
