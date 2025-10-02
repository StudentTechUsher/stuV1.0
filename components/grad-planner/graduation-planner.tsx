'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import EditIcon from '@mui/icons-material/Edit';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import WorkIcon from '@mui/icons-material/Work';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
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
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { SpaceView, PlanSpaceView } from '@/components/space/SpaceView';
import { TermBlock } from '@/components/space/TermCard';
import { CourseItem } from '@/components/space/CoursePill';

// Color mapping for requirement types (matching academic-progress-card)
const REQUIREMENT_COLORS: Record<string, string> = {
  'major': 'var(--primary)', // #12F987
  'minor': '#001F54', // dark blue
  'general education': '#2196f3', // bright blue
  'gen ed': '#2196f3', // alternate name for general education
  'religion': '#5E35B1', // purple
  'electives': '#9C27B0', // violet
  'elective': '#9C27B0', // singular form
};

// Helper function to get color for a requirement type
function getRequirementColor(requirement: string): string {
  const req = requirement.toLowerCase().trim();

  // Direct matches first
  if (REQUIREMENT_COLORS[req]) {
    return REQUIREMENT_COLORS[req];
  }

  // Pattern matching for specific requirement categories
  // Religion-related requirements
  if (req.includes('book of mormon') ||
      req.includes('doctrine and covenants') ||
      req.includes('teachings') ||
      req.includes('jesus christ') ||
      req.includes('christ') ||
      req.includes('gospel') ||
      req.includes('eternal family') ||
      req.includes('old testament') ||
      req.includes('new testament') ||
      req.includes('pearl of great price') ||
      req.includes('restoration') ||
      req.includes('religion') ||
      req.includes('rel ')) {
    return REQUIREMENT_COLORS['religion'];
  }

  // General Education patterns
  if (req.includes('skills') ||
      req.includes('first-year writing') ||
      req.includes('adv written') ||
      req.includes('global and cultural awareness') ||
      req.includes('quantitative reasoning') ||
      req.includes('science') ||
      req.includes('social science') ||
      req.includes('humanities') ||
      req.includes('fine arts') ||
      req.includes('american heritage') ||
      req.includes('languages of learning') ||
      req.includes('gen ed') ||
      req.includes('general education')) {
    return REQUIREMENT_COLORS['general education'];
  }

  // Major-related (often have course codes or department names)
  if (req.includes('major') ||
      req.includes('core') ||
      req.includes('capstone') ||
      req.includes('requirement') ||
      req.includes('subrequirement') ||
      // Add common major course prefixes if needed
      req.match(/^[a-z]{2,4}\s?\d{3,4}/)) { // matches course codes like "CS 142"
    return REQUIREMENT_COLORS['major'];
  }

  // Minor-related
  if (req.includes('minor')) {
    return REQUIREMENT_COLORS['minor'];
  }

  // Elective patterns
  if (req.includes('elective') ||
      req.includes('foundation') ||
      req.includes('free elective') ||
      req.includes('open elective') ||
      req.includes('unrestricted elective')) {
    return REQUIREMENT_COLORS['electives'];
  }

  // Fallback to gray for unmatched requirements
  return '#6b7280';
}

