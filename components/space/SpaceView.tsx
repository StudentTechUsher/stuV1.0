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
  }, [sortedTermsWithIndices, plan.events, isEditMode, modifiedTerms, onEditEvent, onDeleteEvent, onAddCourse, onSubstituteCourse]);

  return (
    <div className="space-y-4">
      {/* Term cards - 2 per row grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedTermsWithIndices.map(({ term, originalIndex }) => (
          <div key={`term-${term.id}`} className="transition-all duration-200">
            <TermCard
              term={term}
              isEditMode={isEditMode}
              modifiedTerms={modifiedTerms}
              onAddCourse={onAddCourse}
              onSubstituteCourse={onSubstituteCourse}
              gradPlanId={gradPlanId}
            />
          </div>
        ))}
      </div>

      {/* Events section - below grid */}
      {plan.events && plan.events.length > 0 && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_8%,transparent)] bg-white dark:bg-[var(--card)] p-4 shadow-sm">
          <h3 className="text-sm font-black text-[var(--foreground)] mb-3">Milestones</h3>
          <div className="flex flex-wrap gap-2">
            {plan.events.map((event) => (
              <div
                key={`event-${event.id}`}
                className="flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--muted)] px-3 py-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-[#ec4899]" />
                <span className="text-xs font-bold text-[var(--foreground)]">{event.title}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">after Term {event.afterTerm}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom legend - matches Progress Overview colors */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)] font-medium px-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#12F987]" />
          <span>Major</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2196f3]" />
          <span>Gen Ed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#5E35B1]" />
          <span>Religion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#9C27B0]" />
          <span>Elective</span>
        </div>
      </div>
    </div>
  );
}
