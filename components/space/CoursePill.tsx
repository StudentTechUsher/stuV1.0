"use client";

import { ReqDot } from './ReqDot';
import { useDraggable } from '@dnd-kit/core';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { Course } from '../grad-planner/types';

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  requirements: string[];
  termIndex: number;
  courseIndex: number;
  rawCourse: Course;
}

interface CoursePillProps {
  course: CourseItem;
  isEditMode?: boolean;
  onSubstituteCourse?: (termIndex: number, courseIndex: number) => void;
}

export function CoursePill({ course, isEditMode = false, onSubstituteCourse }: CoursePillProps) {
  const isCompleted = course.rawCourse.isCompleted || false;
  const isWithdrawn = course.rawCourse.status === 'Withdrawn';

  // Disable dragging for completed or withdrawn courses
  const isDraggingDisabled = !isEditMode || isCompleted || isWithdrawn;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: course.id,
    data: {
      course: course.rawCourse,
      termIndex: course.termIndex,
      courseIndex: course.courseIndex,
    },
    disabled: isDraggingDisabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : { zIndex: isDragging ? 1000 : 'auto' };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className={`grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-1 rounded-lg shadow-sm ${
            isCompleted
              ? 'bg-green-50 border border-green-200'
              : isWithdrawn
              ? 'bg-gray-100 border border-gray-300'
              : 'bg-white border border-gray-200'
          }`}
          style={{
            ...style,
            cursor: isEditMode && !isCompleted && !isWithdrawn ? (isDragging ? 'grabbing' : 'grab') : 'default',
            opacity: isDragging ? 0.7 : 1,
            userSelect: 'none',
          }}
        >
          {/* Left: requirement dots + course info */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Requirement dots */}
            {course.requirements && course.requirements.length > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                {course.requirements.map((req, idx) => (
                  <ReqDot key={idx} tag={req} size={8} />
                ))}
              </div>
            )}

            {/* Course code and title */}
            <div className="min-w-0 flex-1 flex items-center gap-1">
              {isCompleted && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600 shrink-0"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {isWithdrawn && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-600 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4.93 4.93l14.14 14.14" />
                </svg>
              )}
              <span className={`text-[11px] font-medium truncate block max-w-[180px] sm:max-w-[200px] ${
                isCompleted ? 'text-green-700' : isWithdrawn ? 'text-gray-700' : 'text-gray-900'
              }`}>
                {course.code} - {course.title}
              </span>
            </div>
          </div>

          {/* Right: credits */}
          <div className="shrink-0">
            <span className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded text-[10px] font-mono ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : isWithdrawn
                ? 'bg-gray-200 text-gray-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {course.credits}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs bg-zinc-900 text-white">
        <div className="space-y-1.5">
          <div>
            <p className="font-semibold text-sm">{course.code}</p>
            <p className="text-xs text-zinc-200">{course.title}</p>
          </div>
          <div className="border-t border-zinc-700 pt-1.5">
            <p className="text-xs text-zinc-300">
              <span className="font-medium">{course.credits}</span> credit{course.credits !== 1 ? 's' : ''}
            </p>
            {isCompleted && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-medium">Completed</span>
              </p>
            )}
            {isWithdrawn && (
              <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M4.93 4.93l14.14 14.14" />
                </svg>
                <span className="font-medium">Withdrawn</span>
              </p>
            )}
            {course.requirements && course.requirements.length > 0 && (
              <p className="text-xs text-zinc-300 mt-1">
                <span className="font-medium">Fulfills:</span> {course.requirements.join(', ')}
              </p>
            )}
          </div>
          {isEditMode && onSubstituteCourse && !isCompleted && !isWithdrawn && (
            <div className="border-t border-zinc-700 pt-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSubstituteCourse(course.termIndex, course.courseIndex);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <path d="M9 15l3 3 3-3" />
                </svg>
                Substitute
              </button>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
