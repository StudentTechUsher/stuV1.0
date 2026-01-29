import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    FormControlLabel,
    Checkbox,
    Typography,
    Box,
    TextField,
    Switch,
    Divider,
    Grid,
    Select,
    MenuItem,
    InputLabel
} from '@mui/material';
import { SchedulePreferences } from '@/lib/services/scheduleService';

interface SchedulePreferencesDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (preferences: Partial<SchedulePreferences>) => void;
    initialPreferences: SchedulePreferences;
    isLoading?: boolean;
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

export default function SchedulePreferencesDialog({
    open,
    onClose,
    onSave,
    initialPreferences,
    isLoading = false
}: SchedulePreferencesDialogProps) {
    const [preferences, setPreferences] = useState<SchedulePreferences>(initialPreferences);

    useEffect(() => {
        if (open) {
            setPreferences(initialPreferences || {});
        }
    }, [open, initialPreferences]);

    const handleSave = () => {
        onSave(preferences);
        onClose();
    };

    const handleDayToggle = (day: number) => {
        const currentPreferred = preferences.preferred_days || [];
        const newPreferred = currentPreferred.includes(day)
            ? currentPreferred.filter(d => d !== day)
            : [...currentPreferred, day];

        setPreferences({ ...preferences, preferred_days: newPreferred });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ fontWeight: 700, fontFamily: '"Red Hat Display", sans-serif' }}>
                Scheduling Preferences
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Time Preferences */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                            Class Timing
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Earliest Start Time"
                                    type="time"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={preferences.earliest_class_time || ''}
                                    onChange={(e) => setPreferences({ ...preferences, earliest_class_time: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Latest End Time"
                                    type="time"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={preferences.latest_class_time || ''}
                                    onChange={(e) => setPreferences({ ...preferences, latest_class_time: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Day Preferences */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                            Preferred Days
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Select the days you prefer to have classes.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {DAYS_OF_WEEK.map((day) => {
                                const isSelected = (preferences.preferred_days || []).includes(day.value);
                                return (
                                    <Button
                                        key={day.value}
                                        variant={isSelected ? "contained" : "outlined"}
                                        onClick={() => handleDayToggle(day.value)}
                                        sx={{
                                            minWidth: 40,
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            p: 0,
                                            fontWeight: 600
                                        }}
                                    >
                                        {day.label.charAt(0)}
                                    </Button>
                                );
                            })}
                        </Box>
                    </Box>

                    <Divider />

                    {/* Breaks & gaps */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                            Breaks & Layout
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={preferences.lunch_break_required || false}
                                            onChange={(e) => setPreferences({ ...preferences, lunch_break_required: e.target.checked })}
                                        />
                                    }
                                    label="Reserve lunch break (12:00 - 1:00 PM)"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={preferences.prefer_condensed || false}
                                            onChange={(e) => setPreferences({ ...preferences, prefer_condensed: e.target.checked })}
                                        />
                                    }
                                    label="Prefer condensed schedule"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={preferences.prefer_gaps || false}
                                            onChange={(e) => setPreferences({ ...preferences, prefer_gaps: e.target.checked })}
                                        />
                                    }
                                    label="Prefer gaps between classes"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    {/* Waitlist settings */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                            Registration Settings
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={preferences.allow_waitlist || false}
                                    onChange={(e) => setPreferences({ ...preferences, allow_waitlist: e.target.checked })}
                                />
                            }
                            label="Allow waitlisted sections if full"
                        />
                        {preferences.allow_waitlist && (
                            <TextField
                                label="Max Waitlist Position"
                                type="number"
                                size="small"
                                sx={{ mt: 2, width: 200 }}
                                value={preferences.max_waitlist_position || 10}
                                onChange={(e) => setPreferences({ ...preferences, max_waitlist_position: parseInt(e.target.value) })}
                            />
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={isLoading}
                    sx={{ fontWeight: 600 }}
                >
                    {isLoading ? 'Saving...' : 'Save Preferences'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
