import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/settings/settings-client';

export default async function SettingsPage() {
  const user = await getVerifiedUser();

  if (!user) {
    redirect('/login?next=/settings');
  }

  const profile = await getVerifiedUserProfile();

  if (!profile) {
    redirect('/login?next=/settings');
  }

  return (
    <div className="px-4 sm:px-6 md:px-8 max-w-screen-lg mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences and theme customization
        </p>
      </div>

      <SettingsClient user={user} profile={profile} />
    </div>
  );
}