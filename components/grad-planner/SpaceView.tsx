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

  return (
    <div className="flex flex-col gap-4">
      {currentPlanData.map((term, index) => {
        const termNumber = index + 1;

        // Get events that should appear after this specific term
        const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);

        return (
          <div key={`term-${index}`} className="flex flex-col gap-3">
            {/* Term Card - Full Width */}
            <div className="w-full transition-all duration-250 ease-in-out">
              <SpaceViewTermCard term={term} index={index} />
            </div>

            {/* Events after this term - Horizontal row below the term */}
            {eventsAfterThisTerm.length > 0 && (
              <div className="flex flex-wrap gap-3 pl-8">
                {eventsAfterThisTerm.map((event) => (
                  <div
                    key={`event-${event.id}`}
                    className="shrink-0 transition-all duration-250 ease-in-out"
                    style={{
                      width: '240px',
                      minWidth: '240px',
                      maxWidth: '240px',
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
