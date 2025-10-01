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
}

export function CourseHistoryList({ courses, onSelectCourse }: CourseHistoryListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [query, courses]);

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white/70 backdrop-blur p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Completed Courses</h2>
        <p className="text-xs text-gray-500">Showing {filtered.length} of {courses.length}</p>
      </div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search courses..."
        className="mb-3 w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-emerald-300"
      />
      <div className="overflow-auto custom-scroll flex-1 pr-1">
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
