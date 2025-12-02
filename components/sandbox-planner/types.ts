/**
 * Sandbox Mode Type Definitions
 * All types for the graduation planning canvas interface
 */

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  requirement?: string;           // e.g., "Major", "Minor", "Gen Ed", "Elective"
  prerequisite?: string;
  description?: string;
  offeringTerms?: string[];       // e.g., ["Fall", "Spring"]
  fulfills?: string[];            // e.g., ["Junior Core", "Breadth"]
  meta?: Record<string, unknown>;
}

export interface CourseFilters {
  requirementType: string[];      // ["Major", "Minor", "Gen Ed", "Electives"]
  creditRange: [number, number];
  searchTerm: string;
}

export interface SemesterLane {
  id: string;
  term: string;                   // e.g., "Fall 2026"
  courses: Course[];
  notes?: string;
  creditsPlanned?: number;        // Calculated from courses
}

export interface StudentProfile {
  id: string;
  fname: string;
  lname: string;
  estGradDate?: string;
  estGradSem?: string;
  selectedPrograms?: string[];
}

export interface SandboxState {
  semesters: SemesterLane[];
  unplacedCourses: Course[];
  filters: CourseFilters;
  selectedCourse: Course | null;
  isDrawerOpen: boolean;
  isDirty: boolean;
  isSaving: boolean;
}

export interface DragData {
  course: Course;
  source: 'unplaced' | 'semester';
  sourceIndex?: number;
  semesterId?: string;
}
