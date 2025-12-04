'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import WorkIcon from '@mui/icons-material/Work';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScienceIcon from '@mui/icons-material/Science';
import SchoolIcon from '@mui/icons-material/School';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import GradSchoolIcon from '@mui/icons-material/School';
import { Event, EventType } from './types';

interface EventManagerProps {
  events: Event[];
  isEditMode: boolean;
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  maxTermNumber: number;
}

const getEventIcon = (type: EventType) => {
  switch (type) {
    case 'Internship':
      return WorkIcon;
    case 'Major/Minor Application':
      return EventIcon;
    case 'Study Abroad':
      return FlightTakeoffIcon;
    case 'Research Project':
      return ScienceIcon;
    case 'Teaching Assistant':
      return SchoolIcon;
    case 'Co-op':
      return BusinessCenterIcon;
    case 'Sabbatical':
      return SelfImprovementIcon;
    case 'Apply for Graduate School':
      return GradSchoolIcon;
    case 'Apply for Graduation':
      return GradSchoolIcon;
    case 'Other':
      return MoreHorizIcon;
    default:
      return EventIcon;
  }
};

const getEventColor = (type: EventType): string => {
  switch (type) {
    case 'Internship':
      return '#9C27B0';
    case 'Major/Minor Application':
      return '#ff9800';
    case 'Study Abroad':
      return '#2196F3';
    case 'Research Project':
      return '#4CAF50';
    case 'Teaching Assistant':
      return '#F44336';
    case 'Co-op':
      return '#795548';
    case 'Sabbatical':
      return '#00BCD4';
    case 'Apply for Graduate School':
      return '#673AB7';
    case 'Apply for Graduation':
      return '#1976D2';
    case 'Other':
      return '#607D8B';
    default:
      return '#9E9E9E';
  }
};

export function EventManager({
  events,
  isEditMode,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  maxTermNumber,
}: EventManagerProps) {
  const eventsByTerm = React.useMemo(() => {
    const grouped: Record<number, Event[]> = {};
    events.forEach((event) => {
      if (!grouped[event.afterTerm]) {
        grouped[event.afterTerm] = [];
      }
      grouped[event.afterTerm].push(event);
    });
    return grouped;
  }, [events]);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 24,
        maxHeight: { xs: 'none', lg: 'calc(100vh - 48px)' },
        overflowY: 'auto',
      }}
    >
      <Box
        sx={{
          borderRadius: '7px',
          border: '1px solid',
          borderColor: 'color-mix(in srgb, rgba(10,31,26,0.14) 32%, var(--border) 68%)',
          backgroundColor: '#ffffff',
          boxShadow: '0 38px 100px -76px rgba(10,31,26,0.45)',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Red Hat Display", sans-serif',
              fontWeight: 700,
              color: '#0a1f1a',
              letterSpacing: '0.04em',
            }}
          >
            Events
          </Typography>
          {isEditMode && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddEvent}
              sx={{
                backgroundColor: '#0a1f1a',
                color: '#ffffff',
                fontWeight: 600,
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.75rem',
                px: 2,
                borderRadius: '7px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#043322',
                },
              }}
            >
              Add Event
            </Button>
          )}
        </Box>

        {events.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              color: 'color-mix(in srgb, var(--muted-foreground) 75%, var(--foreground) 25%)',
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif', fontWeight: 500 }}>
              No events added yet.
            </Typography>
            {isEditMode && (
              <Typography variant="caption" sx={{ fontFamily: '"Inter", sans-serif', mt: 1, display: 'block' }}>
                Click “Add Event” to create your first milestone.
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: maxTermNumber }, (_, i) => i + 1).map((termNumber) => {
              const termEvents = eventsByTerm[termNumber] || [];
              if (termEvents.length === 0) return null;

              return (
                <Box key={termNumber}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 600,
                      color: 'color-mix(in srgb, var(--muted-foreground) 78%, var(--foreground) 22%)',
                      textTransform: 'uppercase',
                      fontSize: '0.65rem',
                      letterSpacing: '0.18em',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    After Term {termNumber}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {termEvents.map((event) => {
                      const IconComponent = getEventIcon(event.type);
                      const eventColor = getEventColor(event.type);

                      return (
                        <Box
                          key={event.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: '7px',
                            border: '1px solid color-mix(in srgb, rgba(10,31,26,0.12) 40%, transparent)',
                            backgroundColor: `color-mix(in srgb, ${eventColor} 12%, white 88%)`,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                height: 32,
                                width: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                backgroundColor: `color-mix(in srgb, ${eventColor} 20%, white 80%)`,
                                color: `color-mix(in srgb, ${eventColor} 70%, black 30%)`,
                              }}
                            >
                              <IconComponent fontSize="small" />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: '"Inter", sans-serif',
                                  fontWeight: 600,
                                  color: '#0a1f1a',
                                  lineHeight: 1.4,
                                }}
                              >
                                {event.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"Inter", sans-serif',
                                  color: 'color-mix(in srgb, var(--muted-foreground) 72%, var(--foreground) 28%)',
                                }}
                              >
                                {event.type}
                              </Typography>
                            </Box>
                          </Box>

                          {isEditMode && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => onEditEvent(event)}
                                sx={{
                                  color: '#0a1f1a',
                                  '&:hover': { backgroundColor: 'rgba(10,31,26,0.08)' },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  if (!event.id) return;
                                  onDeleteEvent(event.id);
                                }}
                                sx={{
                                  color: 'var(--action-cancel)',
                                  '&:hover': { backgroundColor: 'rgba(244,67,54,0.12)' },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
