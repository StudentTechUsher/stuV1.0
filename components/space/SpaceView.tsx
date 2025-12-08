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
  onAddCourse?: (termIndex: number) => void;
}

export function SpaceView({ plan, isEditMode = false, modifiedTerms, onEditEvent, onDeleteEvent, onToggleView, onAddCourse }: Readonly<SpaceViewProps>) {
  const termRows = React.useMemo(() => {
    const rows: React.ReactNode[] = [];

    plan.terms.forEach((term, index) => {
      const termNumber = index + 1;
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
  }, [plan.terms, plan.events, isEditMode, modifiedTerms, onEditEvent, onDeleteEvent, onAddCourse]);

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
