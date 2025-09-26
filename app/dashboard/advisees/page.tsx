import { getStudentsWithProgramsServer } from '@/lib/services/profileService.server';
import AdvisorStudentsTable from '@/components/advisor/advisor-students-table';

export const dynamic = 'force-dynamic';

export default async function AdviseesPage() {
  const rows = await getStudentsWithProgramsServer();

  return (
    <div className="space-y-6 px-4 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Advisees</h1>
      </div>
      <AdvisorStudentsTable rows={rows} />
    </div>
  );
}