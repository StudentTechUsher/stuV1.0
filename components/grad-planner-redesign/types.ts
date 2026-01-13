/**
 * TypeScript types and interfaces for Grad Plan Redesign
 */

// Course status types - matches mock data
export type CourseStatus = 'completed' | 'in-progress' | 'planned' | 'remaining';

// Event type - matches existing event categories
export type EventType =
  | 'internship'
  | 'major-application'
  | 'study-abroad'
  | 'research'
  | 'teaching-assistant'
  | 'co-op'
  | 'sabbatical'
  | 'grad-school'
  | 'graduation';

// Course interface - represents a single course in the grad plan
export interface Course {
  id: string;
  code: string;         // e.g., "FIN 201"
  title: string;        // e.g., "Principles of Finance"
  credits: number;      // e.g., 3
  status: CourseStatus;
  fulfills: string[];   // e.g., ["Major", "Finance Core"]
  grade?: string;       // e.g., "A-" (only for completed courses)
}

// Term interface - represents a semester/term in the grad plan
export interface Term {
  id: number;
  label: string;        // e.g., "Fall 2024"
  isActive: boolean;    // true if this is the current term
  courses: Course[];
}

// Event interface - represents milestones/events in the grad plan
export interface Event {
  id: string;
  title: string;        // e.g., "Finance Internship Application"
  term: string;         // e.g., "Summer 2025"
  type: EventType;
  notes?: string;       // Optional notes about the event
}

// GradPlan interface - the complete graduation plan structure
export interface GradPlan {
  planId: string;
  planName: string;           // e.g., "Finance Major - Class of 2027"
  studentName: string;        // e.g., "Preview Student"
  programName: string;        // e.g., "Finance"
  totalCredits: number;       // e.g., 120
  earnedCredits: number;      // e.g., 78
  terms: Term[];
  events: Event[];
}

// Component Props Interfaces

export interface RedesignedCourseCardProps {
  course: Course;
  isDragging?: boolean;
  isEditMode?: boolean;
  onEdit?: () => void;
  onSubstitute?: () => void;
  onDelete?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export interface RedesignedRequirementBadgesProps {
  fulfills: string[];
  compact?: boolean;
}

export interface RedesignedTermCardProps {
  term: Term;
  isEditMode: boolean;
  isDropTarget?: boolean;
  onAddCourse: () => void;
  onSetActive: () => void;
  onUpdateLabel: (newLabel: string) => void;
  onDeleteTerm?: () => void;
}

export interface RedesignedPlanHeaderProps {
  planName: string;
  studentName: string;
  totalCredits: number;
  earnedCredits: number;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancel: () => void;
  currentSemesterCredits?: number;
  plannedCredits?: number;
  // Plan management
  availablePlans?: Array<{ planId: string; planName: string }>;
  currentPlanId?: string;
  onSelectPlan?: (planId: string) => void;
  onCreateNewPlan?: () => void;
  onUpdatePlanName?: (newName: string) => void;
}

export interface RedesignedEventCardProps {
  event: Event;
  isEditMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface RedesignedPlanViewProps {
  gradPlan: GradPlan;
  isEditMode?: boolean;
  onPlanUpdate?: (updatedPlan: GradPlan) => void;
  // Plan management
  availablePlans?: GradPlan[];
  onSelectPlan?: (planId: string) => void;
  onCreateNewPlan?: () => void;
}

// Helper type for drag-and-drop operations
export interface DragOperation {
  courseId: string;
  sourceTerm: number;
  destinationTerm: number;
}

// Statistics/Progress types
export interface PlanStatistics {
  totalCredits: number;
  earnedCredits: number;
  currentSemesterCredits: number;
  plannedCredits: number;
  remainingCredits: number;
  percentComplete: number;
}

export interface CategoryBreakdown {
  category: string;
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  total: number;
  color: string;
}
