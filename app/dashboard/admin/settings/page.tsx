'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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

export default function AdminSettingsPage() {
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
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        className="font-header-bold"
        sx={{ mb: 1, color: 'var(--primary)' }}
      >
        Admin Settings
      </Typography>
      <Typography variant="body1" className="font-body" sx={{ mb: 4, color: 'text.secondary' }}>
        Configure institution-wide settings for STU.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" className="font-header-bold" sx={{ mb: 2 }}>
            Plan Creation Mode
          </Typography>
          <Typography variant="body2" className="font-body" sx={{ mb: 3, color: 'text.secondary' }}>
            Choose how students select courses when creating a new graduation plan.
          </Typography>

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
          <Box sx={{ mb: 3, p: 2, bgcolor: 'var(--muted)', borderRadius: 1 }}>
            {SELECTION_MODES.map((mode) => (
              <Box
                key={mode}
                sx={{
                  mb: 2,
                  pb: 2,
                  borderBottom: mode !== 'CHOICE' ? '1px solid var(--border)' : 'none'
                }}
              >
                <Typography variant="subtitle2" className="font-header-bold" sx={{ mb: 0.5 }}>
                  {mode}
                </Typography>
                <Typography variant="body2" className="font-body" sx={{ color: 'text.secondary' }}>
                  {SELECTION_MODE_DESCRIPTIONS[mode]}
                </Typography>
              </Box>
            ))}
          </Box>

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
    </Box>
  );
}
