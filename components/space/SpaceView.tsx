import React from 'react';
import { TermCard, TermBlock } from './TermCard';
import { Event } from '../grad-planner/types';
import { EventCard } from '../grad-planner/EventCard';
import { Maximize2 } from 'lucide-react';

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
  onToggleView?: () => void;
}

export function SpaceView({ plan, isEditMode = false, modifiedTerms, onEditEvent, onDeleteEvent, onToggleView }: Readonly<SpaceViewProps>) {
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

  const allCards = React.useMemo(() => {
    const cards: React.ReactNode[] = [];

    plan.terms.forEach((term, index) => {
      const termNumber = index + 1;

      // Add term card
      cards.push(
        <div
          key={`term-${term.id}`}
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
      );

      // Add events that come after this term
      const eventsAfterThisTerm = plan.events?.filter(e => e.afterTerm === termNumber) || [];
      eventsAfterThisTerm.forEach((event) => {
        cards.push(
          <div
            key={`event-${event.id}`}
            className="min-w-0 transition-all duration-250 ease-in-out"
            style={{
              width: `calc((100% - (${termsPerRow - 1} * 0.75rem)) / ${termsPerRow})`,
              flexShrink: 0
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
        );
      });
    });

    return cards;
  }, [plan.terms, plan.events, termsPerRow, isEditMode, modifiedTerms, onEditEvent, onDeleteEvent]);

  return (
    <div className="space-y-3">
      {/* Top inputs row with toggle button */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
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
        {onToggleView && (
          <button
            type="button"
            onClick={onToggleView}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <Maximize2 size={16} strokeWidth={2} />
            Detailed View
          </button>
        )}
      </div>

      {/* Term cards and event cards - Flex wrap layout maintaining terms per row */}
      <div className="flex flex-wrap items-stretch gap-3 w-full">
        {allCards}
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
