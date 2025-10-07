'use client';

import { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Snackbar
} from '@mui/material';
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
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 style={{
          fontFamily: '"Red Hat Display", sans-serif',
          fontWeight: 800,
          color: 'black',
          fontSize: '2rem',
          margin: 0,
          marginBottom: '24px'
        }}>System Settings</h1>
        <div className="text-sm text-muted-foreground">
          Configure institution-wide system settings
        </div>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <h2 className="font-header-bold text-lg mb-4">
            Plan Creation Mode
          </h2>
          <p className="font-body text-sm text-muted-foreground mb-6">
            Choose how students select courses when creating a new graduation plan.
          </p>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel className="font-body">Selection Mode</InputLabel>
            <Select
              value={selectionMode}
              label="Selection Mode"
              onChange={(e) => setSelectionMode(e.target.value as SelectionMode)}
              disabled={saving}
            >
              {SELECTION_MODES.map((mode) => (
                <MenuItem key={mode} value={mode} className="font-body">
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Mode descriptions */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            {SELECTION_MODES.map((mode, index) => (
              <div
                key={mode}
                className={`${index < SELECTION_MODES.length - 1 ? 'mb-4 pb-4 border-b border-border' : ''}`}
              >
                <h3 className="font-header-bold text-sm mb-1">
                  {mode}
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  {SELECTION_MODE_DESCRIPTIONS[mode]}
                </p>
              </div>
            ))}
          </div>

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            className="font-body-semi"
            sx={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'var(--hover-green)'
              },
              '&:disabled': {
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-foreground)'
              }
            }}
          >
            {saving ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
