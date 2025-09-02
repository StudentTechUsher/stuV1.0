"use client"

import { useRef, useState } from "react"

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

      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Four-Year Planning Assistant (PoC)
          </h1>
          <p className="text-zinc-600 mt-1">
            Drag classes between semesters or use the dropdown to reassign.
          </p>
        </header>

        {/* 2 columns on lg, 1 on mobile/tablet */}
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
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

/* ------------------------ Start Dialog (mock) ------------------------ */

function StartDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const onUploadClick = () => {
    // For PoC: we just close when a file is selected; no parsing
    fileInputRef.current?.click()
  }

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-[92vw] max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200">
        <h2 className="text-xl font-semibold">Start planning</h2>
        <p className="text-zinc-600 mt-2">
          Upload your most up-to-date transcript or continue without one.
          (This is a mock—either option proceeds.)
        </p>

        <div className="mt-5 grid gap-3">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center justify-center rounded-lg bg-primary text-foreground px-4 py-2.5 text-sm font-medium shadow-sm ring-1 ring-primary/30 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Upload transcript (PDF/PNG/JPG)
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg bg-white text-foreground px-4 py-2.5 text-sm font-medium ring-1 ring-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            I don’t have a transcript for this university
          </button>
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
  )
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

  // Totals for flavor (optional)
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0)

  return (
    <section
      className="
        rounded-2xl bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
        ring-1 ring-zinc-200 shadow-sm
        p-4 sm:p-6
        min-h-[280px]
      "
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label={semester.label}
    >
      <header className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{semester.label}</h3>
        <span className="text-xs text-zinc-600">
          {courses.length} class{courses.length !== 1 ? "es" : ""} • {totalCredits} cr
        </span>
      </header>

      <div className="mt-4 grid gap-3">
        {children}
        {courses.length === 0 && (
          <div
            className="
              rounded-lg border border-dashed border-zinc-300 text-zinc-500
              py-8 text-center text-sm
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
  course: Course
  onChangeSemester: (semester: SemesterId) => void
}>) {
  const handleDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.dataTransfer.setData("text/plain", course.id)
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <div
      className="
        group relative rounded-xl bg-white
        shadow-sm ring-1 ring-zinc-200
        p-4
        hover:shadow-md hover:ring-zinc-300 transition-all
        cursor-grab active:cursor-grabbing
      "
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      aria-label={`${course.code} ${course.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          // Optionally trigger drag or focus logic here
          e.preventDefault();
        }
      }}
      onClick={() => {
        // Optionally trigger focus or selection logic here
      }}
      onTouchStart={() => {
        // Optionally trigger drag or selection logic for touch devices
      }}
    >
      <div className="space-y-1.5">
        <div className="text-sm font-semibold tracking-tight">{course.code}</div>
        <div className="text-zinc-800">{course.title}</div>
        <div className="text-xs text-zinc-600">{course.credits.toFixed(1)} credits</div>
      </div>

      {/* bottom-left requirement chip */}
      <span
        className="
          absolute bottom-3 left-3 inline-flex items-center
          rounded-full bg-zinc-100 text-zinc-700 text-[11px] px-2.5 py-1
          ring-1 ring-zinc-200
        "
      >
        {course.requirement}
      </span>

      {/* bottom-right semester selector */}
      <div className="absolute bottom-2 right-2">
        <label className="sr-only" htmlFor={`sem-${course.id}`}>Semester</label>
        <select
          id={`sem-${course.id}`}
          value={course.semester}
          onChange={(e) => onChangeSemester(Number(e.target.value) as SemesterId)}
          className="
            rounded-md border border-zinc-300 bg-white text-sm
            px-2.5 py-1.5
            shadow-xs
            hover:border-zinc-400
            focus:outline-none focus:ring-2 focus:ring-primary
          "
        >
          {SEMESTERS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
