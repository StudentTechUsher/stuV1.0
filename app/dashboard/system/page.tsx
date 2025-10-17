'use client';

import { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Snackbar,
  Box,
  Stack,
  Typography,
  ButtonBase
} from '@mui/material';
import { Settings, CheckCircle2 } from 'lucide-react';
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
      <Box className="p-4 sm:p-6">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '4px solid color-mix(in srgb, var(--primary) 30%, transparent)',
              borderTopColor: 'var(--primary)',
              animation: 'spin 0.8s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }}
          />
          <Typography className="font-body" sx={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            Loading settings...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="p-4 sm:p-6">
      <Stack spacing={3}>
        {/* Page Header */}
        <Box>
          <Typography
            className="font-header-bold"
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem' },
              fontWeight: 800,
              color: '#0A0A0A',
              mb: 1
            }}
          >
            System Settings
          </Typography>
          <Typography
            className="font-body"
            sx={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              maxWidth: '600px'
            }}
          >
            Configure institution-wide settings that affect all students and advisors
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              borderRadius: '12px',
              border: '1px solid color-mix(in srgb, var(--destructive) 20%, transparent)',
              '& .MuiAlert-icon': {
                color: 'var(--destructive)'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Main Settings Card */}
        <Box
          sx={{
            borderRadius: '16px',
            bgcolor: 'var(--card)',
            border: '1px solid color-mix(in srgb, var(--muted-foreground) 10%, transparent)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }
          }}
        >
          {/* Card Header - Bold black like academic-summary */}
          <Box
            sx={{
              background: '#0A0A0A',
              borderBottom: '2px solid #0A0A0A',
              p: 3
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(18, 249, 135, 0.3)'
                }}
              >
                <Settings size={24} color="#0A0A0A" strokeWidth={2.5} />
              </Box>
              <Box>
                <Typography
                  className="font-header-bold"
                  sx={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}
                >
                  Plan Creation Mode
                </Typography>
                <Typography
                  className="font-body"
                  sx={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', mt: 0.5 }}
                >
                  Control how students build graduation plans
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Card Content */}
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={4}>
              {/* Description */}
              <Typography
                className="font-body"
                sx={{
                  fontSize: '0.9375rem',
                  color: 'var(--foreground)',
                  lineHeight: 1.6
                }}
              >
                Choose how students select courses when creating a new graduation plan. This setting applies to all students at your institution.
              </Typography>

              {/* Selection Mode Dropdown */}
              <FormControl fullWidth>
                <InputLabel
                  className="font-body-semi"
                  sx={{
                    color: 'var(--muted-foreground)',
                    '&.Mui-focused': { color: 'var(--primary)' },
                    fontSize: '0.875rem'
                  }}
                >
                  Selection Mode
                </InputLabel>
                <Select
                  value={selectionMode}
                  label="Selection Mode"
                  onChange={(e) => setSelectionMode(e.target.value as SelectionMode)}
                  disabled={saving}
                  className="font-body-semi"
                  sx={{
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--border)',
                      transition: 'all 0.2s'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'var(--primary)',
                      borderWidth: '2px'
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'var(--muted)'
                    }
                  }}
                >
                  {SELECTION_MODES.map((mode) => (
                    <MenuItem key={mode} value={mode} className="font-body-semi">
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Mode Descriptions - Modern card design */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: '12px',
                  bgcolor: 'color-mix(in srgb, var(--muted) 30%, transparent)',
                  border: '1px solid var(--border)'
                }}
              >
                <Typography
                  className="font-body-semi"
                  sx={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--muted-foreground)',
                    mb: 3
                  }}
                >
                  Mode Descriptions
                </Typography>

                <Stack spacing={3}>
                  {SELECTION_MODES.map((mode) => {
                    const isSelected = mode === selectionMode;
                    return (
                      <ButtonBase
                        key={mode}
                        onClick={() => setSelectionMode(mode)}
                        disabled={saving}
                        sx={{
                          width: '100%',
                          p: 2.5,
                          borderRadius: '10px',
                          border: '2px solid',
                          borderColor: isSelected
                            ? 'var(--primary)'
                            : 'color-mix(in srgb, var(--border) 60%, transparent)',
                          bgcolor: isSelected
                            ? 'color-mix(in srgb, var(--primary) 8%, transparent)'
                            : 'white',
                          textAlign: 'left',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover:not(:disabled)': {
                            borderColor: 'var(--primary)',
                            bgcolor: 'color-mix(in srgb, var(--primary) 5%, transparent)',
                            transform: 'translateY(-1px)'
                          },
                          '&:disabled': {
                            opacity: 0.6,
                            cursor: 'not-allowed'
                          }
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ width: '100%' }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: '2px solid',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                              bgcolor: isSelected ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              mt: 0.25,
                              transition: 'all 0.2s'
                            }}
                          >
                            {isSelected && <CheckCircle2 size={14} color="#0A0A0A" strokeWidth={3} />}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              className="font-body-semi"
                              sx={{
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                color: isSelected ? 'var(--foreground)' : 'var(--foreground)',
                                mb: 0.5
                              }}
                            >
                              {mode}
                            </Typography>
                            <Typography
                              className="font-body"
                              sx={{
                                fontSize: '0.875rem',
                                color: 'var(--muted-foreground)',
                                lineHeight: 1.5
                              }}
                            >
                              {SELECTION_MODE_DESCRIPTIONS[mode]}
                            </Typography>
                          </Box>
                        </Stack>
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </Box>

              {/* Save Button */}
              <Box sx={{ pt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  className="font-body-semi"
                  fullWidth
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: '12px',
                    bgcolor: '#0A0A0A',
                    color: 'white',
                    fontSize: '0.9375rem',
                    textTransform: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#1a1a1a',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 8px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    },
                    '&:disabled': {
                      bgcolor: 'var(--muted)',
                      color: 'var(--muted-foreground)',
                      transform: 'none'
                    }
                  }}
                >
                  {saving ? (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '3px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          animation: 'spin 0.8s linear infinite',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' }
                          }
                        }}
                      />
                      <span>Saving Changes...</span>
                    </Stack>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Stack>

      {/* Success/Error Snackbar */}
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
          sx={{
            width: '100%',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            '&.MuiAlert-filledSuccess': {
              bgcolor: 'var(--primary)',
              color: '#0A0A0A'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
