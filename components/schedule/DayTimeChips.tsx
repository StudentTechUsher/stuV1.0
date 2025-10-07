'use client';

import React from 'react';
import { DayOfWeek, Meeting } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface DayTimeChipsProps {
  meeting: Meeting;
  className?: string;
  compact?: boolean;
}

const dayAbbreviations: Record<DayOfWeek, string> = {
  M: 'M',
  Tu: 'Tu',
  W: 'W',
  Th: 'Th',
  F: 'F',
};

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const isPM = hour >= 12;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes}${isPM ? 'pm' : 'am'}`;
}

function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function DayTimeChips({ meeting, className, compact = false }: DayTimeChipsProps) {
  const daysString = meeting.days.map(day => dayAbbreviations[day]).join('');
  const timeRange = formatTimeRange(meeting.start, meeting.end);

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        <span className="text-xs font-medium text-[var(--foreground)]">
          {daysString}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {timeRange}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {meeting.days.map((day) => (
        <span
          key={day}
          className={cn(
            'inline-flex items-center justify-center',
            'w-6 h-6 rounded',
            'text-xs font-medium',
            'bg-[var(--muted)] text-[var(--foreground)]',
            'border border-[var(--border)]'
          )}
          aria-label={`${day === 'M' ? 'Monday' : day === 'Tu' ? 'Tuesday' : day === 'W' ? 'Wednesday' : day === 'Th' ? 'Thursday' : 'Friday'}`}
        >
          {dayAbbreviations[day]}
        </span>
      ))}
      <span
        className={cn(
          'inline-flex items-center',
          'px-2 py-1 rounded',
          'text-xs font-medium',
          'bg-[var(--muted)] text-[var(--foreground)]',
          'border border-[var(--border)]',
          'whitespace-nowrap'
        )}
        aria-label={`Class time ${timeRange}`}
      >
        {timeRange}
      </span>
    </div>
  );
}
