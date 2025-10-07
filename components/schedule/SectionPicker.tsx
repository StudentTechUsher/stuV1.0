'use client';

import React, { useState } from 'react';
import { SectionOption } from '@/types/schedule';
import { DayTimeChips } from './DayTimeChips';
import { cn } from '@/lib/utils';

interface SectionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionOption[];
  currentSectionId: string;
  onSelectSection: (sectionId: string) => Promise<void>;
  courseCode: string;
}

export function SectionPicker({
  isOpen,
  onClose,
  sections,
  currentSectionId,
  onSelectSection,
  courseCode,
}: SectionPickerProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [filterOnlyOpen, setFilterOnlyOpen] = useState(false);

  const handleSelectSection = async (section: SectionOption) => {
    if (section.sectionId === currentSectionId) {
      onClose();
      return;
    }

    // Don't allow selecting conflicting sections
    if (section.conflicts && section.conflicts.length > 0) {
      return;
    }

    setIsChanging(true);
    setSelectedSectionId(section.sectionId);

    try {
      await onSelectSection(section.sectionId);
      onClose();
    } catch (error) {
      console.error('Failed to change section:', error);
    } finally {
      setIsChanging(false);
      setSelectedSectionId(null);
    }
  };

  const filteredSections = filterOnlyOpen
    ? sections.filter(s => s.seats.open > 0)
    : sections;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-picker-title"
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'w-full max-w-4xl max-h-[80vh]',
          'bg-[var(--card)] text-[var(--card-foreground)]',
          'border border-[var(--border)]',
          'rounded-2xl shadow-[var(--shadow-lg)]',
          'animate-in fade-in-0 zoom-in-95',
          'overflow-hidden flex flex-col'
        )}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h2 id="section-picker-title" className="text-lg font-semibold">
              Choose Section for {courseCode}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Close section picker"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="mt-3 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filterOnlyOpen}
                onChange={(e) => setFilterOnlyOpen(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
              />
              <span>Only show open sections</span>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-[var(--muted)] sticky top-0 z-10">
              <tr className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                <th className="px-4 py-3 text-left">Section</th>
                <th className="px-4 py-3 text-left">Instructor</th>
                <th className="px-4 py-3 text-left">Schedule</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Conflicts</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                    No sections match your filters
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => {
                  const isCurrent = section.sectionId === currentSectionId;
                  const isSelecting = selectedSectionId === section.sectionId;
                  const hasConflicts = section.conflicts && section.conflicts.length > 0;
                  const isAvailable = section.seats.open > 0;

                  return (
                    <tr
                      key={section.sectionId}
                      className={cn(
                        'transition-colors',
                        isCurrent && 'bg-[var(--muted)]/50',
                        !isCurrent && 'hover:bg-[var(--muted)]/30'
                      )}
                    >
                      {/* Section */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{section.section}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-white text-xs">
                              Current
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium">{section.instructorName}</div>
                          {section.instructorRating != null && (
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {section.instructorRating.toFixed(1)}/5
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-3">
                        <DayTimeChips meeting={section.meeting} compact />
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--foreground)]">
                          {section.location.building}
                          {section.location.room && ` ${section.location.room}`}
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <span className={cn(
                            'font-medium',
                            isAvailable ? 'text-green-600' : 'text-red-600'
                          )}>
                            {section.seats.open}
                          </span>
                          <span className="text-[var(--muted-foreground)]">
                            {' '}/ {section.seats.capacity}
                          </span>
                          {section.seats.waitlist != null && section.seats.waitlist > 0 && (
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {section.seats.waitlist} waitlisted
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Conflicts */}
                      <td className="px-4 py-3">
                        {hasConflicts ? (
                          <span className="text-xs text-red-600 font-medium">
                            {section.conflicts!.length} conflict{section.conflicts!.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">None</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        {isCurrent ? (
                          <span className="text-xs text-[var(--muted-foreground)]">Selected</span>
                        ) : (
                          <button
                            onClick={() => handleSelectSection(section)}
                            disabled={isChanging || hasConflicts}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                              hasConflicts
                                ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
                                : 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90',
                              'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            {isSelecting ? 'Switching...' : hasConflicts ? 'Unavailable' : 'Select'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
