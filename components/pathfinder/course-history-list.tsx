"use client";
import * as React from 'react';

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  term: string; // e.g. 'Fall 2024'
  grade?: string;
  tags?: string[]; // e.g. ['GenEd', 'Major Core']
}

interface CourseHistoryListProps {
  courses: Course[];
  onSelectCourse?: (course: Course) => void;
  /**
   * Optional max height (e.g. 480, '60vh'). If omitted the component will stretch to parent height.
   */
  maxHeight?: number | string;
  /** Additional classNames to append to outer container */
  className?: string;
  /**
   * When no explicit maxHeight is provided, we compute a viewport-relative cap: calc(100vh - viewportOffsetPx).
   * This helps ensure the component fits within the visible area and becomes internally scrollable.
   * Defaults to 180 (approx header + page padding). Set to 0 to disable auto viewport sizing.
   */
  viewportOffsetPx?: number;
}

export function CourseHistoryList({ courses, onSelectCourse, maxHeight, className, viewportOffsetPx = 180 }: Readonly<CourseHistoryListProps>) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [query, courses]);

  // Determine max height strategy.
  // Priority: explicit maxHeight prop -> auto viewport-based height (unless offset disabled).
  let computedMaxHeight: string | undefined;
  if (typeof maxHeight !== 'undefined') {
    computedMaxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : String(maxHeight);
  } else if (viewportOffsetPx >= 0) {
    computedMaxHeight = `calc(100vh - ${viewportOffsetPx}px)`;
  }

  const style: React.CSSProperties | undefined = computedMaxHeight ? { maxHeight: computedMaxHeight } : undefined;

  return (
    <div
      className={
        `flex flex-col border rounded-lg bg-white/70 backdrop-blur shadow-sm ` +
        `overflow-y-auto overflow-x-hidden custom-scroll min-h-0 ` +
        `focus:outline-none focus:ring-2 focus:ring-emerald-300 ${className || ''}`
      }
      style={style}
      aria-label="Course history"
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur px-4 pt-4 pb-3 border-b border-emerald-100">
        <h2 className="text-lg font-semibold text-gray-800">Completed Courses</h2>
        <p className="text-xs text-gray-500">Showing {filtered.length} of {courses.length}</p>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search courses..."
          className="mt-3 w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-emerald-300"
        />
      </div>
      {/* List */}
      <div className="px-4 pb-4 pt-3">
        <ul className="space-y-2">
          {filtered.map(c => (
            <li key={c.id}>
              <button
                onClick={() => onSelectCourse?.(c)}
                className="w-full text-left rounded border border-gray-200 bg-gray-50 hover:bg-emerald-50 transition-colors px-3 py-2 group"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-gray-800 group-hover:text-emerald-700 text-sm">{c.code}</span>
                  {c.grade && <span className="text-xs font-medium text-gray-500">{c.grade}</span>}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{c.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium">{c.credits}cr</span>
                  <span className="inline-flex items-center rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px] font-medium">{c.term}</span>
                  {c.tags?.map(t => (
                    <span key={t} className="inline-flex items-center rounded bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium">{t}</span>
                  ))}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-xs text-gray-500 py-4 text-center">No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}
