'use client';

import { useState, useEffect } from 'react';
import { Check, Settings, AlertCircle, X } from 'lucide-react';
import { StuLoader } from '@/components/ui/StuLoader';
import { SELECTION_MODES, SELECTION_MODE_DESCRIPTIONS, type SelectionMode } from '@/lib/selectionMode';

export default function SystemPage() {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('MANUAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch current user's university_id and current settings
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Get current user's profile to find university_id
        const profileRes = await fetch('/api/my-profile');
        if (!profileRes.ok) {
          throw new Error('Failed to fetch profile');
        }
        const profileData = await profileRes.json();
        const univId = profileData.university_id;
        setUniversityId(univId);

        // Fetch institution settings
        const settingsRes = await fetch(`/api/institutions/${univId}/settings`);
        if (!settingsRes.ok) {
          throw new Error('Failed to fetch settings');
        }
        const settingsData = await settingsRes.json();
        setSelectionMode(settingsData.selection_mode || 'MANUAL');
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSave = async () => {
    if (!universityId) {
      setSnackbar({ open: true, message: 'University ID not found', severity: 'error' });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/institutions/${universityId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selection_mode: selectionMode })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save settings');
      }

      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error saving settings:', err);
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setError(message);
      setSnackbar({ open: true, message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <StuLoader variant="page" text="Loading system settings..." speed={2.5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] shadow-sm">
            <Settings size={20} className="text-black" />
          </div>
          <h1 className="font-header-bold text-3xl font-extrabold text-[var(--foreground)]">
            System Settings
          </h1>
        </div>
        <p className="font-body text-sm text-[var(--muted-foreground)] ml-[52px]">
          Configure institution-wide system settings
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-body-semi text-sm font-semibold text-red-900">Error</p>
                <p className="font-body text-sm text-red-800">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] shadow-sm transition-shadow duration-200 hover:shadow-md">
        {/* Bold black header matching other dashboard components */}
        <div className="border-b-2 px-6 py-4" style={{ backgroundColor: "#0A0A0A", borderColor: "#0A0A0A" }}>
          <h2 className="font-header text-lg font-bold text-white">
            Plan Creation Mode
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <p className="font-body text-sm text-[var(--muted-foreground)]">
            Choose how students select courses when creating a new graduation plan.
          </p>

          {/* Selection Mode Dropdown */}
          <div>
            <label className="font-body-semi mb-2 block text-sm font-medium text-[var(--foreground)]">
              Selection Mode
            </label>
            <div className="relative">
              <select
                value={selectionMode}
                onChange={(e) => setSelectionMode(e.target.value as SelectionMode)}
                disabled={saving}
                className="font-body w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {SELECTION_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--muted-foreground)]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Mode Descriptions */}
          <div className="space-y-3 rounded-xl bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] p-4">
            {SELECTION_MODES.map((mode, index) => (
              <div
                key={mode}
                className={`${
                  index < SELECTION_MODES.length - 1
                    ? 'border-b border-[var(--border)] pb-3'
                    : ''
                } ${mode === selectionMode ? 'opacity-100' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-2">
                  {mode === selectionMode && (
                    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]">
                      <Check size={12} className="text-black" />
                    </div>
                  )}
                  <div className={mode === selectionMode ? '' : 'ml-7'}>
                    <h3 className="font-header-bold text-sm font-bold text-[var(--foreground)]">
                      {mode}
                    </h3>
                    <p className="font-body mt-1 text-sm text-[var(--muted-foreground)]">
                      {SELECTION_MODE_DESCRIPTIONS[mode]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 font-body-semi text-sm font-semibold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success/Error Snackbar */}
      {snackbar.open && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4">
          <div
            className={`flex min-w-[300px] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              snackbar.severity === 'success'
                ? 'border-green-200 bg-green-50 text-green-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <p className="font-body-semi flex-1 text-sm font-medium">{snackbar.message}</p>
            <button
              type="button"
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              className="rounded-md p-1 transition-colors hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
