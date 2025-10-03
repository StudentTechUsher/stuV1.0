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
import { Course, Event, Term } from './types';

// Import components
import { PlanSummary } from './PlanSummary';
import { PlanAssumptions } from './PlanAssumptions';
import { EventDialog } from './EventDialog';
import { TrashZone } from './TrashZone';
import { DraggableCourseOverlay } from './DraggableCourseOverlay';
import { EditModeBanner } from './EditModeBanner';
import { PlanHeader } from './PlanHeader';
import { SpaceView } from './SpaceView';
import { DetailView } from './DetailView';
import ChangesSummaryBox from './ChangesSummaryBox';

// Import hooks
import { usePlanParser } from './usePlanParser';

interface GraduationPlannerProps {
  plan?: Record<string, unknown> | GraduationPlan | Term[];
  isEditMode?: boolean;
  onPlanUpdate?: (updatedPlan: Term[]) => void;
  onSave?: (updatedPlan: Term[], events: Event[]) => void;
  studentProfile?: {
    profile_id: string;
    university_id: number;
    [key: string]: unknown;
  };
  advisorChanges?: {
    movedCourses: Array<{ courseName: string; courseCode: string; fromTerm: number; toTerm: number }>;
    hasSuggestions: boolean;
  } | null;
}

export default function GraduationPlanner({
  plan,
  isEditMode = false,
  onPlanUpdate,
  onSave,
  advisorChanges
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
  const [isSpaceView, setIsSpaceView] = useState(false);
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEventType, setNewEventType] = useState<'Major/Minor Application' | 'Internship'>('Major/Minor Application');
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

  // Extract est_grad_sem BEFORE processing plan structure
  const estGradSem = useMemo(() => {
    if (!plan) return undefined;
    const planRecord = plan as Record<string, unknown>;
    return planRecord.est_grad_sem as string | undefined;
  }, [plan]);

  // Handle different possible database structures
  const planData = useMemo((): Term[] => {
    if (!plan) return [];

    const planRecord = plan as Record<string, unknown>;

    // Check if plan itself is an array of terms (direct plan_details passed)
    if (Array.isArray(plan)) {
      return plan;
    }
    
    // Check for the actual database structure: plan_details.plan
    if (planRecord.plan_details && 
        typeof planRecord.plan_details === 'object' && 
        planRecord.plan_details !== null) {
      const planDetails = planRecord.plan_details as Record<string, unknown>;
      if (Array.isArray(planDetails.plan)) {
        return planDetails.plan as Term[];
      }
    }
    // Check if plan has a 'plan' property (nested structure) - AI RESPONSE FORMAT
    else if (Array.isArray(planRecord.plan)) {
      return planRecord.plan as Term[];
    }
    
    // Add more flexible parsing similar to GradPlanViewer
    // Check for semesters property
    if (Array.isArray(planRecord.semesters)) {
      return planRecord.semesters as Term[];
    }
    
    // Check for terms property
    if (Array.isArray(planRecord.terms)) {
      return planRecord.terms as Term[];
    }
    
    return [];
  }, [plan]);

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
  const handleOpenEventDialog = (event?: Event) => {
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
  };

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

  // Extract additional info from plan or plan_details if available
  const planRecord = plan as Record<string, unknown>;
  
  // If we're passed plan_details directly, metadata is at root level
  // If we're passed the full database record, metadata is in plan_details
  const sourceData = planRecord.plan_details ?
    (planRecord.plan_details as Record<string, unknown>) :
    planRecord;

  const assumptions = sourceData.assumptions as string[];
  const durationYears = sourceData.duration_years as number;

  // Transform current plan data to SpaceView format
  const spaceViewData: PlanSpaceView = useMemo(() => {
    const planRecord = plan as Record<string, unknown>;
    const planName = (planRecord.plan_name as string) || 'My Graduation Plan';
    const degree = (sourceData.program as string) || 'Degree Program';
    const gradSemester = estGradSem || 'Not set';

    const terms: TermBlock[] = currentPlanData.map((term, index) => {
      const courses: CourseItem[] = (term.courses || []).map((course, courseIndex) => ({
        id: `${index}-${courseIndex}`,
        code: course.code || '',
        title: course.title || '',
        credits: course.credits || 0,
        requirements: course.fulfills || [],
      }));

      return {
        id: `term-${index}`,
        label: term.term || `Term ${index + 1}`,
        courses,
      };
    });

    return {
      planName,
      degree,
      gradSemester,
      terms,
    };
  }, [plan, currentPlanData, sourceData.program, estGradSem]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ p: 2, display: 'flex', gap: 3 }}>
        {/* Main plan content */}
        <Box sx={{ flex: advisorChanges ? '1 1 70%' : '1 1 100%' }}>
          {isEditMode && (
            <EditModeBanner
              editablePlanData={editablePlanData}
              events={events}
              onSave={onSave}
            />
          )}

          {/* Trash Zone - Only visible when dragging */}
          {activeCourse && isEditMode && <TrashZone />}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <PlanHeader
              currentPlanData={currentPlanData}
              durationYears={durationYears}
              isEditMode={isEditMode}
              isSpaceView={isSpaceView}
              onToggleView={() => setIsSpaceView(!isSpaceView)}
              onAddEvent={() => handleOpenEventDialog()}
            />

            <PlanSummary
              planData={currentPlanData}
              durationYears={durationYears}
              fulfilledRequirements={fulfilledRequirements}
            />

            {assumptions && assumptions.length > 0 && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  backgroundColor: '#fff3e0',
                  borderRadius: 1,
                  border: '1px solid var(--action-edit)'
                }}
              >
                <Typography variant="h6" className="font-header" gutterBottom>
                  Plan Assumptions:
                </Typography>
                {/* render your assumptions list here */}
              </Box>
            )}
            <Button
              variant="outlined"
              onClick={() => setIsSpaceView(!isSpaceView)}
              startIcon={isSpaceView ? <ZoomInMapIcon /> : <ZoomOutMapIcon />}
              className="font-body-semi"
              sx={{
                borderColor: '#1A1A1A',
                color: '#1A1A1A',
                '&:hover': {
                  borderColor: '#000000',
                  backgroundColor: 'rgba(26, 26, 26, 0.08)',
                }
              }}
            >
              {isSpaceView ? 'Detail View' : 'Zoom Out'}
            </Button>
          </Box>
        </Box>
        
        {/* Display terms with events between them */}
        {isSpaceView ? (
          // Space View: Clean grid layout
          <SpaceView plan={spaceViewData} />
        ) : (
          // Detail View: Render pairs of terms side-by-side, with events spanning full width
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {currentPlanData.reduce<React.ReactNode[]>((acc, term, index) => {
              const termNumber = index + 1;
              const eventsAfterThisTerm = events.filter(e => e.afterTerm === termNumber);
              const termCredits = term.credits_planned ||
                                 (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);

              // Render term card
              const termCard = (
                <Box key={`term-wrapper-${index}`} sx={{ flex: '1 1 48%' }}>
                  <DroppableTerm term={term} termIndex={index} isEditMode={isEditMode} modifiedTerms={modifiedTerms}>
                    <Box
                      sx={{
                        p: 3,
                        border: '2px solid var(--border)',
                        borderRadius: 2,
                        backgroundColor: 'var(--muted)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        minHeight: '200px',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" className="font-header-bold" sx={{ color: 'var(--primary)', fontWeight: 800 }}>
                          Term {term.term || index + 1}
                        </Typography>
                        <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {termCredits} Credits
                        </Typography>
                      </Box>

                      {term.notes && (
                        <Box sx={{ mb: 2, p: 1, backgroundColor: 'var(--primary-15)', borderRadius: 2 }}>
                          <Typography variant="body2" className="font-body" color="text.secondary">
                            {term.notes}
                          </Typography>
                        </Box>
                      )}

                      {term.courses && Array.isArray(term.courses) && term.courses.length > 0 ? (
                        <Box>
                          <Typography variant="subtitle1" className="font-header-bold" gutterBottom sx={{ fontWeight: 700 }}>
                            Courses ({term.courses.length}):
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {term.courses.map((course: Course, courseIndex: number) => {
                              if (!course.code || !course.title) {
                                console.warn(`⚠️ Skipping invalid course in term ${index + 1}:`, course);
                                return null;
                              }

                              return (
                                <DraggableCourse
                                  key={`term-${index}-course-${courseIndex}-${course.code}-${course.title?.substring(0, 10)}`}
                                  course={course}
                                  courseIndex={courseIndex}
                                  termIndex={index}
                                  isEditMode={isEditMode}
                                  currentPlanData={currentPlanData}
                                  onMoveCourse={moveCourse}
                                  movedCourses={movedCourses}
                                />
                              );
                            }).filter(Boolean)}
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" className="font-body" color="text.secondary">
                          No courses defined for this term
                        </Typography>
                      )}
                    </Box>
                  </DroppableTerm>
                </Box>
              );

              // Group terms in pairs (2 columns)
              if (index % 2 === 0) {
                // Start of a new row
                const nextTerm = currentPlanData[index + 1];
                const nextTermNumber = index + 2;
                const nextTermCredits = nextTerm ? (nextTerm.credits_planned || (nextTerm.courses ? nextTerm.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0)) : 0;
                const nextEventsAfterTerm = nextTerm ? events.filter(e => e.afterTerm === nextTermNumber) : [];

                const nextTermCard = nextTerm ? (
                  <Box key={`term-wrapper-${index + 1}`} sx={{ flex: '1 1 48%' }}>
                    <DroppableTerm term={nextTerm} termIndex={index + 1} isEditMode={isEditMode} modifiedTerms={modifiedTerms}>
                      <Box
                        sx={{
                          p: 3,
                          border: '2px solid var(--border)',
                          borderRadius: 2,
                          backgroundColor: 'var(--muted)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          minHeight: '200px',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" className="font-header-bold" sx={{ color: 'var(--primary)', fontWeight: 800 }}>
                            Term {nextTerm.term || index + 2}
                          </Typography>
                          <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {nextTermCredits} Credits
                          </Typography>
                        </Box>

                        {nextTerm.notes && (
                          <Box sx={{ mb: 2, p: 1, backgroundColor: 'var(--primary-15)', borderRadius: 2 }}>
                            <Typography variant="body2" className="font-body" color="text.secondary">
                              {nextTerm.notes}
                            </Typography>
                          </Box>
                        )}

            {/* Display terms with events between them */}
            {isSpaceView ? (
              <SpaceView
                currentPlanData={currentPlanData}
                events={events}
                isEditMode={isEditMode}
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

        {/* Changes summary sidebar - only show when there are advisor changes */}
        {advisorChanges && (
          <Box sx={{ flex: '0 0 28%' }}>
            <ChangesSummaryBox
              movedCourses={advisorChanges.movedCourses}
              hasSuggestions={advisorChanges.hasSuggestions}
            />
          </Box>
        )}
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
