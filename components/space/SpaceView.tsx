import { TermBlock } from './TermCard';
import { Term } from '@/components/grad-planner/types';
import { DroppableTerm } from '@/components/grad-planner/DroppableTerm';
import { ReqDot } from './ReqDot';
import { useDraggable } from '@dnd-kit/core';

export interface Event {
  id: string;
  type: 'Major/Minor Application' | 'Internship' | 'Study Abroad';
  title: string;
  afterTerm: number;
}

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
  currentPlanData?: Term[];
  modifiedTerms?: Set<number>;
  movedCourses?: Set<string>;
  onMoveCourse?: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
}

// Simple draggable course pill component
function DraggableCoursePill({ course, termIndex, courseIndex, isEditMode }: {
  course: { code: string; title: string; credits: number; fulfills?: string[] };
  termIndex: number;
  courseIndex: number;
  isEditMode: boolean;
}) {
  const courseId = `course-${termIndex}-${courseIndex}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: courseId,
    data: { course, termIndex, courseIndex },
    disabled: !isEditMode,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditMode ? { ...listeners, ...attributes } : {})}
      className={`grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-1 rounded-lg bg-white border border-gray-200 shadow-sm ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={`${course.code} - ${course.title}`}
    >
      {/* Left: requirement dots + course info */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Requirement dots */}
        {course.fulfills && course.fulfills.length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            {course.fulfills.map((req, idx) => (
              <ReqDot key={idx} tag={req} size={8} />
            ))}
          </div>
        )}

        {/* Course code and title */}
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-gray-900 font-medium truncate block max-w-[180px] sm:max-w-[200px]">
            {course.code} - {course.title}
          </span>
        </div>
      </div>

      {/* Right: credits */}
      <div className="shrink-0">
        <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-700">
          {course.credits}
        </span>
      </div>
    </div>
  );
}

export function SpaceView({
  plan,
  isEditMode = false,
  onEditEvent,
  onDeleteEvent,
  currentPlanData = [],
  modifiedTerms = new Set(),
  movedCourses = new Set(),
  onMoveCourse
}: SpaceViewProps) {
  const events = plan.events || [];

  // Create an array of items (terms and events) to render in the grid
  const gridItems: Array<{ type: 'term' | 'event'; data: TermBlock | Event; key: string }> = [];

  plan.terms.forEach((term, index) => {
    const termNumber = index + 1;

    // Add the term
    gridItems.push({
      type: 'term',
      data: term,
      key: `term-${term.id}`
    });

    // Add any events that come after this term
    const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);
    eventsAfterThisTerm.forEach(event => {
      gridItems.push({
        type: 'event',
        data: event,
        key: `event-${event.id}`
      });
    });
  });

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

      {/* Term cards and events - using flexbox to allow 4 terms + events per row */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {gridItems.map((item) => {
          if (item.type === 'term') {
            const termIndex = plan.terms.findIndex(t => t.id === (item.data as TermBlock).id);
            const termData = currentPlanData[termIndex];

            if (!termData) {
              return null;
            }

            const termCredits = termData.credits_planned ||
              (termData.courses ? termData.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);

            return (
              <div
                key={item.key}
                className="flex-1 min-w-[180px]"
                style={{
                  flexBasis: 'calc(23% - 0.75rem)',
                  maxWidth: 'calc(24% - 0.75rem)'
                }}
              >
                <DroppableTerm
                  term={termData}
                  termIndex={termIndex}
                  isEditMode={isEditMode}
                  modifiedTerms={modifiedTerms}
                >
                  <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-2">
                    {/* Term header */}
                    <div className="mb-1.5">
                      <h3 className="text-sm font-bold text-gray-900 mb-0.5">Term {termData.term || termIndex + 1}</h3>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                        <span>Class / Credits</span>
                      </div>
                    </div>

                    {/* Course list */}
                    <div className="space-y-1 mb-1.5">
                      {termData.courses && Array.isArray(termData.courses) && termData.courses.length > 0 ? (
                        termData.courses.map((course, courseIndex) => {
                          if (!course.code || !course.title) return null;
                          return (
                            <DraggableCoursePill
                              key={`space-term-${termIndex}-course-${courseIndex}-${course.code}`}
                              course={course}
                              courseIndex={courseIndex}
                              termIndex={termIndex}
                              isEditMode={isEditMode}
                            />
                          );
                        })
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-2">No courses</p>
                      )}
                    </div>

                    {/* Term footer */}
                    <div className="pt-1.5 border-t border-gray-200 text-right">
                      <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                        {termCredits} TOTAL
                      </span>
                    </div>
                  </div>
                </DroppableTerm>
              </div>
            );
          } else {
            const event = item.data as Event;
            const eventColor =
              event.type === 'Internship' ? '#9C27B0' :
              event.type === 'Study Abroad' ? '#2196F3' :
              '#ff9800';

            return (
              <div
                key={item.key}
                className="p-3 rounded-lg shadow-sm flex flex-col items-center justify-center text-center min-h-[150px] relative"
                style={{
                  backgroundColor: eventColor,
                  color: 'white',
                  width: '100px',
                  flexShrink: 0
                }}
              >
                {isEditMode && (
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <button
                      onClick={() => onEditEvent?.(event)}
                      className="p-0.5 hover:bg-white/20 rounded transition-colors"
                      title="Edit event"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => onDeleteEvent?.(event.id)}
                      className="p-0.5 hover:bg-white/20 rounded transition-colors"
                      title="Delete event"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                )}
                <div className="mb-2">
                  {event.type === 'Internship' ? (
                    <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                    </svg>
                  ) : event.type === 'Study Abroad' ? (
                    <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.5 19h19v2h-19zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06L14.92 10l-6.9-6.43-1.93.51 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 1.82 3.16.77 1.33 1.6-.43 5.31-1.42 4.35-1.16L21 11.49c.81-.23 1.28-1.05 1.07-1.85z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                    </svg>
                  )}
                </div>
                <div className="font-semibold text-xs mb-1 leading-tight">{event.title}</div>
                <div className="text-[10px] opacity-90 break-words">{event.type}</div>
              </div>
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
