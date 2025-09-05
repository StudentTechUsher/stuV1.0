"use client"

import { useRef, useState } from "react"
import Button from "@mui/material/Button";

type SemesterId = 1|2|3|4|5|6|7|8

type Course = {
  id: string
  code: string
  title: string
  credits: number
  requirement: string
  semester: SemesterId
}

const INITIAL_COURSES: Course[] = [
  { id: "c1", code: "IS 101", title: "Intro to Information Systems", credits: 3, requirement: "Major Core 1.1", semester: 1 },
  { id: "c2", code: "MATH 110", title: "Calculus I", credits: 4, requirement: "Gen Ed: Math", semester: 1 },
  { id: "c3", code: "ENG 101", title: "Composition", credits: 3, requirement: "Gen Ed: Writing", semester: 1 },
  { id: "c4", code: "CS 120", title: "Programming Fundamentals", credits: 3, requirement: "Major Core 1.2", semester: 2 },
  { id: "c5", code: "HIST 210", title: "World History", credits: 3, requirement: "Gen Ed: Humanities", semester: 2 },
  { id: "c6", code: "IS 220", title: "Data & Databases", credits: 3, requirement: "Major Core 2.1", semester: 3 },
  { id: "c7", code: "STAT 201", title: "Statistics", credits: 3, requirement: "Gen Ed: Quant", semester: 3 },
  { id: "c8", code: "IS 404", title: "Networking Basics", credits: 3, requirement: "Major Req 1.3", semester: 4 },
  { id: "c9", code: "ELECT 200", title: "Open Elective", credits: 3, requirement: "Elective", semester: 4 },
  { id: "c10", code: "CS 240", title: "Data Structures", credits: 3, requirement: "Major Core 2.2", semester: 5 },
]

// ---- Chip theming (keys match your existing labels) ----
type ChipTheme = { base: string; text: string };

// allow "12f987" or "#12F987"
const asHex = (h: string) => (h.startsWith("#") ? h : `#${h}`);
// add alpha to 6-digit hex: RRGGBB + AA
const withAlpha = (hex6: string, aa: string) => `${asHex(hex6)}${aa}`;

// your colors
const CHIP_THEMES: Record<"default"|"major"|"minor"|"ge"|"elective", ChipTheme> = {
  default : { base: "#E5E7EB", text: "#0A0A0A" },
  major   : { base: "#12F987", text: "#0A0A0A" }, // Major
  minor   : { base: "#02174C", text: "#FFFFFF" }, // Minor (dark base -> white text)
  ge      : { base: "#FF3508", text: "#0A0A0A" }, // Gen Ed
  elective: { base: "#AC11FA", text: "#0A0A0A" }, // Elective
};

// map requirement text -> theme based on your current strings
function chipThemeFor(req: string): ChipTheme {
  const r = req.toLowerCase().trim();
  if (r.startsWith("major core") || r.startsWith("major req") || r.startsWith("major "))
    return CHIP_THEMES.major;
  if (r.startsWith("gen ed:")) return CHIP_THEMES.ge;
  if (r.includes("elective")) return CHIP_THEMES.elective;
  if (r.startsWith("minor")) return CHIP_THEMES.minor;
  return CHIP_THEMES.default;
}

const SEMESTERS: { id: SemesterId; label: string }[] = [
  { id: 1, label: "Semester 1" },
  { id: 2, label: "Semester 2" },
  { id: 3, label: "Semester 3" },
  { id: 4, label: "Semester 4" },
  { id: 5, label: "Semester 5" },
  { id: 6, label: "Semester 6" },
  { id: 7, label: "Semester 7" },
  { id: 8, label: "Semester 8" },
]

