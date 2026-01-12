// TypeScript interfaces for Progress Overview components

export type RequirementStatus = 'completed' | 'in-progress' | 'not-started';
export type CourseStatus = 'completed' | 'in-progress' | 'planned' | 'remaining';

export interface Course {
  id: string;
  code: string;        // e.g., "FIN 201"
  title: string;       // e.g., "Intro to Finance"
  credits: number;     // e.g., 3
  status: CourseStatus;
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
}

export interface ProgressOverviewCardProps {
  category: ProgressCategory;
  isExpandable?: boolean;
  defaultExpanded?: boolean;
}
