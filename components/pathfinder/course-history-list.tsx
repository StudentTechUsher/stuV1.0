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
        `flex flex-col rounded-lg border border-border dark:border-zinc-600 bg-card text-card-foreground shadow-sm ` +
        `overflow-y-auto overflow-x-hidden custom-scroll min-h-0 ` +
        `focus:outline-none focus:ring-2 focus:ring-ring/50 ${className || ''}`
      }
      style={style}
      aria-label="Course history"
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border dark:border-zinc-600 bg-card px-4 pt-4 pb-3">
        <h2 className="text-lg font-semibold text-foreground">Completed Courses</h2>
        <p className="text-xs text-muted-foreground">Showing {filtered.length} of {courses.length}</p>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search courses..."
          className="mt-3 w-full rounded-md border border-border dark:border-zinc-500 bg-background dark:bg-zinc-900/70 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
        />
      </div>
      {/* List */}
      <div className="px-4 pb-4 pt-3">
        <ul className="space-y-2">
          {filtered.map(c => (
            <li key={c.id}>
              <button
                onClick={() => onSelectCourse?.(c)}
                className="group w-full rounded border border-border dark:border-zinc-500 bg-background dark:bg-zinc-900/60 px-3 py-2 text-left transition-colors hover:bg-muted dark:hover:bg-zinc-800/70"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary">{c.code}</span>
                  {c.grade && <span className="text-xs font-medium text-muted-foreground">{c.grade}</span>}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{c.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="inline-flex items-center rounded bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--primary)_88%,var(--foreground)_12%)]">{c.credits}cr</span>
                  <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{c.term}</span>
                  {c.tags?.map(t => (
                    <span key={t} className="inline-flex items-center rounded bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--accent)_80%,var(--foreground)_20%)]">{t}</span>
                  ))}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-4 text-center text-xs text-muted-foreground">No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}
