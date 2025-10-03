'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import WorkIcon from '@mui/icons-material/Work';

interface Event {
  id: string;
  type: 'Major/Minor Application' | 'Internship';
  title: string;
  afterTerm: number;
}

interface EventCardProps {
  event: Event;
  isEditMode: boolean;
  variant?: 'grid' | 'bar';
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
}

export function EventCard({
  event,
  isEditMode,
  variant = 'bar',
  onEdit,
  onDelete,
}: EventCardProps) {
  const eventColor = event.type === 'Internship' ? '#9C27B0' : '#ff9800';
  const EventIconComponent = event.type === 'Internship' ? WorkIcon : EventIcon;

  if (variant === 'grid') {
    return (
      <Box
        sx={{
          p: 1.5,
          backgroundColor: eventColor,
          color: 'white',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minHeight: '150px',
          position: 'relative',
        }}
      >
        <EventIconComponent sx={{ fontSize: 32, mb: 1 }} />
        <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'center', mb: 0.5 }}>
          {event.title}
        </Typography>
        <Typography variant="caption" className="font-body" sx={{ opacity: 0.9, fontSize: '0.65rem', textAlign: 'center' }}>
          {event.type}
        </Typography>
        {isEditMode && (
          <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
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

  return (
    <Box
      sx={{
        p: 1.5,
        py: 1,
        backgroundColor: eventColor,
        color: 'white',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        mb: 2,
        minHeight: '60px',
        maxHeight: '60px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <EventIconComponent sx={{ fontSize: 24 }} />
        <Box>
          <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {event.title}
          </Typography>
          <Typography variant="caption" className="font-body" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
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
