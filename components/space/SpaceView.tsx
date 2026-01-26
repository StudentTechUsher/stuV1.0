import React from 'react';
import { TermCard, TermBlock } from './TermCard';
import { Event } from '../grad-planner/types';
import { EventCard } from '../grad-planner/EventCard';

export interface PlanSpaceView {
  planName: string;
  degree: string;
  gradSemester: string;
  terms: TermBlock[];
  events?: Event[];
}

interface SpaceViewProps {
  plan: PlanSpaceView;
  isEditMode?: boolean;
  modifiedTerms?: Set<number>;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
  onAddCourse?: (termIndex: number) => void;
  onSubstituteCourse?: (termIndex: number, courseIndex: number) => void;
  gradPlanId?: string;
}

export function SpaceView({ plan, isEditMode = false, modifiedTerms, onEditEvent, onDeleteEvent, onAddCourse, onSubstituteCourse, gradPlanId }: Readonly<SpaceViewProps>) {
  // Sort terms to show "Transfer Credits" first
  const sortedTermsWithIndices = React.useMemo(() => {
    return plan.terms
      .map((term, originalIndex) => ({ term, originalIndex }))
      .sort((a, b) => {
        const aIsTransfer = a.term.label?.toLowerCase().includes('transfer') ?? false;
        const bIsTransfer = b.term.label?.toLowerCase().includes('transfer') ?? false;

        if (aIsTransfer && !bIsTransfer) return -1;
        if (!aIsTransfer && bIsTransfer) return 1;
        return 0; // Keep original order for non-transfer terms
      });
  }, [plan.terms]);

  const termRows = React.useMemo(() => {
    const rows: React.ReactNode[] = [];

    sortedTermsWithIndices.forEach(({ term, originalIndex }) => {
      const termNumber = originalIndex + 1;
      const eventsAfterThisTerm = plan.events?.filter(e => e.afterTerm === termNumber) || [];

      rows.push(
        <div key={`term-row-${term.id}`} className="flex flex-col gap-3">
          {/* Term Card - Full Width */}
          <div className="w-full transition-all duration-250 ease-in-out">
            <TermCard
              term={term}
              isEditMode={isEditMode}
              modifiedTerms={modifiedTerms}
              onAddCourse={onAddCourse}
              onSubstituteCourse={onSubstituteCourse}
              gradPlanId={gradPlanId}
            />
          </div>

          {/* Events after this term - Horizontal row below the term */}
          {eventsAfterThisTerm.length > 0 && (
            <div className="flex flex-wrap gap-3 pl-8">
              {eventsAfterThisTerm.map((event) => (
                <div
                  key={`event-${event.id}`}
                  className="shrink-0 transition-all duration-250 ease-in-out"
                  style={{
                    width: '280px',
                    minWidth: '280px',
                    maxWidth: '280px',
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
    });

    return rows;
  }, [sortedTermsWithIndices, plan.events, isEditMode, modifiedTerms, onEditEvent, onDeleteEvent, onAddCourse, onSubstituteCourse, gradPlanId]);

  return (
    <div className="space-y-3">
      {/* Term cards and event cards - One term per row with milestones below */}
      <div className="flex flex-col gap-4 w-full">
        {termRows}
      </div>

      {/* Bottom legend */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span
          className="inline-block w-2 h-2 rounded-full bg-[var(--primary)]"
          aria-label="Green dot indicator"
        />
        <span>Fulfills both a Major and GE Requirement</span>
      </div>
    </div>
  );
}
