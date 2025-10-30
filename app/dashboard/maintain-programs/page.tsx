'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StuLoader } from '@/components/ui/StuLoader';
import { getSessionUser } from '@/lib/services/auth';
import { getUserUniversityId } from '@/lib/services/profileService';
import { fetchMyProfile } from '@/lib/services/profileService.server';
import type { ProgramRow } from '@/types/program';
import ProgramsTable from '@/components/maintain-programs/programs-table';
import { fetchProgramsByUniversity, deleteProgram } from '@/lib/services/server-actions';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function MaintainProgramsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<ProgramRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [universityId, setUniversityId] = React.useState<number>(0);
  const [userRole, setUserRole] = React.useState<number | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const user = await getSessionUser();
        const profile = await fetchMyProfile(user.id);

        // Redirect students (role 3) to dashboard
        if (profile.role_id === 3) {
          router.push('/dashboard');
          return;
        }

        const universityId = await getUserUniversityId(user.id);
        const programs = await fetchProgramsByUniversity(universityId);

        if (!active) return;
        setUserRole(profile.role_id);
        setUniversityId(universityId);
        setRows(programs);
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('Failed to load programs');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const handleDeleteProgram = async (program: ProgramRow) => {
    try {
      setError(null);
      
      // Call the delete API
      await deleteProgram(program.id);
      
      // Remove the program from local state
      setRows(prevRows => prevRows.filter(row => row.id !== program.id));
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to delete program');
      }
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Modern Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="font-header text-3xl font-bold text-[var(--foreground)]">
            Maintain Programs
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)]">
            Create and manage academic programs, majors, and minors
          </p>
        </div>

        <Button
          component={Link}
          href="/dashboard/maintain-programs/new"
          startIcon={<AddIcon />}
          sx={{
            backgroundColor: '#12F987',
            color: '#0A0A0A',
            fontWeight: 600,
            textTransform: 'none',
            px: 3,
            py: 1.5,
            '&:hover': {
              backgroundColor: '#0ed676',
              transform: 'translateY(-2px)',
              boxShadow: 2
            },
            transition: 'all 0.2s'
          }}
        >
          Add Program
        </Button>
      </div>

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Programs */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Total Programs</p>
                <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">{rows.length}</p>
              </div>
            </div>
          </div>

          {/* Majors */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
                <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">
                  {rows.filter(r => r.program_type.toUpperCase() === 'MAJOR').length}
                </p>
              </div>
            </div>
          </div>

          {/* Minors */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#5E35B1]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Minors</p>
                <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">
                  {rows.filter(r => r.program_type.toUpperCase() === 'MINOR').length}
                </p>
              </div>
            </div>
          </div>

          {/* Graduate Programs */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F59E0B]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <div>
                <p className="font-body text-xs font-medium text-[var(--muted-foreground)]">Graduate</p>
                <p className="font-header-bold text-2xl font-extrabold text-[var(--foreground)]">
                  {rows.filter(r => r.program_type === 'graduate_no_gen_ed' || r.program_type === 'graduate_with_gen_ed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white p-16 shadow-sm">
          <StuLoader variant="card" text="Loading programs..." />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#ef4444] bg-[color-mix(in_srgb,#ef4444_5%,transparent)] p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-body-semi text-sm font-semibold text-[#ef4444]">Error Loading Programs</p>
            <p className="font-body mt-1 text-xs text-[color-mix(in_srgb,#ef4444_90%,black)]">{error}</p>
          </div>
        </div>
      ) : (
        <ProgramsTable
          rows={rows}
          onDelete={handleDeleteProgram}
          canDelete={userRole === 1} // Only admins (role 1) can delete
        />
      )}
    </div>
  );
}
