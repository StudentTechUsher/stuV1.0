import React from 'react';
import { Term, Event } from './types';
import { SpaceViewTermCard } from './SpaceViewTermCard';
import { EventCard } from './EventCard';

interface SpaceViewProps {
  currentPlanData: Term[];
  events: Event[];
  isEditMode: boolean;
  onEditEvent: (event?: Event) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function SpaceView({
  currentPlanData,
  events,
  isEditMode,
  onEditEvent,
  onDeleteEvent
}: SpaceViewProps) {
  console.log('SpaceView - Total events:', events.length, events);

  // Group terms into rows of 4
  const termsPerRow = 4;
  const rows: React.ReactNode[] = [];

  for (let i = 0; i < currentPlanData.length; i += termsPerRow) {
    const rowTerms = currentPlanData.slice(i, i + termsPerRow);
    const rowStartIndex = i;

    rows.push(
      <div
        key={`row-${i}`}
        className="flex items-start gap-4 w-full transition-all duration-300 ease-in-out"
      >
        {rowTerms.map((term, indexInRow) => {
          const globalIndex = rowStartIndex + indexInRow;
          const termNumber = globalIndex + 1;

          // Get events that should appear after this specific term
          const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);

          return (
            <React.Fragment key={`term-group-${globalIndex}`}>
              {/* Term Card */}
              <div
                className="flex-1 min-w-0 transition-all duration-250 ease-in-out"
                style={{ flex: '1 1 0' }}
              >
                <SpaceViewTermCard term={term} index={globalIndex} />
              </div>

              {/* Events after this term (inline in the same row) */}
              {eventsAfterThisTerm.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className="shrink-0 transition-all duration-250 ease-in-out"
                  style={{
                    width: '140px',
                    minWidth: '140px',
                    maxWidth: '140px',
                  }}
                >
                  <EventCard
                    event={event}
                    isEditMode={isEditMode}
                    variant="grid"
                    onEdit={onEditEvent}
                    onDelete={onDeleteEvent}
                  />
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows}
    </div>
  );
}
