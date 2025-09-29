import { getStudentsWithProgramsServer } from '@/lib/services/profileService.server';
import AdvisorStudentsTable from '@/components/advisor/advisor-students-table';

export const dynamic = 'force-dynamic';

export default async function AdviseesPage() {
  const rows = await getStudentsWithProgramsServer();

  return (
    <div style={{ padding: '16px' }}>
      <h1
        style={{
          fontFamily: '"Red Hat Display", sans-serif',
          fontWeight: 800,
          color: 'black',
          fontSize: '2rem',
          margin: 0,
          marginBottom: '24px',
        }}
      >
        My Advisees
      </h1>
      <AdvisorStudentsTable rows={rows} />
    </div>
  );
}
