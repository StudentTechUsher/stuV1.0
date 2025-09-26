import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/settings/settings-client';
import UniversityEditor from '@/components/settings/university-editor';

export default async function SettingsPage() {
  const user = await getVerifiedUser();

  if (!user) {
    redirect('/login?next=/settings');
  }

  const profile = await getVerifiedUserProfile();

  if (!profile) {
    redirect('/login?next=/settings');
  }

  const isDev = process.env.NEXT_PUBLIC_ENV === 'dev';

  return (
    <div className="px-4 sm:px-6 md:px-8 max-w-screen-lg mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and theme customization
        </p>
      </div>

      {/* Dev-only University Editor */}
      {isDev && <UniversityEditor />}

      {/* Dev-only User Settings */}
      {isDev && <SettingsClient user={user} profile={profile} />}
    </div>
  );
}