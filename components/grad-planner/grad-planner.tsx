'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import type { 
  Course, 
  SemesterId, 
  SemesterMeta, 
  GradPlannerProps 
} from '@/types/graduation-plan';
import { buildSemesterList, normalizePlan } from './plan-utils';
import { chipThemeFor, withAlpha } from './chip-themes';
import JsonPreview from './json-preview';

export default function GradPlanner({ plan, fetchPlan }: GradPlannerProps) {
  const [showStart, setShowStart] = useState(true);

  const [courses, setCourses] = useState<Course[]>([]);
  const [semestersMeta, setSemestersMeta] = useState<Record<SemesterId, SemesterMeta>>({});
  const [leftovers, setLeftovers] = useState<Record<string, unknown>>({});
  const [headerTitle, setHeaderTitle] = useState<string>('Four-Year Planning Assistant (PoC)');
  const [termsPlanned, setTermsPlanned] = useState<number>(8); // default; will be overridden

  useEffect(() => {
    let mounted = true;
    (async () => {
      const sourcePlan = plan ?? (fetchPlan ? await fetchPlan() : undefined);
      if (!mounted || !sourcePlan) return;
      const { courses, semestersMeta, leftovers, termsPlanned } = normalizePlan(sourcePlan);
      if (!mounted) return;

      setCourses(courses);
      setSemestersMeta(semestersMeta);
      setLeftovers(leftovers);
      setTermsPlanned(termsPlanned);
      setHeaderTitle(
        sourcePlan.program ? `Planner — ${sourcePlan.program}` : 'Four-Year Planning Assistant (PoC)'
      );
    })();
    return () => { mounted = false; };
  }, [plan, fetchPlan]);

  // dynamic semester list
  const semesterList = useMemo(() => buildSemesterList(termsPlanned), [termsPlanned]);

  // move courses (drag/drop or select)
  const moveCourse = (courseId: string, toSemester: SemesterId) => {
    setCourses(prev =>
      prev.map(c => (c.id === courseId ? { ...c, semester: toSemester } : c))
    );
  };

  // totals (dynamic)
  const totals = useMemo(() => {
    const bySemester = new Map<SemesterId, number>();
    let all = 0;
    for (const c of courses) {
      all += c.credits;
      bySemester.set(c.semester, (bySemester.get(c.semester) || 0) + c.credits);
    }
    return { all, bySemester };
  }, [courses]);

  // add terms
  const addTerm = () => setTermsPlanned(n => n + 1);

  return (
    <section className="relative py-10">
      {showStart && <StartDialog onClose={() => setShowStart(false)} />}

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <header className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{headerTitle}</h1>
          <p className="text-zinc-600 mt-0.5 text-sm">
            Drag classes between semesters or use the dropdown to reassign.
          </p>

          <div className="mt-3 flex items-center gap-3 text-sm text-zinc-700">
            <div><strong>Total planned credits:</strong> {totals.all.toFixed(1)}</div>
            <div className="ml-auto flex items-center gap-2">
              <span>Planned terms:</span>
              <strong>{termsPlanned}</strong>
              <Button
                variant="outlined"
                size="small"
                onClick={addTerm}
                sx={{
                  fontSize: '0.75rem',
                  color: '#10b981',
                  borderColor: '#10b981',
                  textTransform: 'none',
                  minWidth: 'auto',
                  px: 2,
                  py: 0.5,
                  '&:hover': {
                    borderColor: '#059669',
                    backgroundColor: 'rgba(16, 185, 129, 0.04)',
                  }
                }}
              >
                + Add Term
              </Button>
            </div>
          </div>

          {leftovers && Object.keys(leftovers).length > 0 && (
            <div className="mt-2 text-xs text-zinc-500">
              (Unplaced data available; showing only core plan/notes/checkpoints here.)
            </div>
          )}

          <br />
        </header>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {semesterList.map(s => {
            const semCourses = courses.filter(c => c.semester === s.id);
            const semNotes = semestersMeta[s.id]?.notes || [];
            const semChecks = semestersMeta[s.id]?.checkpoints || [];
            const credits = totals.bySemester.get(s.id) || 0;

            return (
              <SemesterContainer
                key={s.id}
                semester={s}
                courses={semCourses}
                semesterCredits={credits}
                notes={semNotes}
                checkpoints={semChecks}
                onDropCourse={(courseId) => moveCourse(courseId, s.id)}
              >
                {semCourses.map(course => (
                  <ClassCard
                    key={course.id}
                    course={course}
                    onChangeSemester={(sem) => moveCourse(course.id, sem)}
                    semesterList={semesterList}
                  />
                ))}
              </SemesterContainer>
            );
          })}
        </div>

        {/* JSON Preview for Development */}
        <JsonPreview
          courses={courses}
          semestersMeta={semestersMeta}
          termsPlanned={termsPlanned}
          headerTitle={headerTitle}
          leftovers={leftovers}
        />
      </div>
    </section>
  );
}

