import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/services/auth';
import { fetchMyProfile, getUserUniversityId } from '@/lib/services/profileService.server';
import NewProgramForm from '@/components/maintain-programs/new-program-form';

export default async function NewProgramPage() {
  try {
    const user = await getSessionUser();
    const profile = await fetchMyProfile(user.id);

    // Redirect students (role 3) to dashboard
    if (profile.role_id === 3) {
      redirect('/dashboard');
    }

    // Get the user's university ID
    const universityId = await getUserUniversityId(user.id);

    return <NewProgramForm universityId={universityId} />;
  } catch (error) {
    console.error('Failed to load new program page:', error);
    redirect('/dashboard/maintain-programs');
  }
}
