import SettingsClient from '@/components/settings/settings-client';
import UniversityEditor from '@/components/settings/university-editor';

export default async function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[color-mix(in_srgb,var(--muted)_20%,transparent)] to-transparent">
      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
        {/* Modern page header */}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-header)] font-extrabold text-4xl text-[var(--foreground)] tracking-tight">
            Settings
          </h1>
          <p className="text-base text-[var(--muted-foreground)] leading-relaxed">
            Manage your account preferences and theme customization here
          </p>
        </div>

        {/* University Editor - Available to all users */}
        <UniversityEditor />

        {/* User Settings - Available to all users */}
        <SettingsClient />
      </div>
    </div>
  );
}
