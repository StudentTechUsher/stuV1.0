'use client';

import type { Course, Semester } from '@/types/graduation-plan';

interface SemesterContainerProps {
  semester: Semester;
  courses: Course[];
  onDropCourse: (courseId: string) => void;
  children: React.ReactNode;
  notes?: string[];
  checkpoints?: { action: string; conditions?: string[]; notes?: string }[];
  semesterCredits: number;
}

export default function SemesterContainer({
  semester,
  courses,
  onDropCourse,
  children,
  notes,
  checkpoints,
  semesterCredits,
}: Readonly<SemesterContainerProps>) {
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => e.preventDefault();
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const courseId = e.dataTransfer.getData('text/plain');
    if (courseId) onDropCourse(courseId);
  };

  return (
    <section
      className="
        rounded-xl bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
        ring-1 ring-zinc-200 shadow-sm p-4 sm:p-5 min-h-[260px]
      "
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label={semester.label}
    >
      <header className="flex items-center justify-between !px-3 sm:!px-3">
        <h3 className="text-sm font-semibold tracking-tight">{semester.label}</h3>
        <span className="text-[11px] text-zinc-600">
          {courses.length} class{courses.length !== 1 ? 'es' : ''} • {semesterCredits.toFixed(1)} {semesterCredits === 1 ? 'credit' : 'credits'}
        </span>
      </header>

      {/* notes / checkpoints */}
      {(notes?.length || checkpoints?.length) && (
        <div className="mt-3 space-y-2 text-xs text-zinc-700">
          {notes?.length ? (
            <ul className="list-disc ml-4">
              {notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          ) : null}
          {checkpoints?.length ? (
            <ul className="list-disc ml-4">
              {checkpoints.map((cp, i) => (
                <li key={i}>
                  <strong>{cp.action}</strong>
                  {cp.conditions?.length ? ` — ${cp.conditions.join('; ')}` : ''}
                  {cp.notes ? ` (${cp.notes})` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="mt-4 grid gap-4">
        {children}
        {courses.length === 0 && (
          <div className="rounded-md border border-dashed border-zinc-300 text-zinc-500 py-6 text-center text-sm">
            Drag a class here or use the dropdown on a class card.
          </div>
        )}
      </div>
    </section>
  );
}
