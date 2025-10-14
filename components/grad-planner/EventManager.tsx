'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
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
import { Event, EventType } from './types';

interface EventManagerProps {
  events: Event[];
  isEditMode: boolean;
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  maxTermNumber: number;
}

// Helper function to get icon for event type
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
    case 'Other':
      return MoreHorizIcon;
    default:
      return EventIcon;
  }
};

// Helper function to get color for event type
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
  // Group events by term
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
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: 3,
          backgroundColor: 'var(--card)',
          borderRadius: 3,
          border: '1px solid var(--border)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Red Hat Display", sans-serif',
              fontWeight: 700,
              color: 'black',
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
                backgroundColor: 'var(--primary)',
                color: 'white',
                fontWeight: 600,
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.75rem',
                px: 2,
                '&:hover': {
                  backgroundColor: 'var(--hover-green)',
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
              color: 'var(--muted-foreground)',
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: '"Inter", sans-serif' }}>
              No events added yet.
            </Typography>
            {isEditMode && (
              <Typography variant="caption" sx={{ fontFamily: '"Inter", sans-serif', mt: 1, display: 'block' }}>
                Click &quot;Add Event&quot; to create your first event.
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Render events grouped by term */}
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
                      color: 'var(--muted-foreground)',
                      textTransform: 'uppercase',
                      fontSize: '0.65rem',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    After Term {termNumber}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {termEvents.map((event) => {
                      const IconComponent = getEventIcon(event.type);
                      const color = getEventColor(event.type);

                      return (
                        <Paper
                          key={event.id}
                          elevation={1}
                          sx={{
                            p: 1.5,
                            backgroundColor: color,
                            color: 'white',
                            borderRadius: 2,
                            position: 'relative',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <IconComponent sx={{ fontSize: 20, mt: 0.25 }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: '"Inter", sans-serif',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  lineHeight: 1.3,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {event.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: '"Inter", sans-serif',
                                  fontSize: '0.7rem',
                                  opacity: 0.9,
                                  display: 'block',
                                  mt: 0.25,
                                }}
                              >
                                {event.type}
                              </Typography>
                            </Box>
                            {isEditMode && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => onEditEvent(event)}
                                  sx={{
                                    color: 'white',
                                    p: 0.5,
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => onDeleteEvent(event.id)}
                                  sx={{
                                    color: 'white',
                                    p: 0.5,
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
