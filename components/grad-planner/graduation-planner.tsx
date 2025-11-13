'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { GraduationPlan } from '@/types/graduation-plan';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SpaceView, PlanSpaceView } from '@/components/space/SpaceView';
import { TermBlock } from '@/components/space/TermCard';
import { CourseItem } from '@/components/space/CoursePill';

// Import types
import { Course, Event, EventType, Term } from './types';

// Import components
import { PlanAssumptions } from './PlanAssumptions';
import { EventDialog } from './EventDialog';
import { TrashZone } from './TrashZone';
import { DraggableCourseOverlay } from './DraggableCourseOverlay';
import { EditModeBanner } from './EditModeBanner';
import { PlanOverview } from './PlanOverview';
import { DetailView } from './DetailView';

// Import hooks
import { usePlanParser } from './usePlanParser';

interface GraduationPlannerProps {
  plan?: Record<string, unknown> | GraduationPlan | Term[];
  isEditMode?: boolean;
  onPlanUpdate?: (updatedPlan: Term[]) => void;
  onSave?: (updatedPlan: Term[], events: Event[]) => void;
  initialSpaceView?: boolean;
  editorRole?: 'student' | 'advisor';
  studentProfile?: {
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  };
  advisorChanges?: {
    movedCourses: Array<{ courseName: string; courseCode: string; fromTerm: number; toTerm: number }>;
    hasSuggestions: boolean;
  } | null;
  externalEvents?: Event[];
  onEventsChange?: (events: Event[]) => void;
  onOpenEventDialog?: (opener: (event?: Event) => void) => void;
}

