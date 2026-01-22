import React from 'react';

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
  is_active?: boolean;
}

interface SpaceViewTermCardProps {
  term: Term;
  index: number;
  events?: Event[];
  isEditMode?: boolean;
  onEditEvent?: (event?: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function SpaceViewTermCard({ term, index }: SpaceViewTermCardProps) {
  const termCredits = term.credits_planned ||
    (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition-all duration-200 min-h-[150px] h-full w-full">
      <h3 className="font-header-bold text-sm font-black text-[var(--foreground)] mb-1">
        Term {term.term || index + 1}
      </h3>
      <span className="text-xs font-bold text-[var(--muted-foreground)] block mb-3">
        {termCredits} Credits
      </span>

      {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
        <div className="flex flex-col gap-1">
          {term.courses.map((course: Course, courseIndex: number) => {
            if (!course.code || !course.title) return null;
            return (
              <span
                key={`space-term-${index}-course-${courseIndex}`}
                className="text-xs text-[var(--muted-foreground)] leading-relaxed"
              >
                {course.code}
              </span>
            );
          })}
        </div>
      ) : (
        <span className="text-xs text-[var(--muted-foreground)]">
          No courses
        </span>
      )}
    </div>
  );
}
