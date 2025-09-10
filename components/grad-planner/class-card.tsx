'use client';

import type { Course, SemesterId, Semester } from '@/types/graduation-plan';
import { chipThemeFor, withAlpha } from './chip-themes';

interface ClassCardProps {
  course: Course;
  onChangeSemester: (semester: SemesterId) => void;
  semesterList: Semester[];
}

export default function ClassCard({
  course,
  onChangeSemester,
  semesterList,
}: Readonly<ClassCardProps>) {
  const handleDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.dataTransfer.setData('text/plain', course.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const theme = chipThemeFor(course.requirement || '—');

  return (
    <div
      className="
        group relative w-full box-border overflow-hidden
        rounded-lg bg-white shadow-sm ring-1 ring-zinc-200
        !pl-4 !pt-3 !pr-14 !pb-6
        min-h-[144px]
        hover:shadow-md hover:ring-zinc-300 transition
        cursor-grab active:cursor-grabbing
      "
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      aria-label={`${course.code} ${course.title}`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold tracking-tight leading-snug">
            {course.code}
          </div>
          <div className="text-[11px] text-zinc-600 leading-snug pr-2">
            {course.credits.toFixed(1)} credits
          </div>
        </div>
        <div className="text-[13px] text-zinc-800 leading-snug truncate">
          {course.title}
        </div>
      </div>

      {/* requirement chip */}
      <span
        className="absolute bottom-3 left-4 inline-flex items-center rounded-full
                  text-[11px] leading-none select-none border
                  max-w-[65%] truncate whitespace-nowrap
                  !px-4 !py-2"
        style={{
          backgroundColor: withAlpha(theme.base, '66'),
          borderColor:     withAlpha(theme.base, '99'),
          color:           theme.text,
        }}
        title={course.requirement}
      >
        {course.requirement}
      </span>

      {/* semester select */}
      <div className="absolute bottom-12 right-3 sm:right-4 md:right-5">
        <label className="sr-only" htmlFor={`sem-${course.id}`}>Semester</label>
        <select
          id={`sem-${course.id}`}
          value={course.semester}
          onChange={(e) => onChangeSemester(Number(e.target.value) as SemesterId)}
          className="
            rounded-md border border-zinc-300 bg-white text-sm
            px-3 py-1.5 shadow-sm hover:border-zinc-400
            focus:outline-none focus:ring-2 focus:ring-primary
          "
        >
          {semesterList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