export default function GraduationPlanner({
  plan,
  isEditMode = false,
  onPlanUpdate,
  onSave,
  initialSpaceView = true,
  editorRole = 'student',
  advisorChanges,
  externalEvents,
  onEventsChange,
  onOpenEventDialog: externalOnOpenEventDialog
}: Readonly<GraduationPlannerProps>) {
  // Parse plan data using custom hook
  const { planData, assumptions, durationYears } = usePlanParser(plan);
  // State for managing plan data when in edit mode
  const [editablePlanData, setEditablePlanData] = useState<Term[]>([]);
  // Drag and drop state
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  // Track moved courses and modified terms for styling
  const [movedCourses, setMovedCourses] = useState<Set<string>>(new Set());
  const [modifiedTerms, setModifiedTerms] = useState<Set<number>>(new Set());
  // View mode state
  const [isSpaceView, setIsSpaceView] = useState(initialSpaceView);
  // Events state - use external events if provided, otherwise use internal state
  const [internalEvents, setInternalEvents] = useState<Event[]>([]);
  const events = externalEvents ?? internalEvents;
  const setEvents = onEventsChange ?? setInternalEvents;
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEventType, setNewEventType] = useState<EventType>('Major/Minor Application');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventAfterTerm, setNewEventAfterTerm] = useState<number>(1);

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    })
  );

  // Initialize editable plan data when plan changes or edit mode changes
  useEffect(() => {
    if (planData && planData.length > 0) {
      setEditablePlanData(JSON.parse(JSON.stringify(planData))); // Deep copy
    }
  }, [planData, isEditMode]);

  // Use editable data when in edit mode, otherwise use original data
  const currentPlanData = isEditMode ? editablePlanData : planData;

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const courseData = active.data.current as { course: Course; termIndex: number; courseIndex: number };
    setActiveCourse(courseData.course);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCourse(null);
    if (!over || !isEditMode) return;
    const activeData = active.data.current as { course: Course; termIndex: number; courseIndex: number };

    // Check if dropping on trash zone
    if (over.id === 'trash-zone') {
      deleteCourse(activeData.termIndex, activeData.courseIndex);
      return;
    }

    const overData = over.data.current as { term: Term; termIndex: number };
    if (activeData && overData && activeData.termIndex !== overData.termIndex) {
      moveCourse(activeData.termIndex, activeData.courseIndex, overData.termIndex + 1);
    }
  };

  // Event management functions
  const handleOpenEventDialog = React.useCallback((event?: Event) => {
    if (event) {
      // Editing existing event
      setEditingEvent(event);
      setNewEventType(event.type);
      setNewEventTitle(event.title);
      setNewEventAfterTerm(event.afterTerm);
    } else {
      // Creating new event
      setEditingEvent(null);
      setNewEventType('Major/Minor Application');
      setNewEventTitle('');
      setNewEventAfterTerm(1);
    }
    setShowEventDialog(true);
  }, []);

  // Register the dialog opener with parent component
  React.useEffect(() => {
    if (externalOnOpenEventDialog) {
      externalOnOpenEventDialog(handleOpenEventDialog);
    }
  }, [externalOnOpenEventDialog, handleOpenEventDialog]);

  const handleSaveEvent = () => {
    if (editingEvent) {
      // Update existing event
      setEvents(events.map(e =>
        e.id === editingEvent.id
          ? { ...e, type: newEventType, title: newEventTitle || newEventType, afterTerm: newEventAfterTerm }
          : e
      ));
    } else {
      // Create new event
      const newEvent: Event = {
        id: `event-${Date.now()}`,
        type: newEventType,
        title: newEventTitle || newEventType,
        afterTerm: newEventAfterTerm
      };
      setEvents([...events, newEvent]);
    }
    setShowEventDialog(false);
    setEditingEvent(null);
    setNewEventTitle('');
    setNewEventAfterTerm(1);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  // Derive a unique, ordered list of requirements fulfilled across the entire plan
  const fulfilledRequirements = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    currentPlanData.forEach(term => {
      term.courses?.forEach(course => {
        if (Array.isArray(course.fulfills)) {
          course.fulfills.forEach(reqRaw => {
            const req = typeof reqRaw === 'string' ? reqRaw.trim() : '';
            if (req && !seen.has(req)) {
              seen.add(req);
              ordered.push(req);
            }
          });
        }
      });
    });
    return ordered;
  }, [currentPlanData]);

  // Function to delete a course
  const deleteCourse = (termIndex: number, courseIndex: number) => {
    if (!isEditMode) return;

    setEditablePlanData(prevData => {
      const newData = prevData.map((term, idx) => {
        if (idx === termIndex) {
          const updatedCourses = term.courses ? [...term.courses] : [];
          updatedCourses.splice(courseIndex, 1);
          const updatedCredits = updatedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
          return {
            ...term,
            courses: updatedCourses,
            credits_planned: updatedCredits
          };
        }
        return term;
      });

      setModifiedTerms(prev => new Set(prev).add(termIndex));

      if (onPlanUpdate) {
        onPlanUpdate(newData);
      }

      return newData;
    });
  };

  // Function to move a course between terms
  const moveCourse = (fromTermIndex: number, courseIndex: number, toTermNumber: number) => {
    if (!isEditMode || toTermNumber < 1 || toTermNumber > editablePlanData.length) {
      return;
    }

    const toTermIndex = toTermNumber - 1;
    if (fromTermIndex === toTermIndex) {
      return; // No move needed
    }

    setEditablePlanData(prevData => {
      // Create a deep copy to avoid reference issues
      const newData = prevData.map(term => ({
        ...term,
        courses: term.courses ? [...term.courses] : []
      }));

      const sourceTerm = newData[fromTermIndex];
      const course = sourceTerm.courses?.[courseIndex];

      if (!course) {
        console.error(`❌ Course not found at term ${fromTermIndex}, index ${courseIndex}`);
        return prevData;
      }

      // Remove course from source term
      if (sourceTerm.courses) {
        sourceTerm.courses.splice(courseIndex, 1);

        // Update source term credits
        const sourceCredits = sourceTerm.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
        sourceTerm.credits_planned = sourceCredits;
      }

      // Add course to destination term
      const destTerm = newData[toTermIndex];
      if (!destTerm.courses) {
        destTerm.courses = [];
      }
      destTerm.courses.push(course);

      // Update destination term credits
      const destCredits = destTerm.courses.reduce((sum, c) => sum + (c.credits || 0), 0);
      destTerm.credits_planned = destCredits;

      // Track the moved course and modified terms
      const courseId = `${course.code}-${course.title}`;
      setMovedCourses(prev => new Set(prev).add(courseId));
      setModifiedTerms(prev => new Set(prev).add(fromTermIndex).add(toTermIndex));

      // Notify parent component of the change
      if (onPlanUpdate) {
        onPlanUpdate(newData);
      }

      return newData;
    });
  };

  // Transform current plan data to SpaceView format - MUST be before early return
  const spaceViewData: PlanSpaceView = useMemo(() => {
    if (!currentPlanData || currentPlanData.length === 0) {
      return {
        planName: 'My Graduation Plan',
        degree: 'Degree Program',
        gradSemester: 'Not set',
        terms: [],
      };
    }

    const planRecord = plan as Record<string, unknown>;
    const planName = (planRecord.plan_name as string) || 'My Graduation Plan';

    // Extract and format program names
    const programs = planRecord.programs as Array<{ id: number; name: string }> | undefined;
    const degree = programs && programs.length > 0
      ? programs.map(p => p.name).join(', ')
      : 'No programs selected';

    const gradSemester = (planRecord.est_grad_sem as string) || 'Not set';

    const terms: TermBlock[] = currentPlanData.map((term, index) => {
      const courses: CourseItem[] = (term.courses || []).map((course, courseIndex) => ({
        id: `space-course-${index}-${courseIndex}`,
        code: course.code || '',
        title: course.title || '',
        credits: course.credits || 0,
        requirements: course.fulfills || [],
        termIndex: index,
        courseIndex,
        rawCourse: course,
      }));

      return {
        id: `term-${index}`,
        label: term.term || `Term ${index + 1}`,
        courses,
        termIndex: index,
        rawTerm: term,
      };
    });

    return {
      planName,
      degree,
      gradSemester,
      terms,
      events,
    };
  }, [plan, currentPlanData, events]);

  if (!planData || planData.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" className="font-header" color="error">
          Invalid plan structure - no terms found
        </Typography>
        <Typography variant="body2" className="font-body" color="text.secondary" gutterBottom>
          Expected to find an array of terms, but got:
        </Typography>
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">{JSON.stringify(plan, null, 2)}</pre>
      </Box>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ p: 2 }}>
        {isEditMode && (
          <EditModeBanner
            editablePlanData={editablePlanData}
            events={events}
            onSave={onSave}
            role={editorRole}
          />
        )}

        {/* Trash Zone - Only visible when dragging */}
        {activeCourse && isEditMode && <TrashZone />}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <PlanOverview
            currentPlanData={currentPlanData}
            durationYears={durationYears}
            fulfilledRequirements={fulfilledRequirements}
            isEditMode={isEditMode}
            isSpaceView={isSpaceView}
            onToggleView={() => setIsSpaceView(!isSpaceView)}
            onAddEvent={() => handleOpenEventDialog()}
            programs={(plan as Record<string, unknown>)?.programs as Array<{ id: number; name: string }> | undefined}
            estGradSem={(plan as Record<string, unknown>)?.est_grad_sem as string | undefined}
          />

          {/* Display terms with events between them */}
          {isSpaceView ? (
            <SpaceView
              plan={spaceViewData}
              isEditMode={isEditMode}
              modifiedTerms={modifiedTerms}
              onEditEvent={handleOpenEventDialog}
              onDeleteEvent={handleDeleteEvent}
            />
          ) : (
            <DetailView
              currentPlanData={currentPlanData}
              events={events}
              isEditMode={isEditMode}
              modifiedTerms={modifiedTerms}
              movedCourses={movedCourses}
              onMoveCourse={moveCourse}
              onEditEvent={handleOpenEventDialog}
              onDeleteEvent={handleDeleteEvent}
            />
          )}
        </Box>

        <br />
        <PlanAssumptions assumptions={assumptions ?? []} />
      </Box>

      {/* Drag Overlay for visual feedback */}
      <DragOverlay>
        {activeCourse ? <DraggableCourseOverlay course={activeCourse} /> : null}
      </DragOverlay>

      {/* Add Event Dialog */}
      <EventDialog
        open={showEventDialog}
        editingEvent={editingEvent}
        eventType={newEventType}
        eventTitle={newEventTitle}
        eventAfterTerm={newEventAfterTerm}
        planData={currentPlanData}
        onClose={() => setShowEventDialog(false)}
        onSave={handleSaveEvent}
        onTypeChange={setNewEventType}
        onTitleChange={setNewEventTitle}
        onAfterTermChange={setNewEventAfterTerm}
      />
    </DndContext>
  );
}
