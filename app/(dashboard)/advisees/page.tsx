import { getStudentsWithProgramsServer } from '@/lib/services/profileService.server';
import AdvisorStudentsTable from '@/components/advisor/advisor-students-table';
import { getVerifiedUserProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdviseesPage() {
  // Check user's role - only admins (1) and advisors (2) can access
  const profile = await getVerifiedUserProfile();

  if (!profile || (profile.role_id !== 1 && profile.role_id !== 2)) {
    redirect('/dashboard');
  }

  const rows = await getStudentsWithProgramsServer();

  return (
    <main className="p-4 sm:p-6 space-y-6">
      {/* Modern Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-header-bold text-3xl sm:text-4xl font-bold text-[#0A0A0A]">
            My Advisees
          </h1>
          <p className="font-body text-sm text-[var(--muted-foreground)] mt-2">
            Manage and view all students under your advisory
          </p>
        </div>

        {/* Stats Badge */}
        <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 shadow-sm">
          <svg className="h-5 w-5 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="font-body-semi text-sm text-[#0A0A0A]">
            <span className="font-bold">{rows.length}</span> {rows.length === 1 ? 'Student' : 'Students'}
          </span>
        </div>
      </div>

      {/* Students Table */}
      <AdvisorStudentsTable rows={rows} />
    </main>
  );
}
