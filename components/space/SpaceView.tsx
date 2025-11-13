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
}

export function SpaceView({ plan, isEditMode = false, modifiedTerms, onEditEvent, onDeleteEvent }: Readonly<SpaceViewProps>) {
  // Calculate optimal terms per row (3-4 terms) based on total term count
  const termsPerRow = React.useMemo(() => {
    const totalTerms = plan.terms.length;

    // If we can divide evenly by 4, use 4
    if (totalTerms % 4 === 0) return 4;

    // If we can divide evenly by 3, use 3
    if (totalTerms % 3 === 0) return 3;

    // Otherwise, check which gives a better last row
    const remainder4 = totalTerms % 4;
    const remainder3 = totalTerms % 3;

    // If 4-per-row leaves 3 or fewer in last row, prefer 3-per-row
    // But if 3-per-row leaves only 1 in last row and 4-per-row leaves 2+, use 4
    if (remainder4 >= 3 || (remainder3 === 1 && remainder4 >= 2)) {
      return 4;
    }

    return 3;
  }, [plan.terms.length]);

  const rows = React.useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let i = 0; i < plan.terms.length; i += termsPerRow) {
      const rowTerms = plan.terms.slice(i, i + termsPerRow);
      const rowStartIndex = i;

      result.push(
        <div
          key={`row-${i}`}
          className="flex items-stretch gap-3 w-full transition-all duration-300 ease-in-out"
        >
          {rowTerms.map((term, indexInRow) => {
            const globalIndex = rowStartIndex + indexInRow;
            const termNumber = globalIndex + 1;

            // Get events that should appear after this specific term
            const eventsAfterThisTerm = plan.events?.filter(e => e.afterTerm === termNumber) || [];

            return (
              <React.Fragment key={`term-group-${term.id}`}>
                {/* Term Card */}
                <div
                  className="min-w-0 transition-all duration-250 ease-in-out"
                  style={{
                    width: `calc((100% - (${termsPerRow - 1} * 0.75rem)) / ${termsPerRow})`,
                    flexShrink: 0
                  }}
                >
                  <TermCard
                    term={term}
                    isEditMode={isEditMode}
                    modifiedTerms={modifiedTerms}
                  />
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

    return result;
  }, [plan.terms, plan.events, isEditMode, modifiedTerms, onEditEvent, onDeleteEvent]);

  return (
    <div className="space-y-3">
      {/* Top inputs row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Plan Name
          </label>
          <input
            type="text"
            value={plan.planName}
            readOnly
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Programs
          </label>
          <input
            type="text"
            value={plan.degree}
            readOnly
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Graduation Semester
          </label>
          <input
            type="text"
            value={plan.gradSemester}
            readOnly
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 pointer-events-none"
          />
        </div>
      </div>

      {/* Term cards and event cards - Row-based layout maintaining 4 terms per row */}
      <div className="flex flex-col gap-3">
        {rows}
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
