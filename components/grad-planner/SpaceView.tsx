import React from 'react';
import Box from '@mui/material/Box';
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
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 2,
      '@media (max-width: 1200px)': {
        gridTemplateColumns: 'repeat(3, 1fr)'
      },
      '@media (max-width: 900px)': {
        gridTemplateColumns: 'repeat(2, 1fr)'
      }
    }}>
      {currentPlanData.reduce<React.ReactNode[]>((acc, term, index) => {
        const termNumber = index + 1;
        const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);

        // Add term card
        acc.push(
          <SpaceViewTermCard
            key={`term-${index}`}
            term={term}
            index={index}
          />
        );

        // Add events after this term (as individual grid items)
        if (eventsAfterThisTerm.length > 0) {
          eventsAfterThisTerm.forEach((event) => {
            acc.push(
              <EventCard
                key={event.id}
                event={event}
                isEditMode={isEditMode}
                variant="grid"
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            );
          });
        }

        return acc;
      }, [])}
    </Box>
  );
}
