import { getVerifiedUser, getVerifiedUserProfile } from '@/lib/supabase/auth';
import { redirect } from 'next/navigation';
import SettingsClient from '@/components/settings/settings-client';
import UniversityEditor from '@/components/settings/university-editor';

export default async function SettingsPage() {
  const user = await getVerifiedUser();

  if (!user) {
    redirect('/login?next=/dashboard/settings');
  }

  const profile = await getVerifiedUserProfile();

  if (!profile) {
    redirect('/login?next=/dashboard/settings');
  }

  const isDev = process.env.NEXT_PUBLIC_ENV === 'dev';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color-mix(in_srgb,var(--muted)_20%,transparent)] to-transparent">
      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Modern page header */}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-header)] font-extrabold text-4xl text-[var(--foreground)] tracking-tight">
            Settings
          </h1>
          <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
            Manage your account preferences and theme customization
          </p>
        </div>

        {/* Dev-only University Editor */}
        {isDev && <UniversityEditor />}

        {/* Dev-only User Settings */}
        {isDev && <SettingsClient user={user} profile={profile} />}
      </div>
    </div>
  );
}
