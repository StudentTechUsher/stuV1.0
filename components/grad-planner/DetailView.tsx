import React from 'react';
import { Term, Event } from './types';
import { TermCard } from './TermCard';
import { EventCard } from './EventCard';

interface DetailViewProps {
  currentPlanData: Term[];
  events: Event[];
  isEditMode: boolean;
  modifiedTerms: Set<number>;
  movedCourses: Set<string>;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
  onDeleteTerm?: (termIndex: number) => void;
  onEditEvent: (event?: Event) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddCourse?: (termIndex: number) => void;
  onSubstituteCourse?: (termIndex: number, courseIndex: number) => void;
  gradPlanId?: string;
}

export function DetailView({
  currentPlanData,
  events,
  isEditMode,
  modifiedTerms,
  movedCourses,
  onMoveCourse,
  onDeleteTerm,
  onEditEvent,
  onDeleteEvent,
  onAddCourse,
  onSubstituteCourse,
  gradPlanId
}: Readonly<DetailViewProps>) {
  // Sort terms to show "Transfer Credits" first
  const sortedTermsWithIndices = React.useMemo(() => {
    return currentPlanData
      .map((term, originalIndex) => ({ term, originalIndex }))
      .sort((a, b) => {
        const aIsTransfer = a.term.term.toLowerCase().includes('transfer');
        const bIsTransfer = b.term.term.toLowerCase().includes('transfer');

        if (aIsTransfer && !bIsTransfer) return -1;
        if (!aIsTransfer && bIsTransfer) return 1;
        return 0; // Keep original order for non-transfer terms
      });
  }, [currentPlanData]);

  const renderEventsAfterTerm = (termNumber: number, termEvents: Event[]) => {
    if (termEvents.length === 0) {
      return null;
    }

    return (
      <div
        key={`events-after-${termNumber}`}
        className="relative w-full rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--muted)] px-6 py-5 shadow-sm"
      >
        <div className="absolute left-8 top-0 h-6 w-px -translate-y-3 bg-[var(--muted-foreground)]" style={{ opacity: 0.2 }} aria-hidden="true" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--muted-foreground)]">
              After Term {termNumber}
            </span>
            {isEditMode && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {termEvents.length} milestone{termEvents.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {termEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isEditMode={isEditMode}
                variant="bar"
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {sortedTermsWithIndices.map(({ term, originalIndex }) => {
        const termNumber = originalIndex + 1;
        const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);

        return (
          <React.Fragment key={`term-section-${originalIndex}`}>
            {/* Term Card - Full Width */}
            <div className="w-full">
              <TermCard
                term={term}
                termIndex={originalIndex}
                isEditMode={isEditMode}
                currentPlanData={currentPlanData}
                modifiedTerms={modifiedTerms}
                movedCourses={movedCourses}
                onMoveCourse={onMoveCourse}
                onDeleteTerm={onDeleteTerm}
                onAddCourse={onAddCourse}
                onSubstituteCourse={onSubstituteCourse}
                gradPlanId={gradPlanId}
              />
            </div>

            {/* Events/Milestones after this term */}
            {eventsAfterThisTerm.length > 0 && renderEventsAfterTerm(termNumber, eventsAfterThisTerm)}
          </React.Fragment>
        );
      })}
    </div>
  );
}