/* =========================================================
   Component: StartDialog
   ========================================================= */

function StartDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onUploadClick = () => fileInputRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = () => onClose();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 w-[92vw] max-w-xl rounded-2xl bg-white !p-8 shadow-2xl ring-1 ring-zinc-200">
        <h2 className="text-2xl font-semibold tracking-tight">Start planning</h2>

        <p className="text-zinc-600 mt-3 mb-6 text-base leading-relaxed">
          Upload your most up-to-date transcript or continue without one.
          <span className="opacity-80"> (This is a mock—either option proceeds.)</span>
        </p>

        <div className="mt-8 grid gap-4">
          {/* Primary */}
          <Button
            fullWidth
            variant="contained"
            disableElevation
            onClick={onUploadClick}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 1.5,
              px: 2.5,
              bgcolor: '#ffffff',
              color: '#0A0A0A',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              '&:hover': {
                bgcolor: '#12F987',
                borderColor: '#12F987',
                color: '#000000',
                boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
              },
              '&:focus-visible': {
                outline: '2px solid #12F987',
                outlineOffset: '2px',
              },
            }}
          >
            Upload transcript (PDF/PNG/JPG)
          </Button>

          {/* Secondary */}
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              py: 1.5,
              px: 2.5,
              color: '#0A0A0A',
              borderColor: 'rgba(18,249,135,0.7)',
              '&:hover': {
                bgcolor: 'rgba(18,249,135,0.10)',
                borderColor: '#12F987',
              },
              '&:focus-visible': {
                outline: '2px solid #12F987',
                outlineOffset: '2px',
              },
            }}
          >
            I don’t have a transcript for this university
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Component: SemesterContainer
   ========================================================= */

function SemesterContainer({
  semester,
  courses,
  onDropCourse,
  children,
  notes,
  checkpoints,
  semesterCredits,
}: Readonly<{
  semester: { id: SemesterId; label: string };
  courses: Course[];
  onDropCourse: (courseId: string) => void;
  children: React.ReactNode;
  notes?: string[];
  checkpoints?: { action: string; conditions?: string[]; notes?: string }[];
  semesterCredits: number;
}>) {
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

/* =========================================================
   Component: ClassCard
   ========================================================= */

function ClassCard({
  course,
  onChangeSemester,
  semesterList,
}: Readonly<{
  course: Course;
  onChangeSemester: (semester: SemesterId) => void;
  semesterList: { id: SemesterId; label: string }[];
}>) {
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
        <div className="text-[13px] font-semibold tracking-tight leading-snug">
          {course.code}
        </div>
        <div className="text-[13px] text-zinc-800 leading-snug truncate">
          {course.title}
        </div>
        <div className="text-[11px] text-zinc-600 leading-snug">
          {course.credits.toFixed(1)} credits
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
      <div className="absolute bottom-3 right-3 sm:right-4 md:right-5">
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
