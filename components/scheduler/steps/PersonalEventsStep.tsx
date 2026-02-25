'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { BlockedTime } from '@/lib/services/scheduleService';

interface PersonalEventsStepProps {
  events: Omit<BlockedTime, 'id'>[];
  onEventsChange: (events: Omit<BlockedTime, 'id'>[]) => void;
  onNext: () => void;
}

const eventCategories = ['Work', 'Club', 'Sports', 'Study', 'Family', 'Other'] as const;
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PersonalEventsStep({
  events,
  onEventsChange,
  onNext,
}: PersonalEventsStepProps) {
  const [endTimeManual, setEndTimeManual] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    category: typeof eventCategories[number];
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  }>({
    title: '',
    category: 'Other',
    daysOfWeek: [],
    startTime: '09:00',
    endTime: '10:00',
  });

  const addMinutesToTime = (time: string, minutesToAdd: number) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return time;
    }
    const totalMinutes = (hours * 60 + minutes + minutesToAdd) % (24 * 60);
    const nextHours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const nextMinutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${nextHours}:${nextMinutes}`;
  };

  const handleAddEvent = () => {
    if (!formData.title.trim() || formData.daysOfWeek.length === 0) {
      return;
    }

    // Create an event for each selected day
    const newEvents = formData.daysOfWeek.map(dayOfWeek => ({
      title: formData.title,
      category: formData.category,
      day_of_week: dayOfWeek,
      start_time: formData.startTime,
      end_time: formData.endTime,
    }));

    onEventsChange([...events, ...newEvents]);

    // Reset form
    setFormData({
      title: '',
      category: 'Other',
      daysOfWeek: [],
      startTime: '09:00',
      endTime: '10:00',
    });
    setEndTimeManual(false);
  };

  const handleDayToggle = (day: number) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(day)
        ? formData.daysOfWeek.filter(d => d !== day)
        : [...formData.daysOfWeek, day].sort()
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Add Personal Events
        </Typography>
      </Box>

      {/* Event Form */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Event Title"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Part-time Job, Club Meeting"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#06C96C' },
                '&:hover fieldset': { borderColor: '#059669' },
                '&.Mui-focused fieldset': { borderColor: '#06C96C' },
              },
              '& .MuiInputLabel-root': { color: '#047857', '&.Mui-focused': { color: '#059669' } },
            }}
          />

          <FormControl fullWidth>
            <InputLabel sx={{ color: '#047857', '&.Mui-focused': { color: '#059669' } }}>
              Category
            </InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={(e) => setFormData({ ...formData, category: e.target.value as typeof eventCategories[number] })}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#06C96C' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#059669' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#06C96C' }
              }}
            >
              {eventCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Days of Week
            </Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
              {dayNames.map((day, index) => (
                <FormControlLabel
                  key={index + 1}
                  control={
                    <Checkbox
                      checked={formData.daysOfWeek.includes(index + 1)}
                      onChange={() => handleDayToggle(index + 1)}
                      sx={{
                        color: '#06C96C',
                        '&.Mui-checked': { color: '#06C96C' },
                      }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 14 }}>{day}</Typography>}
                />
              ))}
            </FormGroup>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              fullWidth
              value={formData.startTime}
              onChange={(e) => {
                const nextStart = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  startTime: nextStart,
                  endTime: endTimeManual ? prev.endTime : addMinutesToTime(nextStart, 60),
                }));
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#06C96C' },
                  '&:hover fieldset': { borderColor: '#059669' },
                  '&.Mui-focused fieldset': { borderColor: '#06C96C' },
                },
                '& .MuiInputLabel-root': { color: '#047857', '&.Mui-focused': { color: '#059669' } },
              }}
            />

            <TextField
              label="End Time"
              type="time"
              fullWidth
              value={formData.endTime}
              onChange={(e) => {
                setEndTimeManual(true);
                setFormData({ ...formData, endTime: e.target.value });
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#06C96C' },
                  '&:hover fieldset': { borderColor: '#059669' },
                  '&.Mui-focused fieldset': { borderColor: '#06C96C' },
                },
                '& .MuiInputLabel-root': { color: '#047857', '&.Mui-focused': { color: '#059669' } },
              }}
            />
          </Box>

          <Button
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={handleAddEvent}
            disabled={!formData.title.trim() || formData.daysOfWeek.length === 0}
            sx={{
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              '&:hover': { borderColor: 'var(--hover-green)', bgcolor: 'var(--primary-15)' },
            }}
          >
            Insert into Scheduler
          </Button>
        </Box>
      </Paper>

      {/* Next Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={onNext}
          sx={{
            bgcolor: 'var(--primary)',
            color: 'black',
            '&:hover': { bgcolor: 'var(--hover-green)' },
            fontWeight: 600,
          }}
        >
          Next: Select Courses
        </Button>
      </Box>
    </Box>
  );
}
