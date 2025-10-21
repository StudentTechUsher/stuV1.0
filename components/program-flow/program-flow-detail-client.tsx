'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramRow } from '@/types/program';
import type { ProgramRequirement, Course, ProgramRequirementsStructure } from '@/types/programRequirements';
import { getCourses, getSubRequirements } from '@/types/programRequirements';

interface ProgramFlowDetailClientProps {
  program: ProgramRow;
}

type ViewMode = 'courseFlow' | 'classic';

interface PlacedCourse {
  course: Course;
  isRequired: boolean;
  requirementDesc: string;
  x: number;
  y: number;
  id: string;
}

interface Connection {
  id: string;
  fromCourseId: string;
  toCourseId: string;
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toSide: 'top' | 'right' | 'bottom' | 'left';
}

export default function ProgramFlowDetailClient({ program }: Readonly<ProgramFlowDetailClientProps>) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('courseFlow');

  const handleBack = () => {
    router.push('/dashboard/program-flow');
  };

  const typeColors: Record<string, { bg: string; text: string; gradient: string }> = {
    major: {
      bg: 'bg-[#2196f3]',
      text: 'text-[#2196f3]',
      gradient: 'from-[#2196f3] to-[#1976d2]'
    },
    minor: {
      bg: 'bg-[#5E35B1]',
      text: 'text-[#5E35B1]',
      gradient: 'from-[#5E35B1] to-[#4527a0]'
    },
    general_ed: {
      bg: 'bg-[#FF9800]',
      text: 'text-[#FF9800]',
      gradient: 'from-[#FF9800] to-[#f57c00]'
    },
  };

  const typeKey = program.is_general_ed ? 'general_ed' : program.program_type.toLowerCase();
  const colors = typeColors[typeKey] || {
    bg: 'bg-[var(--primary)]',
    text: 'text-[var(--primary)]',
    gradient: 'from-[var(--primary)] to-[var(--hover-green)]'
  };

  // Extract all courses from requirements recursively
  const extractAllCourses = (requirements: ProgramRequirement[]): Array<{ course: Course; isRequired: boolean; requirementDesc: string }> => {
    const result: Array<{ course: Course; isRequired: boolean; requirementDesc: string }> = [];

    const processRequirement = (req: ProgramRequirement) => {
      const courses = getCourses(req);
      const subReqs = getSubRequirements(req);

      // Determine if courses are required (no choice) or elective (has choice)
      let isRequired = false;
      if (req.type === 'allOf') {
        isRequired = true; // All courses must be taken
      } else if (req.type === 'chooseNOf' && req.constraints) {
        // If n equals total courses, it's required
        const totalCourses = courses?.length || 0;
        isRequired = req.constraints.n === totalCourses;
      }

      if (courses) {
        courses.forEach(course => {
          result.push({
            course,
            isRequired,
            requirementDesc: req.description
          });
        });
      }

      if (subReqs) {
        subReqs.forEach(subReq => processRequirement(subReq));
      }

      // Handle option groups
      if (req.type === 'optionGroup' && 'options' in req) {
        req.options.forEach(option => {
          option.requirements.forEach(optReq => processRequirement(optReq));
        });
      }

      // Handle sequences
      if (req.type === 'sequence' && 'sequence' in req) {
        req.sequence.forEach(seqBlock => {
          seqBlock.courses.forEach(course => {
            result.push({
              course,
              isRequired: true, // Sequences are typically required
              requirementDesc: req.description
            });
          });
        });
      }
    };

    requirements.forEach(req => processRequirement(req));
    return result;
  };

  const requirementsData = program.requirements as unknown as ProgramRequirementsStructure | null;
  const allCourses = requirementsData?.programRequirements
    ? extractAllCourses(requirementsData.programRequirements)
    : [];

  return (
    <div className="relative space-y-6 p-4 sm:p-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="group flex items-center gap-2 font-body-semi text-sm font-semibold text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <svg
          className="h-4 w-4 transition-transform group-hover:-translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Programs
      </button>

      {/* Header Card */}
      <div className={`overflow-hidden rounded-xl bg-gradient-to-r ${colors.gradient} p-8 shadow-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-white bg-opacity-20 px-3 py-1 font-body-semi text-sm font-semibold text-white backdrop-blur-sm">
                {program.is_general_ed ? 'General Education' : program.program_type}
              </span>
              {program.version && (
                <span className="font-body-semi text-sm font-semibold text-white text-opacity-90">
                  Version {program.version}
                </span>
              )}
            </div>
            <h1 className="font-header mb-2 text-4xl font-bold text-white">
              {program.name}
            </h1>
            <div className="flex items-center gap-4 font-body text-sm text-white text-opacity-90">
              {program.created_at && (
                <span>Created {new Date(program.created_at).toLocaleDateString()}</span>
              )}
              {program.modified_at && (
                <>
                  <span>•</span>
                  <span>Updated {new Date(program.modified_at).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white bg-opacity-20 backdrop-blur-sm">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* View Mode Toggle Button Bar - Always visible */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('courseFlow')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 font-body-semi text-sm font-semibold transition-all duration-200 ${
              viewMode === 'courseFlow'
                ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Course Flow
          </button>
          <button
            type="button"
            onClick={() => setViewMode('classic')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 font-body-semi text-sm font-semibold transition-all duration-200 ${
              viewMode === 'classic'
                ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Classic View
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'courseFlow' ? (
        <CourseFlowView courses={allCourses} programName={program.name} />
      ) : (
        <ClassicView program={program} colors={colors} />
      )}
    </div>
  );
}

// Course Flow View Component
function CourseFlowView({ courses, programName }: { courses: Array<{ course: Course; isRequired: boolean; requirementDesc: string }>; programName: string }) {
  const [placedCourses, setPlacedCourses] = useState<PlacedCourse[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [dragConnectionStart, setDragConnectionStart] = useState<{ courseId: string; side: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number } | null>(null);
  const [dragConnectionEnd, setDragConnectionEnd] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const courseData = e.dataTransfer.getData('application/json');
    if (!courseData || !canvasRef.current) return;

    const parsedData = JSON.parse(courseData);
    const rect = canvasRef.current.getBoundingClientRect();

    // Calculate position relative to canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPlacedCourse: PlacedCourse = {
      ...parsedData,
      x,
      y,
      id: `${parsedData.course.code}-${Date.now()}`
    };

    setPlacedCourses(prev => [...prev, newPlacedCourse]);
  };

  const handleRemoveCourse = (id: string) => {
    setPlacedCourses(prev => prev.filter(c => c.id !== id));
    // Also remove any connections involving this course
    setConnections(prev => prev.filter(conn => conn.fromCourseId !== id && conn.toCourseId !== id));
  };

  const handleUpdateCoursePosition = (id: string, x: number, y: number) => {
    setPlacedCourses(prev =>
      prev.map(c => (c.id === id ? { ...c, x, y } : c))
    );
  };

  const handleConnectionDragStart = (courseId: string, side: 'top' | 'right' | 'bottom' | 'left', x: number, y: number) => {
    setIsDraggingConnection(true);
    setDragConnectionStart({ courseId, side, x, y });
    setDragConnectionEnd({ x, y });
  };

  const handleConnectionDragMove = (e: MouseEvent) => {
    if (!isDraggingConnection || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDragConnectionEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleConnectionDragEnd = (targetCourseId?: string, targetSide?: 'top' | 'right' | 'bottom' | 'left') => {
    if (isDraggingConnection && dragConnectionStart && targetCourseId && targetSide) {
      // Create a new connection
      const newConnection: Connection = {
        id: `${dragConnectionStart.courseId}-${targetCourseId}-${Date.now()}`,
        fromCourseId: dragConnectionStart.courseId,
        toCourseId: targetCourseId,
        fromSide: dragConnectionStart.side,
        toSide: targetSide
      };
      setConnections(prev => [...prev, newConnection]);
    }

    setIsDraggingConnection(false);
    setDragConnectionStart(null);
    setDragConnectionEnd(null);
  };

  // Mouse move listener for connection dragging
  useEffect(() => {
    if (isDraggingConnection) {
      document.addEventListener('mousemove', handleConnectionDragMove);
      return () => {
        document.removeEventListener('mousemove', handleConnectionDragMove);
      };
    }
  }, [isDraggingConnection]);

  // Log course_flow JSON structure whenever connections change
  useEffect(() => {
    const courseFlowData = {
      courses: placedCourses.map(pc => ({
        id: pc.id,
        courseCode: pc.course.code,
        courseTitle: pc.course.title,
        position: { x: pc.x, y: pc.y },
        isRequired: pc.isRequired
      })),
      connections: connections.map(conn => ({
        from: placedCourses.find(c => c.id === conn.fromCourseId)?.course.code,
        to: placedCourses.find(c => c.id === conn.toCourseId)?.course.code,
        fromSide: conn.fromSide,
        toSide: conn.toSide
      }))
    };

    console.log('📊 Course Flow JSON:', JSON.stringify(courseFlowData, null, 2));
  }, [placedCourses, connections]);

  // Filter out courses that are already placed on canvas
  const availableCourses = courses.filter(
    course => !placedCourses.some(placed => placed.course.code === course.course.code)
  );

  // Helper function to get connection point coordinates for a course
  const getConnectionPoint = (course: PlacedCourse, side: 'top' | 'right' | 'bottom' | 'left') => {
    const cardWidth = 200;
    const cardHeight = 80;

    switch (side) {
      case 'top':
        return { x: course.x + cardWidth / 2, y: course.y };
      case 'right':
        return { x: course.x + cardWidth, y: course.y + cardHeight / 2 };
      case 'bottom':
        return { x: course.x + cardWidth / 2, y: course.y + cardHeight };
      case 'left':
        return { x: course.x, y: course.y + cardHeight / 2 };
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white px-6 py-4">
          <h2 className="font-header-semi text-xl font-semibold text-[var(--foreground)]">
            Course Flow - {programName}
          </h2>
          <p className="mt-1 font-body text-sm text-[var(--muted-foreground)]">
            Drag courses from the right panel to build your program flow
          </p>
        </div>

        <div className="flex min-h-[1800px] p-6">
          {/* Left side - Canvas area */}
          <div
            ref={canvasRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex-1 rounded-lg border-2 transition-all duration-200 ${
              isDraggingOver
                ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                : placedCourses.length > 0
                ? 'border-[var(--border)] bg-[var(--background)]'
                : 'border-dashed border-[var(--border)] bg-white'
            }`}
          >
            {/* SVG layer for connections */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
              {/* Render existing connections */}
              {connections.map(conn => {
                const fromCourse = placedCourses.find(c => c.id === conn.fromCourseId);
                const toCourse = placedCourses.find(c => c.id === conn.toCourseId);
                if (!fromCourse || !toCourse) return null;

                const fromPoint = getConnectionPoint(fromCourse, conn.fromSide);
                const toPoint = getConnectionPoint(toCourse, conn.toSide);

                return (
                  <g key={conn.id}>
                    <line
                      x1={fromPoint.x}
                      y1={fromPoint.y}
                      x2={toPoint.x}
                      y2={toPoint.y}
                      stroke="var(--primary)"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}

              {/* Render dragging connection */}
              {isDraggingConnection && dragConnectionStart && dragConnectionEnd && (
                <line
                  x1={dragConnectionStart.x}
                  y1={dragConnectionStart.y}
                  x2={dragConnectionEnd.x}
                  y2={dragConnectionEnd.y}
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead)"
                />
              )}

              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--primary)" />
                </marker>
              </defs>
            </svg>

            {placedCourses.length === 0 ? (
              // Empty state - show message
              isDraggingOver ? (
                <div className="flex h-full items-center justify-center p-8">
                  <div className="text-center">
                    <svg className="mx-auto mb-4 h-16 w-16 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="font-body-semi text-sm font-semibold text-[var(--primary)]">
                      Drop course here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-8">
                  <div className="text-center">
                    <svg className="mx-auto mb-4 h-16 w-16 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="font-body text-sm text-[var(--muted-foreground)]">
                      Drag courses here to create your flow diagram
                    </p>
                  </div>
                </div>
              )
            ) : (
              // Render placed courses (always visible, even when dragging over)
              placedCourses.map(placedCourse => (
                <PlacedCourseCard
                  key={placedCourse.id}
                  placedCourse={placedCourse}
                  onRemove={handleRemoveCourse}
                  onUpdatePosition={handleUpdateCoursePosition}
                  onConnectionDragStart={handleConnectionDragStart}
                  onConnectionDragEnd={handleConnectionDragEnd}
                  canvasRef={canvasRef}
                />
              ))
            )}
          </div>

          {/* Right side - Course cards */}
          <div className="w-80 space-y-3 overflow-y-auto pl-6" style={{ maxHeight: '1800px' }}>
            <h3 className="font-header-semi sticky top-0 bg-white pb-2 text-lg font-semibold text-[var(--foreground)]">
              Courses ({availableCourses.length})
            </h3>

            {availableCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="mb-3 h-12 w-12 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-body text-sm text-[var(--muted-foreground)]">
                  {courses.length === 0 ? 'No courses defined in requirements' : 'All courses placed on canvas'}
                </p>
              </div>
            ) : (
              availableCourses.map((item, index) => (
                <DraggableCourseCard
                  key={`${item.course.code}-${index}`}
                  course={item.course}
                  isRequired={item.isRequired}
                  requirementDesc={item.requirementDesc}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Draggable Course Card Component (in right panel)
function DraggableCourseCard({ course, isRequired, requirementDesc }: { course: Course; isRequired: boolean; requirementDesc: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    const data = JSON.stringify({ course, isRequired, requirementDesc });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.effectAllowed = 'copy';

    // Create a custom drag image from the card element to avoid fading
    if (cardRef.current) {
      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-1000px';
      clone.style.opacity = '1';
      document.body.appendChild(clone);
      e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY);

      // Clean up the clone after drag starts
      setTimeout(() => {
        document.body.removeChild(clone);
      }, 0);
    }
  };

  // Red for required (no choice), friendly green for elective (has choice)
  const cardStyles = isRequired
    ? {
        bg: 'bg-[#fee2e2]',
        border: 'border-[#ef4444]',
        titleText: 'text-[#991b1b]',
        bodyText: 'text-[#7f1d1d]',
        badge: 'bg-[#ef4444] text-white',
        infoBg: 'bg-[#fecaca]',
        infoText: 'text-[#7f1d1d]'
      }
    : {
        bg: 'bg-[#d1fae5]',
        border: 'border-[#10b981]',
        titleText: 'text-[#065f46]',
        bodyText: 'text-[#064e3b]',
        badge: 'bg-[#10b981] text-white',
        infoBg: 'bg-[#a7f3d0]',
        infoText: 'text-[#064e3b]'
      };

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      className={`cursor-move overflow-hidden rounded-lg border-2 ${cardStyles.border} ${cardStyles.bg} p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className={`font-header-semi text-base font-semibold ${cardStyles.titleText}`}>
          {course.code}
        </h4>
        <span className={`flex-shrink-0 rounded-full ${cardStyles.badge} px-2 py-0.5 font-mono text-xs font-semibold`}>
          {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
        </span>
      </div>

      <p className={`mb-3 font-body text-sm ${cardStyles.bodyText}`}>
        {course.title}
      </p>

      <div className="space-y-2">
        <div className={`rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs font-semibold ${cardStyles.infoText}`}>
          {isRequired ? '🔒 Required' : '✓ Elective'}
        </div>

        {course.prerequisite && (
          <div className={`rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs ${cardStyles.infoText}`}>
            <span className="font-semibold">Prereq:</span> {course.prerequisite}
          </div>
        )}

        {course.terms && course.terms.length > 0 && (
          <div className={`rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs ${cardStyles.infoText}`}>
            <span className="font-semibold">Offered:</span> {course.terms.join(', ')}
          </div>
        )}

        <div className={`flex items-center justify-between rounded ${cardStyles.infoBg} px-2 py-1 font-body text-xs italic ${cardStyles.infoText}`}>
          <span className="flex-1">{requirementDesc}</span>
          <svg className="ml-2 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Placed Course Card Component (on canvas)
function PlacedCourseCard({
  placedCourse,
  onRemove,
  onUpdatePosition,
  onConnectionDragStart,
  onConnectionDragEnd,
  canvasRef
}: {
  placedCourse: PlacedCourse;
  onRemove: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onConnectionDragStart: (courseId: string, side: 'top' | 'right' | 'bottom' | 'left', x: number, y: number) => void;
  onConnectionDragEnd: (targetCourseId?: string, targetSide?: 'top' | 'right' | 'bottom' | 'left') => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}) {
  const { course, isRequired, x, y, id } = placedCourse;
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const cardStyles = isRequired
    ? {
        bg: 'bg-[#fee2e2]',
        border: 'border-[#ef4444]',
        titleText: 'text-[#991b1b]',
        badge: 'bg-[#ef4444] text-white',
      }
    : {
        bg: 'bg-[#d1fae5]',
        border: 'border-[#10b981]',
        titleText: 'text-[#065f46]',
        badge: 'bg-[#10b981] text-white',
      };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking the remove button or connection dots
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).classList.contains('connection-dot')) return;

    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left - x,
      y: e.clientY - rect.top - y
    });
  };

  const handleDotMouseDown = (e: React.MouseEvent, side: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const cardWidth = 200;
    const cardHeight = 80;

    let dotX = x;
    let dotY = y;

    switch (side) {
      case 'top':
        dotX = x + cardWidth / 2;
        dotY = y;
        break;
      case 'right':
        dotX = x + cardWidth;
        dotY = y + cardHeight / 2;
        break;
      case 'bottom':
        dotX = x + cardWidth / 2;
        dotY = y + cardHeight;
        break;
      case 'left':
        dotX = x;
        dotY = y + cardHeight / 2;
        break;
    }

    onConnectionDragStart(id, side, dotX, dotY);
  };

  const handleDotMouseUp = (e: React.MouseEvent, side: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    onConnectionDragEnd(id, side);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    // Keep within canvas bounds
    const cardWidth = 200;
    const cardHeight = 80; // Approximate height
    const boundedX = Math.max(0, Math.min(newX, rect.width - cardWidth));
    const boundedY = Math.max(0, Math.min(newY, rect.height - cardHeight));

    onUpdatePosition(id, boundedX, boundedY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute overflow-visible rounded-lg border-2 ${cardStyles.border} ${cardStyles.bg} p-3 shadow-md transition-shadow ${
        isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:shadow-lg'
      }`}
      style={{ left: `${x}px`, top: `${y}px`, width: '200px', userSelect: 'none', zIndex: 1 }}
    >
      <button
        onClick={() => onRemove(id)}
        className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white bg-opacity-80 text-[var(--muted-foreground)] transition-colors hover:bg-red-500 hover:text-white"
        title="Remove course"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Connection dots on each side */}
      {/* Top dot */}
      <div
        className="connection-dot absolute left-1/2 -top-2 h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border-2 border-[var(--primary)] bg-white transition-all hover:scale-125 hover:bg-[var(--primary)]"
        onMouseDown={(e) => handleDotMouseDown(e, 'top')}
        onMouseUp={(e) => handleDotMouseUp(e, 'top')}
        title="Connect from top"
      />

      {/* Right dot */}
      <div
        className="connection-dot absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer rounded-full border-2 border-[var(--primary)] bg-white transition-all hover:scale-125 hover:bg-[var(--primary)]"
        onMouseDown={(e) => handleDotMouseDown(e, 'right')}
        onMouseUp={(e) => handleDotMouseUp(e, 'right')}
        title="Connect from right"
      />

      {/* Bottom dot */}
      <div
        className="connection-dot absolute bottom-0 left-1/2 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-pointer rounded-full border-2 border-[var(--primary)] bg-white transition-all hover:scale-125 hover:bg-[var(--primary)]"
        onMouseDown={(e) => handleDotMouseDown(e, 'bottom')}
        onMouseUp={(e) => handleDotMouseUp(e, 'bottom')}
        title="Connect from bottom"
      />

      {/* Left dot */}
      <div
        className="connection-dot absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-pointer rounded-full border-2 border-[var(--primary)] bg-white transition-all hover:scale-125 hover:bg-[var(--primary)]"
        onMouseDown={(e) => handleDotMouseDown(e, 'left')}
        onMouseUp={(e) => handleDotMouseUp(e, 'left')}
        title="Connect from left"
      />

      <div className="mb-2 flex items-start justify-between gap-2 pr-4">
        <h4 className={`font-header-semi text-sm font-semibold ${cardStyles.titleText}`}>
          {course.code}
        </h4>
        <span className={`flex-shrink-0 rounded-full ${cardStyles.badge} px-1.5 py-0.5 font-mono text-xs font-semibold`}>
          {course.credits}
        </span>
      </div>

      <p className={`font-body text-xs ${cardStyles.titleText}`}>
        {course.title}
      </p>
    </div>
  );
}

// Classic View Component (original requirements view)
function ClassicView({ program, colors }: { program: ProgramRow; colors: { bg: string; text: string; gradient: string } }) {
  return (
    <div className="space-y-6">
      {/* Requirements Section */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
        <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white px-6 py-4">
          <h2 className="font-header-semi text-xl font-semibold text-[var(--foreground)]">
            Program Requirements
          </h2>
        </div>
        <div className="p-6">
          {program.requirements ? (
            <div className="space-y-4">
              <pre className="overflow-x-auto rounded-lg bg-[var(--background)] p-4 font-mono text-sm text-[var(--foreground)]">
                {JSON.stringify(program.requirements, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="font-body text-sm text-[var(--muted-foreground)]">
                No requirements defined for this program yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Program Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Metadata Card */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white px-6 py-4">
            <h3 className="font-header-semi text-lg font-semibold text-[var(--foreground)]">
              Program Metadata
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)] p-6">
            <div className="flex justify-between py-3">
              <span className="font-body-semi text-sm font-semibold text-[var(--muted-foreground)]">Program ID</span>
              <span className="font-mono text-sm text-[var(--foreground)]">{program.id}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-body-semi text-sm font-semibold text-[var(--muted-foreground)]">Type</span>
              <span className={`font-body-semi text-sm font-semibold ${colors.text}`}>
                {program.is_general_ed ? 'General Education' : program.program_type}
              </span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-body-semi text-sm font-semibold text-[var(--muted-foreground)]">Version</span>
              <span className="font-body text-sm text-[var(--foreground)]">{program.version || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-body-semi text-sm font-semibold text-[var(--muted-foreground)]">University ID</span>
              <span className="font-mono text-sm text-[var(--foreground)]">{program.university_id}</span>
            </div>
          </div>
        </div>

        {/* Statistics Card (Placeholder) */}
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white px-6 py-4">
            <h3 className="font-header-semi text-lg font-semibold text-[var(--foreground)]">
              Program Statistics
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="mb-3 h-12 w-12 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="font-body text-sm text-[var(--muted-foreground)]">
                Statistics data will be displayed here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
