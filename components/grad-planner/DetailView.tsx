import React from 'react';
import Box from '@mui/material/Box';
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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {currentPlanData.reduce<React.ReactNode[]>((acc, term, index) => {
        const termNumber = index + 1;
        const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);

        // Render term card
        const termCard = (
          <Box key={`term-wrapper-${index}`} sx={{ flex: '1 1 48%' }}>
            <TermCard
              term={term}
              termIndex={index}
              isEditMode={isEditMode}
              currentPlanData={currentPlanData}
              modifiedTerms={modifiedTerms}
              movedCourses={movedCourses}
              onMoveCourse={onMoveCourse}
            />
          </Box>
        );

        // Group terms in pairs (2 columns)
        if (index % 2 === 0) {
          // Start of a new row
          const nextTerm = currentPlanData[index + 1];
          const nextTermNumber = index + 2;
          const nextEventsAfterTerm = nextTerm ? events.filter(e => e.afterTerm === nextTermNumber) : [];

          const nextTermCard = nextTerm ? (
            <Box key={`term-wrapper-${index + 1}`} sx={{ flex: '1 1 48%' }}>
              <TermCard
                term={nextTerm}
                termIndex={index + 1}
                isEditMode={isEditMode}
                currentPlanData={currentPlanData}
                modifiedTerms={modifiedTerms}
                movedCourses={movedCourses}
                onMoveCourse={onMoveCourse}
              />
            </Box>
          ) : null;

          // Render events after first term
          const firstTermEvents = eventsAfterThisTerm.length > 0 ? (
            <Box
              key={`events-after-${index}`}
              sx={{
                width: '100%',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '24px',
                  backgroundColor: 'var(--border)',
                  opacity: 0.5,
                }
              }}
            >
              {eventsAfterThisTerm.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isEditMode={isEditMode}
                  variant="bar"
                  onEdit={onEditEvent}
                  onDelete={onDeleteEvent}
                />
              ))}
            </Box>
          ) : null;

          // Render events after second term
          const secondTermEvents = nextTerm && nextEventsAfterTerm.length > 0 ? (
            <Box
              key={`events-after-${index + 1}`}
              sx={{
                width: '100%',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '24px',
                  backgroundColor: 'var(--border)',
                  opacity: 0.5,
                }
              }}
            >
              {nextEventsAfterTerm.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isEditMode={isEditMode}
                  variant="bar"
                  onEdit={onEditEvent}
                  onDelete={onDeleteEvent}
                />
              ))}
            </Box>
          ) : null;

          // Add row with 2 terms
          acc.push(
            <Box key={`row-${index}`} sx={{ display: 'flex', gap: 3, '@media (max-width: 900px)': { flexDirection: 'column' } }}>
              {termCard}
              {nextTermCard}
            </Box>
          );

          // Add events after first term
          if (firstTermEvents) acc.push(firstTermEvents);
          // Add events after second term
          if (secondTermEvents) acc.push(secondTermEvents);
        }
        // Skip odd indices as they're handled in the even index case

        return acc;
      }, [])}
    </Box>
  );
}
