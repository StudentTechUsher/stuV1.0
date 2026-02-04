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

const EVENT_TYPE_ICONS: Record<EventType, typeof EventIcon> = {
  Internship: WorkIcon,
  'Major/Minor Application': EventIcon,
  'Religious Deferment (Mission)': EventIcon,
  'Study Abroad': FlightTakeoffIcon,
  'Research Project': ScienceIcon,
  'Teaching Assistant': SchoolIcon,
  'Co-op': BusinessCenterIcon,
  Sabbatical: SelfImprovementIcon,
  'Apply for Graduate School': SchoolIcon,
  'Apply for Graduation': SchoolIcon,
  Other: MoreHorizIcon,
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
  const EventIconComponent = EVENT_TYPE_ICONS[event.type] ?? EventIcon;
  const tintedBackground = `color-mix(in srgb, ${eventColor} 70%, white)`;
  const borderColor = `color-mix(in srgb, ${eventColor}, transparent)`;
  const glowShadow = `${eventColor}33`;
  const handleDelete = () => {
    if (!event.id) return;
    onDelete?.(event.id);
  };

  if (variant === 'grid') {
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center gap-2 rounded-[7px] border px-3 py-4 text-center shadow-[0_20px_40px_-24px_rgba(8,35,24,0.46)] transition-all duration-200 ease-out hover:-translate-y-1"
        style={{
          backgroundColor: tintedBackground,
          borderColor,
          boxShadow: `0 26px 52px -34px ${glowShadow}`,
        }}
      >
        <EventIconComponent
          sx={{ fontSize: 24 }}
          style={{ color: `color-mix(in srgb, ${eventColor} 92%, black 8%)` }}
        />
        <p className="font-body-semi text-xs font-semibold leading-tight tracking-tight" style={{ color: `color-mix(in srgb, var(--foreground) 95%, ${eventColor} 5%)` }}>
          {event.title}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: `color-mix(in srgb, var(--foreground) 75%, ${eventColor} 25%)` }}>
          {event.type}
        </p>
        {isEditMode && (
          <div className="absolute right-1 top-1 flex gap-0.5">
            <button
              type="button"
              onClick={() => onEdit?.(event)}
              className="flex h-5 w-5 items-center justify-center rounded-[4px] border transition focus-visible:outline-none focus-visible:ring-1"
              style={{
                borderColor: `color-mix(in srgb, ${eventColor} 40%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${eventColor} 15%, white)`,
                color: `color-mix(in srgb, ${eventColor} 85%, black 15%)`,
              }}
              aria-label={`Edit ${event.title}`}
            >
              <EditIcon sx={{ fontSize: 12 }} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-5 w-5 items-center justify-center rounded-[4px] border transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              style={{
                borderColor: 'color-mix(in srgb, #ef4444 50%, transparent)',
                backgroundColor: 'rgba(239,68,68,0.15)',
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
      className="group relative flex flex-wrap items-center justify-between gap-3 rounded-[7px] border px-4 py-2.5 text-sm text-[color-mix(in_srgb,var(--foreground)_90%,var(--primary)_10%)] transition-all duration-200 ease-out hover:-translate-y-1"
      style={{
        background: tintedBackground,
        borderColor,
        boxShadow: `0 32px 70px -54px ${glowShadow}`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[7px] border"
          style={{
            background: `color-mix(in srgb, ${eventColor} 25%, white)`,
            borderColor: `color-mix(in srgb, ${eventColor} 50%, transparent)`,
          }}
        >
          <EventIconComponent
            sx={{ fontSize: 18 }}
            style={{ color: `color-mix(in srgb, ${eventColor} 85%, black 15%)` }}
          />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className="font-body-semi text-sm font-semibold leading-tight tracking-tight"
            style={{ color: `color-mix(in srgb, var(--foreground) 92%, ${eventColor} 8%)` }}
          >
            {event.title}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.20em]"
            style={{ color: `color-mix(in srgb, var(--foreground) 68%, ${eventColor} 32%)` }}
          >
            {event.type}
          </span>
        </div>
      </div>

      {isEditMode && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(event)}
            className="flex h-8 items-center gap-1 rounded-[7px] border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            style={{
              color: `color-mix(in srgb, var(--foreground) 78%, ${eventColor} 22%)`,
              borderColor: `color-mix(in srgb, ${eventColor} 42%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${eventColor} 10%, transparent)`,
            }}
            aria-label={`Edit ${event.title}`}
          >
            <EditIcon sx={{ fontSize: 16 }} />
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-8 items-center gap-1 rounded-[7px] border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--destructive)]"
            style={{
              color: `color-mix(in srgb, #7f1d1d 75%, ${eventColor} 25%)`,
              borderColor: `color-mix(in srgb, #ef4444 60%, ${eventColor} 40%)`,
              backgroundColor: 'rgba(239,68,68,0.12)',
            }}
            aria-label={`Delete ${event.title}`}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
