'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
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

interface EventCardProps {
  event: Event;
  isEditMode: boolean;
  variant?: 'grid' | 'bar';
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
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

export function EventCard({
  event,
  isEditMode,
  variant = 'bar',
  onEdit,
  onDelete,
}: Readonly<EventCardProps>) {
  const eventColor = getEventColor(event.type);
  const EventIconComponent = getEventIcon(event.type);

  if (variant === 'grid') {
    return (
      <Box
        sx={{
          p: 1.5,
          backgroundColor: eventColor,
          color: 'white',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
          minHeight: '120px',
          height: '100%',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        }}
      >
        <EventIconComponent sx={{ fontSize: 28, mb: 0.75 }} />
        <Typography
          variant="body2"
          className="font-body-semi"
          sx={{
            fontWeight: 600,
            fontSize: '0.8rem',
            textAlign: 'center',
            mb: 0.25,
            lineHeight: 1.2,
            px: 0.5,
          }}
        >
          {event.title}
        </Typography>
        <Typography
          variant="caption"
          className="font-body"
          sx={{
            opacity: 0.85,
            fontSize: '0.625rem',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {event.type}
        </Typography>
        {isEditMode && (
          <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.25 }}>
            <IconButton
              size="small"
              onClick={() => onEdit?.(event)}
              sx={{
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                p: 0.25,
                minWidth: 0,
                width: 24,
                height: 24,
              }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onDelete?.(event.id)}
              sx={{
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                p: 0.25,
                minWidth: 0,
                width: 24,
                height: 24,
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        py: 1.5,
        backgroundColor: eventColor,
        color: 'white',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        mb: 2,
        minHeight: '70px',
        position: 'relative',
        border: '2px solid rgba(255,255,255,0.3)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          left: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '4px',
          height: '60%',
          backgroundColor: 'rgba(255,255,255,0.4)',
          borderRadius: '2px',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: 1 }}>
        <EventIconComponent sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.3 }}>
            {event.title}
          </Typography>
          <Typography variant="caption" className="font-body" sx={{ opacity: 0.9, fontSize: '0.75rem', mt: 0.25, display: 'block' }}>
            {event.type}
          </Typography>
        </Box>
      </Box>
      {isEditMode && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onEdit?.(event)}
            sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }, p: 0.5 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete?.(event.id)}
            sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }, p: 0.5 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
