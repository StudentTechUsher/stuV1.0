'use client';

import { useRouter } from 'next/navigation';
import type { ProgramRow } from '@/types/program';

interface ProgramFlowClientProps {
  programs: ProgramRow[];
}

export default function ProgramFlowClient({ programs }: Readonly<ProgramFlowClientProps>) {
  const router = useRouter();

  const handleProgramClick = (programId: string) => {
    router.push(`/program-flow/${programId}`);
  };

  // Categorize programs by type
  const majors = programs.filter(p => p.program_type.toLowerCase() === 'major');
  const minors = programs.filter(p => p.program_type.toLowerCase() === 'minor');
  const genEds = programs.filter(p => p.program_type.toLowerCase() === 'gen_ed');
  const otherPrograms = programs.filter(
    p => p.program_type.toLowerCase() !== 'major' &&
         p.program_type.toLowerCase() !== 'minor' &&
         p.program_type.toLowerCase() !== 'gen_ed'
  );
 
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-header text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Program Flow
        </h1>
        <p className="font-body text-sm text-[var(--muted-foreground)]">
          View and manage program flows and requirements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Total Programs */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Total Programs</p>
              <p className="font-header-bold text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{programs.length}</p>
            </div>
          </div>
        </div>

        {/* Majors */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2196f3]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Majors</p>
              <p className="font-header-bold text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{majors.length}</p>
            </div>
          </div>
        </div>

        {/* Minors */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#5E35B1]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Minors</p>
              <p className="font-header-bold text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{minors.length}</p>
            </div>
          </div>
        </div>

        {/* General Ed */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FF9800]">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">General Ed</p>
              <p className="font-header-bold text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{genEds.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="space-y-6">
        {/* Majors Section */}
        {majors.length > 0 && (
          <div>
            <h2 className="font-header mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Majors</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {majors.map((program) => (
                <ProgramCard key={program.id} program={program} onClick={handleProgramClick} />
              ))}
            </div>
          </div>
        )}

        {/* Minors Section */}
        {minors.length > 0 && (
          <div>
            <h2 className="font-header mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Minors</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {minors.map((program) => (
                <ProgramCard key={program.id} program={program} onClick={handleProgramClick} />
              ))}
            </div>
          </div>
        )}

        {/* General Education Section */}
        {genEds.length > 0 && (
          <div>
            <h2 className="font-header mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">General Education</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {genEds.map((program) => (
                <ProgramCard key={program.id} program={program} onClick={handleProgramClick} />
              ))}
            </div>
          </div>
        )}

        {/* Other Programs Section */}
        {otherPrograms.length > 0 && (
          <div>
            <h2 className="font-header mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Other Programs</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} onClick={handleProgramClick} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {programs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white p-12 shadow-sm">
            <svg className="mb-4 h-16 w-16 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="font-header-semi mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No programs found</h3>
            <p className="font-body text-sm text-[var(--muted-foreground)]">There are no programs available for your university.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProgramCardProps {
  program: ProgramRow;
  onClick: (programId: string) => void;
}

function ProgramCard({ program, onClick }: Readonly<ProgramCardProps>) {
  const typeColors: Record<string, { bg: string; text: string }> = {
    major: { bg: 'bg-[#2196f3]', text: 'text-[#2196f3]' },
    minor: { bg: 'bg-[#5E35B1]', text: 'text-[#5E35B1]' },
    general_ed: { bg: 'bg-[#FF9800]', text: 'text-[#FF9800]' },
  };

  const typeKey = program.is_general_ed ? 'general_ed' : program.program_type.toLowerCase();
  const colors = typeColors[typeKey] || { bg: 'bg-[var(--primary)]', text: 'text-[var(--primary)]' };

  return (
    <button
      onClick={() => onClick(program.id)}
      className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full ${colors.bg} bg-opacity-10 px-2.5 py-0.5 font-body-semi text-xs font-semibold ${colors.text}`}>
              {program.is_general_ed ? 'General Ed' : program.program_type}
            </span>
            {program.version && (
              <span className="font-body text-xs text-[var(--muted-foreground)]">v{program.version}</span>
            )}
          </div>
          <h3 className="font-header-semi mb-2 text-lg font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]">
            {program.name}
          </h3>
          {program.modified_at && (
            <p className="font-body text-xs text-[var(--muted-foreground)]">
              Updated {new Date(program.modified_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <svg
          className="h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-all group-hover:translate-x-1 group-hover:text-[var(--primary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