// Helper function to render requirement bubbles
function RequirementBubbles({ fulfills }: { fulfills: string[] }) {
  if (!fulfills || fulfills.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {fulfills.map((requirement, index) => {
        const color = getRequirementColor(requirement);

        // Handle CSS variables differently for background colors
        let backgroundColor: string;
        let borderColor: string;
        let textColor: string = color; // Default to the requirement color

        if (color.startsWith('var(')) {
          // For CSS variables, use rgba with opacity
          if (color === 'var(--primary)') {
            backgroundColor = 'rgba(18, 249, 135, 0.15)'; // #12F987 with 15% opacity
            borderColor = 'rgba(18, 249, 135, 0.3)'; // #12F987 with 30% opacity
            textColor = 'var(--hover-green)'; // Use hover green for better contrast
          } else {
            // Fallback for other CSS variables
            backgroundColor = 'rgba(107, 114, 128, 0.15)';
            borderColor = 'rgba(107, 114, 128, 0.3)';
          }
        } else {
          // For hex colors, convert to rgba
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
          borderColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        }

        return (
          <Box
            key={`${requirement}-${index}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.25,
              borderRadius: 3,
              backgroundColor: backgroundColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: textColor,
                fontFamily: '"Inter", sans-serif',
                lineHeight: 1,
              }}
            >
              {requirement}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// Draggable Course Component
function DraggableCourse({
  course,
  termIndex,
  courseIndex,
  isEditMode,
  onMoveCourse,
  currentPlanData,
  movedCourses,
}: {
  course: Course;
  termIndex: number;
  courseIndex: number;
  isEditMode: boolean;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
  currentPlanData: Term[];
  movedCourses: Set<string>;
}) {
  const courseId = `course-${termIndex}-${courseIndex}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: courseId,
    data: {
      course,
      termIndex,
      courseIndex,
    },
    disabled: !isEditMode,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  // Check if this course has been moved
  const courseIdentifier = `${course.code}-${course.title}`;
  const hasMoved = movedCourses.has(courseIdentifier);

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      sx={{
        p: 2,
        backgroundColor: 'white',
        borderRadius: 2,
        border: hasMoved ? '2px solid var(--action-edit)' : (isEditMode ? '1px solid var(--primary)' : '1px solid var(--border)'),
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: isEditMode ? 'grab' : 'default',
        boxShadow: hasMoved ? '0 4px 12px rgba(255, 165, 0, 0.25)' : undefined,
        '&:hover': isEditMode ? {
          backgroundColor: hasMoved ? 'rgba(255, 165, 0, 0.1)' : 'var(--primary-22)',
          borderColor: hasMoved ? 'var(--action-edit)' : 'var(--hover-green)',
          transform: 'translateY(-2px)',
          boxShadow: hasMoved ? '0 6px 16px rgba(255, 165, 0, 0.35)' : '0 4px 12px rgba(18, 249, 135, 0.15)'
        } : {},
        '&:active': isEditMode ? {
          cursor: 'grabbing',
        } : {},
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', mb: 1 }}>
          {course.code}: {course.title}
        </Typography>
        {isEditMode && (
          <IconButton
            size="small"
            sx={{
              ml: 1,
              p: 0.5,
              color: 'var(--primary)',
              '&:hover': { backgroundColor: 'var(--primary-15)' }
            }}
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Add course edit functionality
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box>
        <Typography variant="caption" className="font-body" color="text.secondary" display="block">
          {course.credits} credits
        </Typography>
        {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
          <RequirementBubbles fulfills={course.fulfills} />
        )}
        {isEditMode && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" className="font-body" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Move:
            </Typography>
            <CourseMoveField
              currentTerm={termIndex + 1}
              maxTerms={currentPlanData.length}
              course={course}
              termIndex={termIndex}
              courseIndex={courseIndex}
              onMoveCourse={onMoveCourse}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// Droppable Term Component
function DroppableTerm({
  term,
  termIndex,
  children,
  isEditMode,
  modifiedTerms,
}: {
  term: Term;
  termIndex: number;
  children: React.ReactNode;
  isEditMode: boolean;
  modifiedTerms: Set<number>;
}) {
  const termId = `term-${termIndex}`;
  const hasBeenModified = modifiedTerms.has(termIndex);

  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: termId,
    data: {
      term,
      termIndex,
    },
    disabled: !isEditMode,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        // Invisible wrapper - only provide drop zone functionality
        position: 'relative',
        // Add orange glow effect for modified terms
        ...(hasBeenModified && {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            backgroundColor: 'transparent',
            borderRadius: 3,
            border: '2px solid var(--action-edit)',
            pointerEvents: 'none',
            zIndex: 0,
            boxShadow: '0 0 8px rgba(255, 165, 0, 0.3)'
          }
        }),
        // Add subtle visual feedback when dragging over in edit mode
        '&::before': isOver && isEditMode ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--primary-15)',
          borderRadius: 2,
          border: '2px dashed var(--primary)',
          pointerEvents: 'none',
          zIndex: 1
        } : {}
      }}
    >
      {children}
    </Box>
  );
}

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface Event {
  id: string;
  type: 'Major/Minor Application' | 'Internship';
  title: string;
  afterTerm: number; // Which term this event comes after
}

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

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
}

// Separate component for the course move TextField
interface CourseMoveFieldProps {
  currentTerm: number;
  maxTerms: number;
  course: Course;
  termIndex: number;
  courseIndex: number;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
}

function CourseMoveField({ currentTerm, maxTerms, course, termIndex, courseIndex, onMoveCourse }: CourseMoveFieldProps) {
  const [value, setValue] = useState(currentTerm);
  
  // Create a unique identifier for this course instance
  const courseUniqueId = `${termIndex}-${courseIndex}-${course.code}`;

  // Update value when currentTerm changes (after course move)
  useEffect(() => {
    setValue(currentTerm);
  }, [currentTerm, courseUniqueId, value]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    const newTermNumber = event.target.value as number;
    setValue(newTermNumber);
    
    // Immediately move the course when selection changes
    if (newTermNumber !== currentTerm && newTermNumber >= 1 && newTermNumber <= maxTerms) {
      onMoveCourse(termIndex, courseIndex, newTermNumber);
    }
  };

  // Generate term options
  const termOptions = [];
  for (let i = 1; i <= maxTerms; i++) {
    termOptions.push(
      <MenuItem key={i} value={i}>
        Term {i}
      </MenuItem>
    );
  }

  return (
    <FormControl size="small" sx={{ width: '100%', maxWidth: '160px' }}>
      <InputLabel className="font-body" sx={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Select Term</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label="Select Term"
        onClick={(e) => e.stopPropagation()}
        className="font-body-semi"
        sx={{
          fontSize: '0.75rem',
          height: '36px',
          backgroundColor: 'white',
          '& .MuiSelect-select': {
            paddingTop: '8px',
            paddingBottom: '8px',
            fontSize: '0.75rem',
            fontWeight: 600
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--hover-green)'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)'
          }
        }}
      >
        {termOptions}
      </Select>
    </FormControl>
  );
}

export default function GraduationPlanner({ plan, isEditMode = false, onPlanUpdate, onSave }: Readonly<GraduationPlannerProps>) {

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
    const overData = over.data.current as { term: Term; termIndex: number };

    // Only move if dropping onto a different term
    if (activeData.termIndex !== overData.termIndex) {
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
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">
          {JSON.stringify(plan, null, 2)}
        </pre>
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
      <Box sx={{ p: 2 }}>
        {isEditMode && (
        <Box sx={{
          mb: 3,
          p: 2,
          backgroundColor: 'rgba(255, 165, 0, 0.15)',
          borderRadius: 3,
          border: '2px solid var(--action-edit)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          boxShadow: '0 2px 8px rgba(255, 165, 0, 0.2)'
        }}>
          <Box>
            <Typography variant="h6" className="font-header-bold" sx={{ color: 'var(--action-edit)' }}>
              Edit Mode Active
            </Typography>
            <Typography variant="body2" className="font-body" color="text.secondary">
              Make changes to your graduation plan. Click "Submit for Approval" when finished.
            </Typography>
          </Box>
          {onSave && (
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => onSave(editablePlanData, events)}
              className="font-body-semi"
              sx={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'var(--hover-green)'
                }
              }}
            >
              Save
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body1" className="font-body">
              Terms Planned: <Box component="span" sx={{ fontWeight: 'bold' }}>{currentPlanData.length}</Box>
            </Typography>
            {Boolean(durationYears) && (
              <Typography variant="body1" className="font-body">
                {durationYears} years
              </Typography>
            )}
            <Typography variant="body1" className="font-body">
              Total Credits: <Box component="span" sx={{ fontWeight: 'bold' }}>{currentPlanData.reduce((total, term) => {
                const termCredits = term.credits_planned ||
                                   (term.courses ? term.courses.reduce((sum, course) => sum + (course.credits || 0), 0) : 0);
                return total + termCredits;
              }, 0)}</Box>
            </Typography>
          </Box>

          {/* View Mode Toggle and Add Event Button */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isEditMode && (
              <Button
                variant="contained"
                onClick={() => handleOpenEventDialog()}
                startIcon={<AddIcon />}
                className="font-body-semi"
                sx={{
                  backgroundColor: '#1A1A1A',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#000000',
                  }
                }}
              >
                Add Event
              </Button>
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

                        {nextTerm.courses && Array.isArray(nextTerm.courses) && nextTerm.courses.length > 0 ? (
                          <Box>
                            <Typography variant="subtitle1" className="font-header-bold" gutterBottom sx={{ fontWeight: 700 }}>
                              Courses ({nextTerm.courses.length}):
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {nextTerm.courses.map((course: Course, courseIndex: number) => {
                                if (!course.code || !course.title) return null;

                                return (
                                  <DraggableCourse
                                    key={`term-${index + 1}-course-${courseIndex}-${course.code}-${course.title?.substring(0, 10)}`}
                                    course={course}
                                    courseIndex={courseIndex}
                                    termIndex={index + 1}
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
                ) : null;

                // Render events after first term
                const firstTermEvents = eventsAfterThisTerm.length > 0 ? (
                  <Box key={`events-after-${index}`} sx={{ width: '100%' }}>
                    {eventsAfterThisTerm.map((event) => {
                      const eventColor = event.type === 'Internship' ? '#9C27B0' : '#ff9800';
                      const EventIconComponent = event.type === 'Internship' ? WorkIcon : EventIcon;

                      return (
                        <Box
                          key={event.id}
                          sx={{
                            p: 1.5,
                            py: 1,
                            backgroundColor: eventColor,
                            color: 'white',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            mb: 2,
                            minHeight: '60px',
                            maxHeight: '60px',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <EventIconComponent sx={{ fontSize: 24 }} />
                            <Box>
                              <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {event.title}
                              </Typography>
                              <Typography variant="caption" className="font-body" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                                {event.type}
                              </Typography>
                            </Box>
                          </Box>
                          {isEditMode && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEventDialog(event)}
                                sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }, p: 0.5 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEvent(event.id)}
                                sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }, p: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ) : null;

                // Render events after second term
                const secondTermEvents = nextTerm && nextEventsAfterTerm.length > 0 ? (
                  <Box key={`events-after-${index + 1}`} sx={{ width: '100%' }}>
                    {nextEventsAfterTerm.map((event) => {
                      const eventColor = event.type === 'Internship' ? '#9C27B0' : '#ff9800';
                      const EventIconComponent = event.type === 'Internship' ? WorkIcon : EventIcon;

                      return (
                        <Box
                          key={event.id}
                          sx={{
                            p: 1.5,
                            py: 1,
                            backgroundColor: eventColor,
                            color: 'white',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            mb: 2,
                            minHeight: '60px',
                            maxHeight: '60px',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <EventIconComponent sx={{ fontSize: 24 }} />
                            <Box>
                              <Typography variant="body2" className="font-body-semi" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {event.title}
                              </Typography>
                              <Typography variant="caption" className="font-body" sx={{ opacity: 0.9, fontSize: '0.7rem' }}>
                                {event.type}
                              </Typography>
                            </Box>
                          </Box>
                          {isEditMode && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEventDialog(event)}
                                sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }, p: 0.5 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEvent(event.id)}
                                sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }, p: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ) : null;

                // Add row with 2 terms
                acc.push(
                  <Box key={`row-${index}`} sx={{ display: 'flex', gap: 3, '@media (max-width: 900px)': { flexDirection: 'column' } }}>
                    {termCard}
                    {nextTermCard}
                  </Box>
                );

                // Add events after first term
                if (firstTermEvents) acc.push(firstTermEvents);
                // Add events after second term
                if (secondTermEvents) acc.push(secondTermEvents);
              }
              // Skip odd indices as they're handled in the even index case

              return acc;
            }, [])}
          </Box>
        )}
      </Box>

      <br />
      {assumptions && assumptions.length > 0 && (
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'var(--primary-15)', borderRadius: 3, border: '1px solid var(--primary)' }}>
          <Typography variant="h6" className="font-header-bold" gutterBottom>
            Plan Assumptions:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {assumptions.map((assumption) => (
              <Typography key={assumption} component="li" variant="body2" className="font-body">
                {assumption}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
      </Box>

      {/* Drag Overlay for visual feedback */}
      <DragOverlay>
        {activeCourse ? (
          <Box
            sx={{
              p: 2,
              backgroundColor: 'white',
              borderRadius: 2,
              border: '2px solid var(--primary)',
              minHeight: '80px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              opacity: 0.9,
              transform: 'rotate(5deg)',
              boxShadow: '0 8px 32px rgba(18, 249, 135, 0.3)',
            }}
          >
            <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', mb: 1 }}>
              {activeCourse.code}: {activeCourse.title}
            </Typography>
            <Typography variant="caption" className="font-body" color="text.secondary">
              {activeCourse.credits} credits
            </Typography>
          </Box>
        ) : null}
      </DragOverlay>

      {/* Add Event Dialog */}
      <Dialog open={showEventDialog} onClose={() => setShowEventDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-header-bold">{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel
                className="font-body"
                sx={{
                  '&.Mui-focused': {
                    color: 'var(--primary-dark)',
                  },
                }}
              >
                Event Type
              </InputLabel>
              <Select
                value={newEventType}
                label="Event Type"
                onChange={(e) => setNewEventType(e.target.value as 'Major/Minor Application' | 'Internship')}
                className="font-body"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--border)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                  },
                }}
              >
                <MenuItem value="Major/Minor Application" className="font-body">Major/Minor Application</MenuItem>
                <MenuItem value="Internship" className="font-body">Internship</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Event Title (Optional)"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              placeholder={newEventType}
              className="font-body"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'var(--border)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--primary)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--primary)',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: 'var(--primary-dark)',
                },
              }}
            />

            <FormControl fullWidth>
              <InputLabel
                className="font-body"
                sx={{
                  '&.Mui-focused': {
                    color: 'var(--primary-dark)',
                  },
                }}
              >
                After Term
              </InputLabel>
              <Select
                value={newEventAfterTerm}
                label="After Term"
                onChange={(e) => setNewEventAfterTerm(e.target.value as number)}
                className="font-body"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--border)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'var(--primary)',
                  },
                }}
              >
                {currentPlanData.map((_, index) => (
                  <MenuItem key={index + 1} value={index + 1} className="font-body">
                    After Term {index + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEventDialog(false)} className="font-body-semi">
            Cancel
          </Button>
          <Button
            onClick={handleSaveEvent}
            variant="contained"
            className="font-body-semi"
            sx={{
              backgroundColor: 'var(--primary)',
              '&:hover': { backgroundColor: 'var(--hover-green)' }
            }}
          >
            {editingEvent ? 'Save Changes' : 'Add Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </DndContext>
  );
}
