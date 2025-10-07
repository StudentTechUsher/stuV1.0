'use client';

import React, { useState } from 'react';
import { InstructorOption } from '@/types/schedule';
import { DayTimeChips } from './DayTimeChips';
import { cn } from '@/lib/utils';

interface InstructorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  instructors: InstructorOption[];
  currentInstructorId: string;
  onSelectInstructor: (sectionId: string) => Promise<void>;
  courseCode: string;
  anchorEl?: HTMLElement | null;
}

export function InstructorPicker({
  isOpen,
  onClose,
  instructors,
  currentInstructorId,
  onSelectInstructor,
  courseCode,
  anchorEl,
}: InstructorPickerProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorEl]);

  React.useEffect(() => {
    if (isOpen && popoverRef.current && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const popover = popoverRef.current;

      const top = rect.bottom + 8;
      const left = rect.left;

      // Ensure popover stays within viewport
      const maxLeft = window.innerWidth - popover.offsetWidth - 8;
      const maxTop = window.innerHeight - popover.offsetHeight - 8;

      popover.style.top = `${Math.min(top, maxTop)}px`;
      popover.style.left = `${Math.min(left, maxLeft)}px`;
    }
  }, [isOpen, anchorEl]);

  const handleSelectInstructor = async (instructor: InstructorOption) => {
    if (instructor.instructorId === currentInstructorId) {
      onClose();
      return;
    }

    setIsChanging(true);
    setSelectedInstructorId(instructor.instructorId);

    try {
      await onSelectInstructor(instructor.sectionId);
      onClose();
    } catch (error) {
      console.error('Failed to change instructor:', error);
    } finally {
      setIsChanging(false);
      setSelectedInstructorId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructor-picker-title"
      className={cn(
        'fixed z-50',
        'bg-[var(--popover)] text-[var(--popover-foreground)]',
        'border border-[var(--border)]',
        'rounded-lg shadow-[var(--shadow-lg)]',
        'animate-in fade-in-0 zoom-in-95',
        'w-96 max-h-[400px] overflow-auto'
      )}
    >
      <div className="p-4">
        <h3 id="instructor-picker-title" className="text-sm font-semibold mb-3">
          Choose Instructor for {courseCode}
        </h3>

        <div className="space-y-2">
          {instructors.map((instructor) => {
            const isCurrent = instructor.instructorId === currentInstructorId;
            const isSelecting = selectedInstructorId === instructor.instructorId;

            return (
              <button
                key={instructor.instructorId}
                onClick={() => handleSelectInstructor(instructor)}
                disabled={isChanging}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  'border border-[var(--border)]',
                  isCurrent && 'bg-[var(--muted)] border-[var(--primary)]',
                  !isCurrent && 'hover:bg-[var(--muted)]/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Instructor Name */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {instructor.instructorName}
                      </span>
                      {instructor.instructorRating != null && (
                        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                          {instructor.instructorRating.toFixed(1)}/5
                        </span>
                      )}
                    </div>

                    {/* Section */}
                    <div className="text-xs text-[var(--muted-foreground)] mb-2">
                      Section {instructor.section}
                    </div>

                    {/* Schedule */}
                    <DayTimeChips meeting={instructor.meeting} compact />
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCurrent ? (
                      <span className="px-2 py-1 rounded-full bg-[var(--primary)] text-white text-xs font-medium whitespace-nowrap">
                        Current
                      </span>
                    ) : isSelecting ? (
                      <span className="px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] text-xs font-medium whitespace-nowrap">
                        Switching...
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
