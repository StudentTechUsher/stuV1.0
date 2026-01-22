'use client';

import React from 'react';
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
    case 'Apply for Graduate School':
      return SchoolIcon;
    case 'Apply for Graduation':
      return SchoolIcon;
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

export function EventCard({
  event,
  isEditMode,
  variant = 'bar',
  onEdit,
  onDelete,
}: Readonly<EventCardProps>) {
  const eventColor = getEventColor(event.type);
  const EventIconComponent = getEventIcon(event.type);
  const tintedBackground = `color-mix(in srgb, ${eventColor} 70%, white)`;
  const borderColor = `color-mix(in srgb, ${eventColor}, transparent)`;
  const handleDelete = () => {
    if (!event.id) return;
    onDelete?.(event.id);
  };

  if (variant === 'grid') {
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
        style={{
          backgroundColor: tintedBackground,
          borderColor,
        }}
      >
        <EventIconComponent
          sx={{ fontSize: 24 }}
          style={{ color: `color-mix(in srgb, ${eventColor} 92%, black 8%)` }}
        />
        <p className="font-body-semi text-xs font-bold leading-tight tracking-tight text-[var(--foreground)]">
          {event.title}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
          {event.type}
        </p>
        {isEditMode && (
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => onEdit?.(event)}
              className="flex h-6 w-6 items-center justify-center rounded-full border transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-1"
              style={{
                borderColor: `color-mix(in srgb, ${eventColor} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${eventColor} 12%, white)`,
                color: `color-mix(in srgb, ${eventColor} 85%, black 15%)`,
              }}
              aria-label={`Edit ${event.title}`}
            >
              <EditIcon sx={{ fontSize: 12 }} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-6 w-6 items-center justify-center rounded-full border transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              style={{
                borderColor: 'color-mix(in srgb, #ef4444 30%, transparent)',
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#b91c1c',
              }}
              aria-label={`Delete ${event.title}`}
            >
              <DeleteIcon sx={{ fontSize: 12 }} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="group relative flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: tintedBackground,
        borderColor,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full border"
          style={{
            background: `color-mix(in srgb, ${eventColor} 20%, white)`,
            borderColor: `color-mix(in srgb, ${eventColor} 30%, transparent)`,
          }}
        >
          <EventIconComponent
            sx={{ fontSize: 18 }}
            style={{ color: `color-mix(in srgb, ${eventColor} 85%, black 15%)` }}
          />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-body-semi text-sm font-bold leading-tight tracking-tight text-[var(--foreground)]">
            {event.title}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            {event.type}
          </span>
        </div>
      </div>

      {isEditMode && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(event)}
            className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wider transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            style={{
              color: 'var(--foreground)',
              borderColor: `color-mix(in srgb, ${eventColor} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${eventColor} 8%, transparent)`,
            }}
            aria-label={`Edit ${event.title}`}
          >
            <EditIcon sx={{ fontSize: 14 }} />
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wider transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--destructive)]"
            style={{
              color: '#b91c1c',
              borderColor: 'color-mix(in srgb, #ef4444 25%, transparent)',
              backgroundColor: 'rgba(239,68,68,0.08)',
            }}
            aria-label={`Delete ${event.title}`}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
