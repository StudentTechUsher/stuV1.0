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
  IconButton,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import timeGridPlugin from '@fullcalendar/timegrid';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

export interface CalendarEvent {
  id: string;
  title: string;
  dayOfWeek: number; // 1-7 (Mon-Sun)
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  location?: string;
  category: 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Course' | 'Other';
  backgroundColor?: string;
  textColor?: string;
}

interface InteractiveCalendarProps {
  events: CalendarEvent[];
  onChange: (events: CalendarEvent[]) => void;
  compact?: boolean;
}

const eventCategories = ['Work', 'Club', 'Sports', 'Study', 'Family', 'Course', 'Other'] as const;
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const categoryColors: Record<string, { bg: string; text: string }> = {
  Work: { bg: '#0ea5e9', text: '#ffffff' },
  Club: { bg: '#8b5cf6', text: '#ffffff' },
  Sports: { bg: '#f59e0b', text: '#ffffff' },
  Study: { bg: '#10b981', text: '#ffffff' },
  Family: { bg: '#ec4899', text: '#ffffff' },
  Course: { bg: '#ef4444', text: '#ffffff' },
  Other: { bg: '#6b7280', text: '#ffffff' },
};

function convertToFullCalendarEvents(events: CalendarEvent[]) {
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Get Monday

  return events.map(event => {
    const eventDate = new Date(currentWeekStart);
    eventDate.setDate(currentWeekStart.getDate() + (event.dayOfWeek - 1));

    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const [endHour, endMinute] = event.endTime.split(':').map(Number);

    const startDateTime = new Date(eventDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(eventDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    return {
      id: event.id,
      title: event.title,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      backgroundColor: event.backgroundColor || categoryColors[event.category]?.bg || '#6b7280',
      textColor: event.textColor || categoryColors[event.category]?.text || '#ffffff',
      borderColor: 'transparent',
    };
  });
}

export function InteractiveCalendar({ events, onChange, compact = false }: InteractiveCalendarProps) {
  const [formData, setFormData] = useState<{
    title: string;
    category: typeof eventCategories[number];
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    location: string;
  }>({
    title: '',
    category: 'Other',
    daysOfWeek: [],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddEvent = () => {
    if (!formData.title.trim() || formData.daysOfWeek.length === 0) {
      return;
    }

    const colors = categoryColors[formData.category] || categoryColors.Other;

    // Create an event for each selected day
    const newEvents = formData.daysOfWeek.map(dayOfWeek => ({
      id: `${formData.category}-${dayOfWeek}-${Date.now()}-${Math.random()}`,
      title: formData.title,
      category: formData.category,
      dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location,
      backgroundColor: colors.bg,
      textColor: colors.text,
    }));

    onChange([...events, ...newEvents]);

    // Reset form
    setFormData({
      title: '',
      category: 'Other',
      daysOfWeek: [],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
    });
  };

  const handleEditEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setEditingId(eventId);
    setFormData({
      title: event.title,
      category: event.category,
      daysOfWeek: [event.dayOfWeek],
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || '',
    });
  };

  const handleUpdateEvent = () => {
    if (!editingId || !formData.title.trim() || formData.daysOfWeek.length === 0) {
      return;
    }

    const colors = categoryColors[formData.category] || categoryColors.Other;

    // Remove the old event
    const filteredEvents = events.filter(e => e.id !== editingId);

    // Add updated events for each selected day
    const updatedEvents = formData.daysOfWeek.map(dayOfWeek => ({
      id: `${formData.category}-${dayOfWeek}-${Date.now()}-${Math.random()}`,
      title: formData.title,
      category: formData.category,
      dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location,
      backgroundColor: colors.bg,
      textColor: colors.text,
    }));

    onChange([...filteredEvents, ...updatedEvents]);

    // Reset form and editing state
    setEditingId(null);
    setFormData({
      title: '',
      category: 'Other',
      daysOfWeek: [],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    onChange(events.filter(e => e.id !== eventId));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      title: '',
      category: 'Other',
      daysOfWeek: [],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
    });
  };

  const handleDayToggle = (day: number) => {
    setFormData({
      ...formData,
      daysOfWeek: formData.daysOfWeek.includes(day)
        ? formData.daysOfWeek.filter(d => d !== day)
        : [...formData.daysOfWeek, day].sort()
    });
  };

  const fullCalendarEvents = convertToFullCalendarEvents(events);

  // Group events by day for list view
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach(event => {
    if (!eventsByDay[event.dayOfWeek]) {
      eventsByDay[event.dayOfWeek] = [];
    }
    eventsByDay[event.dayOfWeek].push(event);
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Calendar View */}
      <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            backgroundColor: 'var(--background)',
            '--fc-border-color': 'var(--border)',
            '& .fc': {
              backgroundColor: 'var(--background)',
              fontSize: '12px',
            },
            '& .fc-theme-standard td, & .fc-theme-standard th': {
              borderColor: 'var(--border)',
              borderWidth: '1px',
            },
            '& .fc-col-header-cell-cushion': {
              textTransform: 'uppercase',
              fontWeight: 700,
              fontSize: '11px',
              color: 'var(--foreground)',
            },
            '& .fc-timegrid-axis-cushion': {
              fontWeight: 600,
              fontSize: '10px',
              color: 'var(--foreground)',
            },
            '& .fc-event': {
              border: 'none',
              borderRadius: 1,
              fontSize: '10px',
            },
          }}
        >
          <FullCalendar
            plugins={[timeGridPlugin]}
            initialView="timeGridWeek"
            allDaySlot={false}
            firstDay={1} // Monday
            hiddenDays={[0]} // Hide Sunday
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00"
            slotLabelFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short',
              hour12: true,
            }}
            headerToolbar={false}
            height="400px"
            events={fullCalendarEvents}
            eventContent={(arg) => (
              <div style={{ padding: '2px 4px', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, fontSize: '9px' }}>{arg.event.title}</div>
                <div style={{ fontSize: '8px', opacity: 0.9 }}>{arg.timeText}</div>
              </div>
            )}
          />
        </Box>
      </Paper>

      {/* Add/Edit Event Form */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          {editingId ? 'Edit Event' : 'Add New Event'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Event Title"
            fullWidth
            size="small"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Part-time Job, Club Meeting"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as typeof eventCategories[number] })}
              >
                {eventCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Location (Optional)"
              fullWidth
              size="small"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Library"
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}>
              Days of Week
            </Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.5 }}>
              {dayNames.map((day, index) => (
                <FormControlLabel
                  key={index + 1}
                  control={
                    <Checkbox
                      checked={formData.daysOfWeek.includes(index + 1)}
                      onChange={() => handleDayToggle(index + 1)}
                      size="small"
                    />
                  }
                  label={<Typography sx={{ fontSize: 13 }}>{day.slice(0, 3)}</Typography>}
                />
              ))}
            </FormGroup>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              fullWidth
              size="small"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="End Time"
              type="time"
              fullWidth
              size="small"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {editingId ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<Check size={16} />}
                  onClick={handleUpdateEvent}
                  disabled={!formData.title.trim() || formData.daysOfWeek.length === 0}
                  sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
                >
                  Update Event
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<X size={16} />}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={handleAddEvent}
                disabled={!formData.title.trim() || formData.daysOfWeek.length === 0}
                sx={{ bgcolor: '#06C96C', '&:hover': { bgcolor: '#059669' } }}
              >
                Add Event
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Event List */}
      <Paper elevation={0} sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Your Events ({events.length})
        </Typography>

        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events added yet. Add events above to see them here.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
              const dayEvents = eventsByDay[dayNum] || [];
              if (dayEvents.length === 0) return null;

              return (
                <Box key={dayNum}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    {dayNames[dayNum - 1]}
                  </Typography>
                  <Stack spacing={0.5}>
                    {dayEvents.map(event => (
                      <Card key={event.id} variant="outlined" sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip
                                  label={event.category}
                                  size="small"
                                  sx={{
                                    backgroundColor: event.backgroundColor,
                                    color: event.textColor,
                                    fontSize: '10px',
                                    height: '20px',
                                  }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {event.title}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {event.startTime} - {event.endTime}
                                {event.location && ` • ${event.location}`}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton size="small" onClick={() => handleEditEvent(event.id)} disabled={!!editingId}>
                                <Edit2 size={16} />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteEvent(event.id)} color="error" disabled={!!editingId}>
                                <Trash2 size={16} />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
