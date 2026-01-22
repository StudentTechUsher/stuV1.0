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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: course.id,
    data: {
      course: course.rawCourse,
      termIndex: course.termIndex,
      courseIndex: course.courseIndex,
    },
    disabled: !isEditMode,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : { zIndex: isDragging ? 1000 : 'auto' };

  const isCompleted = course.rawCourse.isCompleted || false;

  // Check if this is a placeholder course (no actual course code, just category name)
  const isPlaceholder = !course.code ||
    /^(elective|ge|general|religion|rel|minor|major)s?$/i.test(course.code.trim()) ||
    /^(free\s+)?elective$/i.test(course.code.trim()) ||
    course.code.toUpperCase() === course.code && !course.code.match(/\d/); // All caps with no numbers

  // Determine category color based on requirements - matches Progress Overview colors
  const getCategoryColor = (requirements: string[]) => {
    if (!requirements || requirements.length === 0) return '#6b7280';
    const req = requirements[0].toLowerCase();
    if (req.includes('major') || req.includes('core')) return '#12F987';  // Progress Overview: var(--primary)
    if (req.includes('general') || req.includes('ge ')) return '#2196f3';  // Progress Overview: GE blue
    if (req.includes('religion') || req.includes('rel ')) return '#5E35B1';  // Progress Overview: Religion indigo
    if (req.includes('elective')) return '#9C27B0';  // Progress Overview: Electives magenta
    if (req.includes('minor')) return '#003D82';  // Progress Overview: Minor blue
    return '#6b7280';
  };

  const categoryColor = getCategoryColor(course.requirements);

  // Determine background style based on course status
  const getBackgroundStyle = () => {
    if (isPlaceholder) {
      // Placeholder courses: white background
      return {
        backgroundColor: 'white',
        borderColor: 'rgb(212 212 216)', // zinc-300
      };
    }
    if (isCompleted) {
      // Completed courses: green tinted background
      return {
        backgroundColor: `color-mix(in srgb, #12F987 20%, white)`,
        borderColor: '#12F987',
      };
    }
    // Planned courses: light grey background
    return {
      backgroundColor: 'rgb(212 212 216)', // zinc-300
      borderColor: 'rgb(161 161 170)', // zinc-400
    };
  };

  const backgroundStyle = getBackgroundStyle();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="grid grid-cols-[1fr_auto] items-center gap-2 px-2.5 py-2 rounded-xl transition-all duration-200 hover:shadow-sm border"
          style={{
            ...style,
            ...backgroundStyle,
            cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
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
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
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
                  className="shrink-0 text-[#12F987]"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className="text-[11px] font-semibold truncate block max-w-[180px] sm:max-w-[200px] text-[var(--foreground)]">
                {course.code} - {course.title}
              </span>
            </div>
          </div>

          {/* Right: credits */}
          <div className="shrink-0 flex items-center">
            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-[var(--card)] text-[var(--foreground)]">
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
            {course.requirements && course.requirements.length > 0 && (
              <p className="text-xs text-zinc-300 mt-1">
                <span className="font-medium">Fulfills:</span> {course.requirements.join(', ')}
              </p>
            )}
          </div>
          {isEditMode && onSubstituteCourse && (
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
