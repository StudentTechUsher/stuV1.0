import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/services/auth';
import { fetchMyProfile } from '@/lib/services/profileService.server';
import { fetchProgramById } from '@/lib/services/programService';
import ProgramEditor from '@/components/maintain-programs/program-editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramEditPage({ params }: Readonly<PageProps>) {
  const { id } = await params;
  const user = await getSessionUser();
  const profile = await fetchMyProfile(user.id);

  // Redirect students (role 3) to dashboard
  if (profile.role_id === 3) {
    redirect('/dashboard');
  }

  let program;
  try {
    // Fetch the program
    program = await fetchProgramById(id);
  } catch (error) {
    console.error('Failed to load program:', error);
    redirect('/maintain-programs');
  }

  return <ProgramEditor program={program} />;
}
