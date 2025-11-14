import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/services/auth';
import { fetchMyProfile } from '@/lib/services/profileService.server';
import { fetchProgramById } from '@/lib/services/programService';
import ProgramEditor from '@/components/maintain-programs/program-editor';

export default async function ProgramEditPage({ params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    const profile = await fetchMyProfile(user.id);

    // Redirect students (role 3) to dashboard
    if (profile.role_id === 3) {
      redirect('/dashboard');
    }

    // Fetch the program
    const program = await fetchProgramById(params.id);

    return <ProgramEditor program={program} />;
  } catch (error) {
    console.error('Failed to load program:', error);
    redirect('/dashboard/maintain-programs');
  }
}
