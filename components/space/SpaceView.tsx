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
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function SpaceView({ plan, isEditMode = false, onEditEvent, onDeleteEvent }: Readonly<SpaceViewProps>) {
  // Create an array of terms and events to render in order
  const gridItems = React.useMemo(() => {
    const items: Array<{ type: 'term' | 'event'; data: TermBlock | Event; termNumber?: number }> = [];

    plan.terms.forEach((term, index) => {
      const termNumber = index + 1;

      // Add the term
      items.push({ type: 'term', data: term, termNumber });

      // Add events that occur after this term
      if (plan.events) {
        const eventsAfterTerm = plan.events.filter(e => e.afterTerm === termNumber);
        eventsAfterTerm.forEach(event => {
          items.push({ type: 'event', data: event, termNumber });
        });
      }
    });

    return items;
  }, [plan.terms, plan.events]);

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
            Degree
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

      {/* Term cards and event cards grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {gridItems.map((item) => {
          if (item.type === 'term') {
            return <TermCard key={`term-${item.data.id}`} term={item.data as TermBlock} />;
          } else {
            const event = item.data as Event;
            return (
              <EventCard
                key={`event-${event.id}`}
                event={event}
                isEditMode={isEditMode}
                variant="grid"
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            );
          }
        })}
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
