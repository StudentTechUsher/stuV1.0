// TypeScript interfaces for Progress Overview components

export type RequirementStatus = 'completed' | 'in-progress' | 'not-started';
export type CourseStatus = 'completed' | 'in-progress' | 'planned' | 'remaining';

export interface Course {
  id: string;
  code: string;        // e.g., "FIN 201"
  title: string;       // e.g., "Intro to Finance"
  credits: number;     // e.g., 3
  status: CourseStatus;
  /**
   * Optional term when the course was/is/will be taken.
   * Can be a readable string ("Fall 2024") or a term code ("20243").
   * If missing, the UI will show status only or "Term TBD".
   */
  term?: string;
}

export interface Subrequirement {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  status: RequirementStatus;
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  courses: Course[];
}

export interface Requirement {
  id: number;
  title: string;
  description: string;
  progress: number;      // e.g., 2 (completed)
  total: number;         // e.g., 4 (required)
  status: RequirementStatus;
  // Progress breakdown
  completed: number;     // Number of completed courses
  inProgress: number;    // Number of in-progress courses
  planned: number;       // Number of planned courses
  remaining: number;     // Number of remaining courses
  // A requirement can have EITHER subrequirements OR courses directly
  subrequirements?: Subrequirement[];  // If present, has nested subrequirements
  courses?: Course[];                   // If no subrequirements, has courses directly
}

export interface ProgressCategory {
  name: string;              // "Finance", "General Education", etc.
  color: string;             // CSS color value (var(--primary), #2196f3, etc.)
  totalCredits: number;      // 64
  percentComplete: number;   // 63 (percentage, not decimal)
  completed: number;         // 40 (credits)
  inProgress: number;        // 12 (credits)
  planned: number;           // 8 (credits)
  remaining: number;         // 4 (credits)
  requirements: Requirement[];
  /**
   * Optional short label for compact tab headers (e.g., "Major 1", "Minor", "Gen Ed").
   * Falls back to name-based display labels if not provided.
   */
  tabLabel?: string;
}

export interface ProgressOverviewCardProps {
  category: ProgressCategory;
  isExpandable?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean; // Use compact sizing for sidebars/narrow spaces
}

// Types for Main Progress Overview (overall degree summary)

export interface OverallProgress {
  percentComplete: number;    // Overall percentage complete (0-100)
  totalCredits: number;       // Total credits required for degree
  completedCredits: number;   // Credits completed
  inProgressCredits: number;  // Credits in progress
  plannedCredits: number;     // Credits planned
  remainingCredits: number;   // Credits remaining (not planned)
  totalCourses: number;       // Total courses (for display)
  completedCourses: number;   // Courses completed (for display)
}

export interface SectionProgress {
  name: string;               // "Finance", "General Education", etc.
  displayName: string;        // "MAJOR", "GE", "REL", etc.
  color: string;              // Category color
  percentComplete: number;    // 0-100
  completedCredits: number;   // Credits completed in this section
  totalCredits: number;       // Total credits for this section
}

export interface MainProgressOverviewProps {
  overallProgress: OverallProgress;
  sectionProgress: SectionProgress[];
  /** Called when a section card is clicked, with the section's original name */
  onSectionClick?: (sectionName: string) => void;
}
