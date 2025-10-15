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
  onEditEvent: (event?: Event) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function DetailView({
  currentPlanData,
  events,
  isEditMode,
  modifiedTerms,
  movedCourses,
  onMoveCourse,
  onEditEvent,
  onDeleteEvent
}: Readonly<DetailViewProps>) {
  const renderEventsAfterTerm = (termNumber: number, termEvents: Event[]) => {
    if (termEvents.length === 0) {
      return null;
    }

    return (
      <div
        key={`events-after-${termNumber}`}
        className="relative w-full rounded-[28px] border border-[color-mix(in_srgb,var(--muted)_38%,transparent)] bg-[color-mix(in_srgb,var(--muted)_22%,transparent)] px-6 py-5 shadow-[0_36px_80px_-58px_rgba(8,35,24,0.45)]"
      >
        <div className="absolute left-8 top-0 h-6 w-px -translate-y-3 bg-[color-mix(in_srgb,var(--muted-foreground)_36%,var(--border)_64%)]" aria-hidden="true" />
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
              After Term {termNumber}
            </span>
            {isEditMode && (
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--muted-foreground)_62%,var(--foreground)_38%)]">
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
    <div className="flex flex-col gap-10">
      {currentPlanData.reduce<React.ReactNode[]>((acc, term, index) => {
        const termNumber = index + 1;
        const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);

        // Render term card
        const termCard = (
          <div key={`term-wrapper-${index}`} className="min-h-full">
            <TermCard
              term={term}
              termIndex={index}
              isEditMode={isEditMode}
              currentPlanData={currentPlanData}
              modifiedTerms={modifiedTerms}
              movedCourses={movedCourses}
              onMoveCourse={onMoveCourse}
            />
          </div>
        );

        // Group terms in pairs (2 columns)
        if (index % 2 === 0) {
          // Start of a new row
          const nextTerm = currentPlanData[index + 1];
          const nextTermNumber = index + 2;
          const nextEventsAfterTerm = nextTerm ? events.filter(e => e.afterTerm === nextTermNumber) : [];

          const nextTermCard = nextTerm ? (
            <div key={`term-wrapper-${index + 1}`} className="min-h-full">
              <TermCard
                term={nextTerm}
                termIndex={index + 1}
                isEditMode={isEditMode}
                currentPlanData={currentPlanData}
                modifiedTerms={modifiedTerms}
                movedCourses={movedCourses}
                onMoveCourse={onMoveCourse}
              />
            </div>
          ) : null;

          // Add row with 2 terms
          acc.push(
            <div
              key={`row-${index}`}
              className="grid w-full grid-cols-1 items-stretch gap-6 xl:grid-cols-2"
            >
              {termCard}
              {nextTermCard}
            </div>
          );

          const firstTermEvents = renderEventsAfterTerm(termNumber, eventsAfterThisTerm);
          const secondTermEvents =
            nextTerm && nextEventsAfterTerm.length > 0
              ? renderEventsAfterTerm(nextTermNumber, nextEventsAfterTerm)
              : null;

          if (firstTermEvents) acc.push(firstTermEvents);
          if (secondTermEvents) acc.push(secondTermEvents);
        }
        // Skip odd indices as they're handled in the even index case

        return acc;
      }, [])}
    </div>
  );
}
