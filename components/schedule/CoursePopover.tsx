'use client';

import React from 'react';
import { CourseRow } from '@/types/schedule';
import { cn } from '@/lib/utils';

interface CoursePopoverProps {
  course: CourseRow;
  className?: string;
}

export function CoursePopover({ course, className }: CoursePopoverProps) {
  const hasSeatsInfo = course.seats != null;
  const hasPrereqs = course.prereqs && course.prereqs.length > 0;
  const hasAttributes = course.attributes && course.attributes.length > 0;

  return (
    <div
      className={cn(
        'p-4 max-w-sm',
        'bg-[var(--popover)] text-[var(--popover-foreground)]',
        className
      )}
      role="tooltip"
    >
      {/* Course Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm mb-1">
          {course.code}: {course.title}
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          Section {course.section} • {course.credits} credit{course.credits !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Description */}
      {course.description && (
        <div className="mb-3">
          <p className="text-xs text-[var(--foreground)] leading-relaxed">
            {course.description}
          </p>
        </div>
      )}

      {/* Quick Facts */}
      <div className="space-y-2 border-t border-[var(--border)] pt-3">
        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Quick Facts
        </h4>

        {/* Prerequisites */}
        {hasPrereqs && (
          <div className="text-xs">
            <span className="font-medium text-[var(--foreground)]">Prerequisites:</span>{' '}
            <span className="text-[var(--muted-foreground)]">
              {course.prereqs!.join(', ')}
            </span>
          </div>
        )}

        {/* Seats */}
        {hasSeatsInfo && (
          <div className="text-xs">
            <span className="font-medium text-[var(--foreground)]">Seats:</span>{' '}
            <span className={cn(
              'font-medium',
              course.seats!.open > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {course.seats!.open} open
            </span>
            <span className="text-[var(--muted-foreground)]">
              {' '}/ {course.seats!.capacity} total
            </span>
            {course.seats!.waitlist != null && course.seats!.waitlist > 0 && (
              <span className="text-[var(--muted-foreground)]">
                {' '}({course.seats!.waitlist} waitlisted)
              </span>
            )}
          </div>
        )}

        {/* Attributes */}
        {hasAttributes && (
          <div className="text-xs">
            <span className="font-medium text-[var(--foreground)]">Attributes:</span>{' '}
            <span className="text-[var(--muted-foreground)]">
              {course.attributes!.join(', ')}
            </span>
          </div>
        )}

        {/* Instructor */}
        <div className="text-xs">
          <span className="font-medium text-[var(--foreground)]">Instructor:</span>{' '}
          <span className="text-[var(--muted-foreground)]">
            {course.instructorName}
            {course.instructorRating != null && (
              <span className="ml-1">
                ({course.instructorRating.toFixed(1)}/5)
              </span>
            )}
          </span>
        </div>

        {/* Difficulty */}
        {course.difficulty != null && (
          <div className="text-xs">
            <span className="font-medium text-[var(--foreground)]">Difficulty:</span>{' '}
            <span className="text-[var(--muted-foreground)]">
              {course.difficulty.toFixed(1)}/5
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
