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
  IconButton,
  Paper,
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
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
  };

  const handleDeleteEvent = (index: number) => {
    onEventsChange(events.filter((_event, i) => i !== index));
  };

  const handleDayToggle = (day: number) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(day)
        ? formData.daysOfWeek.filter(d => d !== day)
        : [...formData.daysOfWeek, day].sort()
    });
  };

  const getEventColor = (category: string) => {
    switch (category) {
      case 'Work': return 'var(--action-cancel)';
      case 'Club': return 'var(--action-info)';
      case 'Sports': return 'var(--action-edit)';
      case 'Study': return 'var(--primary)';
      case 'Family': return 'var(--hover-gray)';
      default: return 'var(--hover-green)';
    }
  };

  const getEventBackgroundColor = (category: string) => {
    switch (category) {
      case 'Work': return 'rgba(244, 67, 54, 0.1)';
      case 'Club': return 'rgba(25, 118, 210, 0.1)';
      case 'Sports': return 'rgba(253, 204, 74, 0.1)';
      case 'Study': return 'var(--primary-15)';
      case 'Family': return 'rgba(63, 63, 70, 0.1)';
      default: return 'rgba(6, 201, 108, 0.1)';
    }
  };

  const getDayName = (dayNum: number) => {
    return dayNames[dayNum - 1] || 'Unknown';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Add Personal Events
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Block off times when you're unavailable for classes (work, clubs, etc.)
        </Typography>
      </Box>

      {/* Event Form */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid var(--border)', borderRadius: 2 }}>
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
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
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
            Add Event
          </Button>
        </Box>
      </Paper>

      {/* Events List */}
      {events.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
            Added Events ({events.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {events.map((event, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  bgcolor: getEventBackgroundColor(event.category),
                  borderRadius: 2,
                  borderLeft: `3px solid ${getEventColor(event.category)}`,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.category} • {getDayName(event.day_of_week)} • {event.start_time} - {event.end_time}
                  </Typography>
                </Box>
                <IconButton onClick={() => handleDeleteEvent(index)} size="small">
                  <Trash2 size={18} />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

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