export default function FourYearPlanner() {
  const [showStart, setShowStart] = useState(true)
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES)

  const moveCourse = (courseId: string, toSemester: SemesterId) => {
    setCourses(prev =>
      prev.map(c => (c.id === courseId ? { ...c, semester: toSemester } : c))
    )
  }

  return (
    <section className="relative py-10">
      {/* Start dialog (mocked) */}
      {showStart && <StartDialog onClose={() => setShowStart(false)} />}

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <header className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Four-Year Planning Assistant (PoC)
          </h1>
          <p className="text-zinc-600 mt-0.5 text-sm">
            Drag classes between semesters or use the dropdown to reassign.
          </p>
          <br />
        </header>

        {/* Responsive grid: 2 / 3 / 4 columns with compact gaps */}
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SEMESTERS.map(s => (
            <SemesterContainer
              key={s.id}
              semester={s}
              courses={courses.filter(c => c.semester === s.id)}
              onDropCourse={(courseId) => moveCourse(courseId, s.id)}
            >
              {courses
                .filter(c => c.semester === s.id)
                .map(course => (
                  <ClassCard
                    key={course.id}
                    course={course}
                    onChangeSemester={(sem) => moveCourse(course.id, sem)}
                  />
                ))}
            </SemesterContainer>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------ Start Dialog (bigger + green buttons) ------------------------ */
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
            {/* Primary — white by default, brand green on hover */}
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
                border: '1px solid #e5e7eb',    // light border like your design
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

            {/* Secondary — outlined, clearly a button, subtle green hover */}
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

            {/* Keep your hidden file input */}
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

/* ------------------------ Semester Container ------------------------ */

function SemesterContainer({
  semester,
  courses,
  onDropCourse,
  children,
}: Readonly<{
  semester: { id: SemesterId; label: string }
  courses: Course[]
  onDropCourse: (courseId: string) => void
  children: React.ReactNode
}>) {
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
  }
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const courseId = e.dataTransfer.getData("text/plain")
    if (courseId) onDropCourse(courseId)
  }

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0)

  return (
    <section
      className="
        rounded-xl bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
        ring-1 ring-zinc-200 shadow-sm
        p-4 sm:p-5
        min-h-[240px]
      "
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label={semester.label}
    >
      <header className="flex items-center justify-between !px-3 sm:!px-3">
        <h3 className="text-sm font-semibold tracking-tight">{semester.label}</h3>
        <span className="text-[11px] text-zinc-600">
         {courses.length} class{courses.length !== 1 ? "es" : ""} • {totalCredits} {totalCredits === 1 ? "credit" : "credits"}
        </span>
      </header>

      <div className="mt-4 grid gap-4">
        {children}
        {courses.length === 0 && (
          <div
            className="
              rounded-md border border-dashed border-zinc-300 text-zinc-500
              py-6 text-center text-sm
            "
          >
            Drag a class here or use the dropdown on a class card.
          </div>
        )}
      </div>
    </section>
  )
}

/* ------------------------ Class Card ------------------------ */
function ClassCard({
  course,
  onChangeSemester,
}: Readonly<{
  course: Course;
  onChangeSemester: (semester: SemesterId) => void;
}>) {
  const handleDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.dataTransfer.setData("text/plain", course.id);
    e.dataTransfer.effectAllowed = "move";
  };

  // ✅ This must be INSIDE the component, so `course` is in scope
  const theme = chipThemeFor(course.requirement);

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

      {/* requirement chip (colored by theme) */}
      <span
        className="absolute bottom-3 left-4 inline-flex items-center rounded-full
                  text-[11px] leading-none select-none border
                  max-w-[65%] truncate whitespace-nowrap
                  !px-4 !py-2"   /* Tailwind-only padding with ! to force it */
        style={{
          backgroundColor: withAlpha(theme.base, "66"),
          borderColor:     withAlpha(theme.base, "99"), 
          color:           theme.text,
        }}
        title={course.requirement}
      >
        {course.requirement}
      </span>

      {/* semester select */}
      <div className="absolute bottom-3 right-3 sm:right-4 md:right-5">
        <label className="sr-only" htmlFor={`sem-${course.id}`}>
          Semester
        </label>
        <select
          id={`sem-${course.id}`}
          value={course.semester}
          onChange={(e) =>
            onChangeSemester(Number(e.target.value) as SemesterId)
          }
          className="
            rounded-md border border-zinc-300 bg-white text-sm
            px-3 py-1.5 shadow-xs hover:border-zinc-400
            focus:outline-none focus:ring-2 focus:ring-primary
          "
        >
          {SEMESTERS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
