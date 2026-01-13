'use client';

import React from 'react';
import {
  Calendar,
  Briefcase,
  GraduationCap,
  Plane,
  FlaskConical,
  Users,
  Building,
  Coffee,
  BookOpen,
  Trophy,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { RedesignedEventCardProps, EventType } from './types';
import { getEventColor } from './designConstants';

/**
 * REDESIGNED EVENT CARD
 *
 * Visual Design:
 * - Clean card layout (rounded-2xl, p-6)
 * - Color-coded by event type
 * - Icon + title + description layout
 * - Edit/delete actions in corner
 * - Tinted background matching event type
 */

// Icon mapping for event types
const EVENT_ICONS: Record<EventType, React.ElementType> = {
  'internship': Briefcase,
  'major-application': BookOpen,
  'study-abroad': Plane,
  'research': FlaskConical,
  'teaching-assistant': Users,
  'co-op': Building,
  'sabbatical': Coffee,
  'grad-school': GraduationCap,
  'graduation': Trophy,
};

export function RedesignedEventCard({
  event,
  isEditMode = false,
  onEdit,
  onDelete,
}: RedesignedEventCardProps) {
  const eventColor = getEventColor(event.type);
  const IconComponent = EVENT_ICONS[event.type] || Calendar;

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl border-2 transition-all hover:shadow-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${eventColor} 10%, var(--background))`,
        borderColor: `color-mix(in srgb, ${eventColor} 30%, transparent)`,
      }}
    >
      {/* Icon - Compact */}
      <div
        className="flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 shadow-md"
        style={{ backgroundColor: eventColor }}
      >
        <IconComponent size={16} className="text-white" />
      </div>

      {/* Content - Compact */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-[var(--foreground)] mb-0.5">
          {event.title}
        </h4>
        <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
          {event.term}
        </p>
        {event.notes && (
          <p className="text-xs text-[var(--foreground)] opacity-80">
            {event.notes}
          </p>
        )}
      </div>

      {/* Actions (only in edit mode) - Compact */}
      {isEditMode && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-white/50 dark:hover:bg-zinc-700/50 transition-colors"
              aria-label="Edit event"
              type="button"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="Delete event"
              type="button"
            >
              <Trash2 size={12} className="text-red-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
