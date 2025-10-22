'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramRow } from '@/types/program';
import type { ProgramRequirement, Course, ProgramRequirementsStructure } from '@/types/programRequirements';
import { getCourses, getSubRequirements } from '@/types/programRequirements';
import { saveCourseFlowMinor, saveCourseFlowMajor, type CourseFlowData } from '@/lib/services/programService';

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

type RelationshipType = 'prerequisite' | 'corequisite' | 'optional_prereq' | 'concurrent' | 'either_or';

interface ConnectionNode {
  id: string;
  x: number;
  y: number;
  requiredCount: number; // How many of the connected courses are required
}

interface Connection {
  id: string;
  fromCourseId: string;
  toCourseId: string | null; // null if connecting to a connection node
  toNodeId: string | null; // ID of connection node if applicable
  fromSide: 'top' | 'right' | 'bottom' | 'left';
  toSide: 'top' | 'right' | 'bottom' | 'left';
  relationshipType?: RelationshipType;
}

export default function ProgramFlowDetailClient({ program }: Readonly<ProgramFlowDetailClientProps>) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('courseFlow');

  // Shared state for course flow that persists across view changes
  const [placedCourses, setPlacedCourses] = useState<PlacedCourse[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionNodes, setConnectionNodes] = useState<ConnectionNode[]>([]);

  // Save state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleBack = () => {
    router.push('/dashboard/program-flow');
  };

  const handleSave = async (isMajorVersion: boolean) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Prepare the course flow data
      const flowData: CourseFlowData = {
        courses: placedCourses.map(pc => ({
          id: pc.id,
          courseCode: pc.course.code,
          courseTitle: pc.course.title,
          position: { x: pc.x, y: pc.y },
          isRequired: pc.isRequired,
          requirementDesc: pc.requirementDesc
        })),
        connections: connections.map(conn => ({
          id: conn.id,
          fromCourseId: conn.fromCourseId,
          toCourseId: conn.toCourseId,
          toNodeId: conn.toNodeId,
          fromSide: conn.fromSide,
          toSide: conn.toSide,
          relationshipType: conn.relationshipType
        })),
        connectionNodes: connectionNodes.map(node => ({
          id: node.id,
          x: node.x,
          y: node.y,
          requiredCount: node.requiredCount
        }))
      };

      // Save based on version type
      if (isMajorVersion) {
        await saveCourseFlowMajor(program.id, flowData);
      } else {
        await saveCourseFlowMinor(program.id, flowData);
      }

      setSaveSuccess(true);
      setShowSaveDialog(false);

      // Refresh the page to show updated version
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error('Failed to save course flow:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save course flow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSave = async () => {
    // Quick save always does minor version
    await handleSave(false);
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

      {/* View Mode Toggle and Save Buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* View Mode Toggle */}
        <div className="flex-1 flex items-center justify-center">
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

        {/* Save Buttons - only show if there are placed courses */}
        {placedCourses.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm font-semibold text-white transition-all hover:bg-[var(--hover-green)] disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm font-semibold text-[var(--foreground)] transition-all hover:bg-[var(--background)] disabled:opacity-50"
            >
              Save As...
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="font-body-semi text-sm font-semibold text-green-800">
            ✓ Course flow saved successfully!
          </p>
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-body-semi text-sm font-semibold text-red-800">
            Error: {saveError}
          </p>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'courseFlow' ? (
        <CourseFlowView
          courses={allCourses}
          programName={program.name}
          placedCourses={placedCourses}
          setPlacedCourses={setPlacedCourses}
          connections={connections}
          setConnections={setConnections}
          connectionNodes={connectionNodes}
          setConnectionNodes={setConnectionNodes}
        />
      ) : (
        <ClassicView
          _program={program}
          colors={colors}
          courses={allCourses}
        />
      )}

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 font-header text-2xl font-bold text-[var(--foreground)]">
              Save Course Flow
            </h2>
            <p className="mb-6 font-body text-sm text-[var(--muted-foreground)]">
              Choose how you want to save your changes:
            </p>

            <div className="space-y-4">
              {/* Minor Version Option */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="w-full rounded-lg border-2 border-[var(--primary)] bg-white p-4 text-left transition-all hover:bg-[var(--primary)] hover:bg-opacity-5 disabled:opacity-50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-body-semi text-lg font-semibold text-[var(--foreground)]">
                    Minor Update
                  </span>
                  <span className="rounded-full bg-[var(--primary)] bg-opacity-10 px-3 py-1 font-body-semi text-xs font-semibold text-[var(--primary)]">
                    +0.1
                  </span>
                </div>
                <p className="font-body text-sm text-[var(--muted-foreground)]">
                  Small changes, bug fixes, or refinements. Updates the current version.
                </p>
              </button>

              {/* Major Version Option */}
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="w-full rounded-lg border-2 border-[var(--primary)] bg-white p-4 text-left transition-all hover:bg-[var(--primary)] hover:bg-opacity-5 disabled:opacity-50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-body-semi text-lg font-semibold text-[var(--foreground)]">
                    Major Update
                  </span>
                  <span className="rounded-full bg-[var(--primary)] px-3 py-1 font-body-semi text-xs font-semibold text-white">
                    +1.0
                  </span>
                </div>
                <p className="font-body text-sm text-[var(--muted-foreground)]">
                  Significant changes or new requirements. Creates a new version.
                </p>
              </button>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowSaveDialog(false)}
              disabled={isSaving}
              className="mt-4 w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2 font-body-semi text-sm font-semibold text-[var(--muted-foreground)] transition-all hover:bg-[var(--background)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Course Flow View Component
function CourseFlowView({
  courses,
  programName,
  placedCourses,
  setPlacedCourses,
  connections,
  setConnections,
  connectionNodes,
  setConnectionNodes
}: {
  courses: Array<{ course: Course; isRequired: boolean; requirementDesc: string }>;
  programName: string;
  placedCourses: PlacedCourse[];
  setPlacedCourses: React.Dispatch<React.SetStateAction<PlacedCourse[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  connectionNodes: ConnectionNode[];
  setConnectionNodes: React.Dispatch<React.SetStateAction<ConnectionNode[]>>;
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [dragConnectionStart, setDragConnectionStart] = useState<{ courseId: string; side: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number; fromNodeId?: string } | null>(null);
  const [dragConnectionEnd, setDragConnectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ fromCourseId: string; toCourseId: string | null; toNodeId: string | null; fromSide: 'top' | 'right' | 'bottom' | 'left'; toSide: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number; fromNodeId?: string } | null>(null);
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

  const handleConnectionDragStart = (courseId: string, side: 'top' | 'right' | 'bottom' | 'left', x: number, y: number, fromNodeId?: string) => {
    setIsDraggingConnection(true);
    setDragConnectionStart({ courseId, side, x, y, fromNodeId });
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

  const handleConnectionDragEnd = (targetCourseId?: string, targetSide?: 'top' | 'right' | 'bottom' | 'left', targetNodeId?: string) => {
    if (isDraggingConnection && dragConnectionStart && canvasRef.current) {
      // Connecting to a course
      if (targetCourseId && targetSide) {
        const fromCourse = placedCourses.find(c => c.id === dragConnectionStart.courseId);
        const toCourse = placedCourses.find(c => c.id === targetCourseId);

        if (fromCourse && toCourse) {
          const fromPoint = getConnectionPoint(fromCourse, dragConnectionStart.side);
          const toPoint = getConnectionPoint(toCourse, targetSide);
          const midX = (fromPoint.x + toPoint.x) / 2;
          const midY = (fromPoint.y + toPoint.y) / 2;

          // Show tooltip for relationship type selection
          setPendingConnection({
            fromCourseId: dragConnectionStart.courseId,
            toCourseId: targetCourseId,
            toNodeId: null,
            fromSide: dragConnectionStart.side,
            toSide: targetSide,
            x: midX,
            y: midY,
            fromNodeId: dragConnectionStart.fromNodeId
          });
        }
      }
      // Connecting to a connection node
      else if (targetNodeId) {
        const node = connectionNodes.find(n => n.id === targetNodeId);
        if (node) {
          setPendingConnection({
            fromCourseId: dragConnectionStart.courseId,
            toCourseId: null,
            toNodeId: targetNodeId,
            fromSide: dragConnectionStart.side,
            toSide: 'top', // Default side for node connections
            x: node.x,
            y: node.y - 40,
            fromNodeId: dragConnectionStart.fromNodeId
          });
        }
      }
    }

    setIsDraggingConnection(false);
    setDragConnectionStart(null);
    setDragConnectionEnd(null);
  };

  const handleRelationshipTypeSelect = (relationshipType: RelationshipType, requiredCount?: number, connectToNodeId?: string) => {
    if (pendingConnection) {
      // For either-or with connectToNodeId, connect the course to an existing node
      if (relationshipType === 'either_or' && connectToNodeId && pendingConnection.toCourseId) {
        const newConnection: Connection = {
          id: `${pendingConnection.toCourseId}-${connectToNodeId}-${Date.now()}`,
          fromCourseId: pendingConnection.toCourseId,
          toCourseId: null,
          toNodeId: connectToNodeId,
          fromSide: pendingConnection.toSide,
          toSide: 'right',
          relationshipType
        };
        setConnections(prev => [...prev, newConnection]);
      }
      // For either-or without connectToNodeId, create a new connection node in the middle
      else if (relationshipType === 'either_or' && pendingConnection.toCourseId) {
        const nodeId = `node-${Date.now()}`;
        const newNode: ConnectionNode = {
          id: nodeId,
          x: pendingConnection.x,
          y: pendingConnection.y,
          requiredCount: requiredCount || 1
        };
        setConnectionNodes(prev => [...prev, newNode]);

        // Create two connections: from course to node, and from node to target course
        const conn1: Connection = {
          id: `${pendingConnection.fromCourseId}-${nodeId}-${Date.now()}`,
          fromCourseId: pendingConnection.fromCourseId,
          toCourseId: null,
          toNodeId: nodeId,
          fromSide: pendingConnection.fromSide,
          toSide: 'left',
          relationshipType
        };

        const conn2: Connection = {
          id: `${nodeId}-${pendingConnection.toCourseId}-${Date.now()}`,
          fromCourseId: pendingConnection.toCourseId,
          toCourseId: null,
          toNodeId: nodeId,
          fromSide: pendingConnection.toSide,
          toSide: 'right',
          relationshipType
        };

        setConnections(prev => [...prev, conn1, conn2]);
      } else {
        // Regular connection
        const newConnection: Connection = {
          id: `${pendingConnection.fromCourseId}-${pendingConnection.toCourseId || pendingConnection.toNodeId}-${Date.now()}`,
          fromCourseId: pendingConnection.fromCourseId,
          toCourseId: pendingConnection.toCourseId,
          toNodeId: pendingConnection.toNodeId,
          fromSide: pendingConnection.fromSide,
          toSide: pendingConnection.toSide,
          relationshipType
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setPendingConnection(null);
    }
  };

  const handleCancelConnection = () => {
    setPendingConnection(null);
  };

  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    setConnectionNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, x, y } : n))
    );
  };

  const handleRemoveNode = (nodeId: string) => {
    setConnectionNodes(prev => prev.filter(n => n.id !== nodeId));
    // Remove all connections involving this node
    setConnections(prev => prev.filter(conn => conn.toNodeId !== nodeId));
  };

  const handleUpdateNodeRequiredCount = (nodeId: string, count: number) => {
    setConnectionNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, requiredCount: count } : n))
    );
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
        toSide: conn.toSide,
        relationshipType: conn.relationshipType || 'prerequisite'
      }))
    };

    console.log('📊 Course Flow JSON:', JSON.stringify(courseFlowData, null, 2));
  }, [placedCourses, connections]);

  // Helper function to get visual styles for relationship types
  const getRelationshipStyles = (type: RelationshipType = 'prerequisite') => {
    switch (type) {
      case 'prerequisite':
        return {
          color: '#2563eb', // Blue
          strokeWidth: 2,
          markerEnd: 'url(#arrowhead-prerequisite)',
          strokeDasharray: ''
        };
      case 'optional_prereq':
        return {
          color: '#8b5cf6', // Purple
          strokeWidth: 2,
          markerEnd: 'url(#arrowhead-optional)',
          strokeDasharray: ''
        };
      case 'corequisite':
        return {
          color: '#dc2626', // Red
          strokeWidth: 3,
          markerEnd: '',
          strokeDasharray: ''
        };
      case 'concurrent':
        return {
          color: '#f59e0b', // Amber
          strokeWidth: 3,
          markerEnd: '',
          strokeDasharray: '8,4'
        };
      case 'either_or':
        return {
          color: '#059669', // Emerald green
          strokeWidth: 2,
          markerEnd: '',
          strokeDasharray: ''
        };
    }
  };

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
                let toPoint;

                // Connection to a course
                if (conn.toCourseId) {
                  const toCourse = placedCourses.find(c => c.id === conn.toCourseId);
                  if (!fromCourse || !toCourse) return null;
                  toPoint = getConnectionPoint(toCourse, conn.toSide);
                }
                // Connection to a node
                else if (conn.toNodeId) {
                  const toNode = connectionNodes.find(n => n.id === conn.toNodeId);
                  if (!fromCourse || !toNode) return null;
                  toPoint = { x: toNode.x, y: toNode.y };
                } else {
                  return null;
                }

                const fromPoint = getConnectionPoint(fromCourse, conn.fromSide);
                const styles = getRelationshipStyles(conn.relationshipType);

                return (
                  <g key={conn.id}>
                    <line
                      x1={fromPoint.x}
                      y1={fromPoint.y}
                      x2={toPoint.x}
                      y2={toPoint.y}
                      stroke={styles.color}
                      strokeWidth={styles.strokeWidth}
                      strokeDasharray={styles.strokeDasharray}
                      markerEnd={styles.markerEnd}
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
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead-dragging)"
                />
              )}

              {/* Arrow marker definitions */}
              <defs>
                {/* Prerequisite arrow (blue) */}
                <marker
                  id="arrowhead-prerequisite"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
                </marker>

                {/* Optional prerequisite arrow (purple) */}
                <marker
                  id="arrowhead-optional"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
                </marker>

                {/* Dragging arrow (gray) */}
                <marker
                  id="arrowhead-dragging"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#6b7280" />
                </marker>
              </defs>
            </svg>

            {/* Relationship Type Selection Tooltip */}
            {pendingConnection && (
              <div
                className="absolute z-50 rounded-lg border-2 border-[var(--border)] bg-white p-4 shadow-2xl"
                style={{
                  left: `${pendingConnection.x}px`,
                  top: `${pendingConnection.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="mb-3">
                  <h4 className="font-header-semi text-sm font-semibold text-[var(--foreground)]">
                    Select Relationship Type
                  </h4>
                  <p className="mt-1 font-body text-xs text-[var(--muted-foreground)]">
                    Choose how these courses relate
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleRelationshipTypeSelect('prerequisite')}
                    className="flex w-full items-start gap-3 rounded-lg border-2 border-transparent bg-blue-50 p-3 text-left transition-all hover:border-blue-500 hover:shadow-sm"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-body-semi text-sm font-semibold text-blue-900">Prerequisite</div>
                      <div className="font-body text-xs text-blue-700">Must be taken before (required)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRelationshipTypeSelect('optional_prereq')}
                    className="flex w-full items-start gap-3 rounded-lg border-2 border-transparent bg-purple-50 p-3 text-left transition-all hover:border-purple-500 hover:shadow-sm"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" strokeDasharray="4,4" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-body-semi text-sm font-semibold text-purple-900">Optional Prereq</div>
                      <div className="font-body text-xs text-purple-700">Recommended to take before</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRelationshipTypeSelect('corequisite')}
                    className="flex w-full items-start gap-3 rounded-lg border-2 border-transparent bg-red-50 p-3 text-left transition-all hover:border-red-500 hover:shadow-sm"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-body-semi text-sm font-semibold text-red-900">Corequisite</div>
                      <div className="font-body text-xs text-red-700">Must be taken together (required)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleRelationshipTypeSelect('concurrent')}
                    className="flex w-full items-start gap-3 rounded-lg border-2 border-transparent bg-amber-50 p-3 text-left transition-all hover:border-amber-500 hover:shadow-sm"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" strokeDasharray="8,4" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-body-semi text-sm font-semibold text-amber-900">Concurrent</div>
                      <div className="font-body text-xs text-amber-700">Recommended to take together</div>
                    </div>
                  </button>

                  <EitherOrButton onSelect={handleRelationshipTypeSelect} existingNodes={connectionNodes} />
                </div>

                <button
                  onClick={handleCancelConnection}
                  className="mt-3 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-body-semi text-sm font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                >
                  Cancel
                </button>
              </div>
            )}

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
              // Render placed courses and connection nodes (always visible, even when dragging over)
              <>
                {placedCourses.map(placedCourse => (
                  <PlacedCourseCard
                    key={placedCourse.id}
                    placedCourse={placedCourse}
                    onRemove={handleRemoveCourse}
                    onUpdatePosition={handleUpdateCoursePosition}
                    onConnectionDragStart={handleConnectionDragStart}
                    onConnectionDragEnd={handleConnectionDragEnd}
                    canvasRef={canvasRef}
                  />
                ))}
                {connectionNodes.map(node => (
                  <ConnectionNodeCard
                    key={node.id}
                    node={node}
                    onRemove={handleRemoveNode}
                    onUpdatePosition={handleUpdateNodePosition}
                    onUpdateRequiredCount={handleUpdateNodeRequiredCount}
                    onConnectionDragStart={handleConnectionDragStart}
                    onConnectionDragEnd={handleConnectionDragEnd}
                    canvasRef={canvasRef}
                  />
                ))}
              </>
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
  canvasRef: React.RefObject<HTMLDivElement | null>;
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

// Either-Or Button Component with Required Count Input
function EitherOrButton({
  onSelect,
  existingNodes
}: {
  onSelect: (type: RelationshipType, requiredCount?: number, connectToNodeId?: string) => void;
  existingNodes: ConnectionNode[];
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [requiredCount, setRequiredCount] = useState(1);

  const handleCreateClick = () => {
    if (!showCreateInput) {
      setShowCreateInput(true);
    } else {
      onSelect('either_or', requiredCount);
      setShowOptions(false);
      setShowCreateInput(false);
      setRequiredCount(1);
    }
  };

  const handleConnectToNode = (nodeId: string) => {
    onSelect('either_or', undefined, nodeId);
    setShowOptions(false);
  };

  return (
    <div>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex w-full items-start gap-3 rounded-lg border-2 border-transparent bg-emerald-50 p-3 text-left transition-all hover:border-emerald-500 hover:shadow-sm"
      >
        <div className="mt-0.5 flex-shrink-0">
          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-body-semi text-sm font-semibold text-emerald-900">Either-Or Choice</div>
          <div className="font-body text-xs text-emerald-700">Choose N of M courses (creates connection node)</div>
        </div>
        <div className="mt-0.5">
          <svg
            className={`h-4 w-4 text-emerald-600 transition-transform ${showOptions ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {showOptions && (
        <div className="mt-2 space-y-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3">
          {/* Create New Node Option */}
          <div>
            <button
              onClick={() => setShowCreateInput(!showCreateInput)}
              className="flex w-full items-center justify-between rounded-lg border border-emerald-300 bg-white px-3 py-2 text-left transition-colors hover:bg-emerald-100"
            >
              <span className="font-body-semi text-xs font-semibold text-emerald-900">
                Create New Node
              </span>
              <svg
                className={`h-3 w-3 text-emerald-600 transition-transform ${showCreateInput ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCreateInput && (
              <div className="mt-2 rounded-lg border border-emerald-300 bg-white p-2">
                <label className="block font-body-semi text-xs font-semibold text-emerald-900 mb-1">
                  Required Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-emerald-300 px-2 py-1 font-body text-sm text-emerald-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="How many courses required?"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleCreateClick}
                    className="flex-1 rounded bg-emerald-600 px-3 py-1.5 font-body-semi text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateInput(false);
                      setRequiredCount(1);
                    }}
                    className="rounded border border-emerald-300 px-3 py-1.5 font-body-semi text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing Nodes List */}
          {existingNodes.length > 0 && (
            <div>
              <div className="mb-2 font-body-semi text-xs font-semibold text-emerald-900">
                Connect to Existing Node:
              </div>
              <div className="space-y-1">
                {existingNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleConnectToNode(node.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-emerald-300 bg-white px-3 py-2 text-left transition-colors hover:bg-emerald-100"
                  >
                    <span className="font-body text-xs text-emerald-900">
                      Node (requires {node.requiredCount})
                    </span>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-50">
                      <span className="font-body-semi text-xs font-bold text-emerald-900">
                        {node.requiredCount}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Connection Node Card Component
function ConnectionNodeCard({
  node,
  onRemove,
  onUpdatePosition,
  onUpdateRequiredCount,
  onConnectionDragStart,
  onConnectionDragEnd,
  canvasRef,
}: {
  node: ConnectionNode;
  onRemove: (id: string) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateRequiredCount: (id: string, count: number) => void;
  onConnectionDragStart: (courseId: string, side: 'top' | 'right' | 'bottom' | 'left', x: number, y: number, fromNodeId?: string) => void;
  onConnectionDragEnd: (targetCourseId?: string, targetSide?: 'top' | 'right' | 'bottom' | 'left', targetNodeId?: string) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [tempCount, setTempCount] = useState(node.requiredCount);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    if ((e.target as HTMLElement).classList.contains('connection-dot')) return;

    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    const boundedX = Math.max(20, Math.min(newX, rect.width - 20));
    const boundedY = Math.max(20, Math.min(newY, rect.height - 20));

    onUpdatePosition(node.id, boundedX, boundedY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDotMouseDown = (e: React.MouseEvent, side: 'top' | 'right' | 'bottom' | 'left') => {
    e.stopPropagation();
    onConnectionDragStart(node.id, side, node.x, node.y, node.id);
  };

  const handleDotMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionDragEnd(undefined, undefined, node.id);
  };

  const handleSaveCount = () => {
    onUpdateRequiredCount(node.id, tempCount);
    setIsEditing(false);
  };

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
      className={`absolute flex h-10 w-10 items-center justify-center rounded-full border-4 border-emerald-600 bg-white shadow-lg ${
        isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab hover:shadow-xl'
      }`}
      style={{ left: `${node.x - 20}px`, top: `${node.y - 20}px`, zIndex: 10 }}
    >
      {/* Connection dots */}
      <div
        className="connection-dot absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 cursor-pointer rounded-full border-2 border-emerald-600 bg-white transition-all hover:scale-125 hover:bg-emerald-600"
        onMouseDown={(e) => handleDotMouseDown(e, 'top')}
        onMouseUp={handleDotMouseUp}
        title="Connect"
      />
      <div
        className="connection-dot absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 cursor-pointer rounded-full border-2 border-emerald-600 bg-white transition-all hover:scale-125 hover:bg-emerald-600"
        onMouseDown={(e) => handleDotMouseDown(e, 'right')}
        onMouseUp={handleDotMouseUp}
        title="Connect"
      />
      <div
        className="connection-dot absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 cursor-pointer rounded-full border-2 border-emerald-600 bg-white transition-all hover:scale-125 hover:bg-emerald-600"
        onMouseDown={(e) => handleDotMouseDown(e, 'bottom')}
        onMouseUp={handleDotMouseUp}
        title="Connect"
      />
      <div
        className="connection-dot absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 cursor-pointer rounded-full border-2 border-emerald-600 bg-white transition-all hover:scale-125 hover:bg-emerald-600"
        onMouseDown={(e) => handleDotMouseDown(e, 'left')}
        onMouseUp={handleDotMouseUp}
        title="Connect"
      />

      <button
        onClick={() => onRemove(node.id)}
        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-red-600 transition-colors hover:bg-red-600 hover:text-white"
        title="Remove node"
      >
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {isEditing ? (
        <input
          type="number"
          min="1"
          value={tempCount}
          onChange={(e) => setTempCount(parseInt(e.target.value) || 1)}
          onBlur={handleSaveCount}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveCount();
            if (e.key === 'Escape') {
              setTempCount(node.requiredCount);
              setIsEditing(false);
            }
          }}
          className="h-6 w-6 rounded border border-emerald-600 text-center font-body-semi text-xs font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="font-body-semi text-sm font-bold text-emerald-900 hover:text-emerald-600"
          title="Click to edit required count"
        >
          {node.requiredCount}
        </button>
      )}
    </div>
  );
}

// Classic View Component - displays courses organized by requirements
function ClassicView({
  _program,
  colors,
  courses
}: {
  _program: ProgramRow;
  colors: { bg: string; text: string; gradient: string };
  courses: Array<{ course: Course; isRequired: boolean; requirementDesc: string }>;
}) {
  // Group courses by requirement description
  const groupedByRequirement = courses.reduce((acc, item) => {
    const key = item.requirementDesc || 'Other Requirements';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Array<{ course: Course; isRequired: boolean; requirementDesc: string }>>);

  const requirementEntries = Object.entries(groupedByRequirement);

  return (
    <div className="space-y-6">
      {requirementEntries.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-4 h-16 w-16 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="font-body text-sm text-[var(--muted-foreground)]">
              No courses defined in program requirements
            </p>
          </div>
        </div>
      ) : (
        requirementEntries.map(([requirementDesc, coursesInReq], reqIndex) => (
          <div key={reqIndex} className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
            {/* Requirement Number Header */}
            <div className={`border-b-2 ${colors.bg} px-6 py-3`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                  <span className={`font-header-semi text-lg font-bold ${colors.text}`}>
                    {reqIndex + 1}
                  </span>
                </div>
                <span className="font-header-semi text-xl font-bold text-white">
                  Requirement {reqIndex + 1}
                </span>
              </div>
            </div>

            {/* Requirement Description Header */}
            <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--background)] to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-header-semi text-lg font-semibold text-[var(--foreground)]">
                  {requirementDesc}
                </h3>
                <span className="rounded-full bg-[var(--background)] px-3 py-1 font-body-semi text-xs font-semibold text-[var(--muted-foreground)]">
                  {coursesInReq.length} {coursesInReq.length === 1 ? 'course' : 'courses'}
                </span>
              </div>
            </div>

            {/* Courses Grid - wraps to multiple rows */}
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {coursesInReq.map((item, courseIndex) => (
                  <ClassicCourseCard
                    key={`${item.course.code}-${courseIndex}`}
                    course={item.course}
                    isRequired={item.isRequired}
                  />
                ))}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Classic Course Card Component
function ClassicCourseCard({ course, isRequired }: { course: Course; isRequired: boolean }) {
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
      className={`overflow-hidden rounded-lg border-2 ${cardStyles.border} ${cardStyles.bg} shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}
    >
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className={`font-header-semi text-base font-semibold ${cardStyles.titleText}`}>
            {course.code}
          </h4>
          <span className={`flex-shrink-0 rounded-full ${cardStyles.badge} px-2 py-0.5 font-mono text-xs font-semibold`}>
            {course.credits} {course.credits === 1 ? 'cr' : 'cr'}
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
        </div>
      </div>
    </div>
  );
}
