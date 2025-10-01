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
    <div className="space-y-6 p-6">
      <div>
        <h1 style={{
          fontFamily: '"Red Hat Display", sans-serif',
          fontWeight: 800,
          color: 'black',
          fontSize: '2rem',
          margin: 0,
          marginBottom: '8px'
        }}>Settings</h1>
        <p className="text-sm text-muted-foreground">
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