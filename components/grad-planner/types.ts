export type CourseStatus = 'Completed' | 'Withdrawn';

export interface Course {
  code: string;
  title: string | null;
  credits: number;
  fulfills?: string[];
  isCompleted?: boolean;
  status?: CourseStatus; // Present for past courses, absent for planned courses
  grade?: string; // Letter grade (A, B+, W, P, etc.)
  term?: string; // Term when course was taken
  source?: string; // "Institutional" for transcript courses
}

export type EventType =
  | 'Apply for Graduation'
  | 'Apply for Graduate School'
  | 'Co-op'
  | 'Internship'
  | 'Major/Minor Application'
  | 'Religious Deferment (Mission)'
  | 'Research Project'
  | 'Sabbatical'
  | 'Study Abroad'
  | 'Teaching Assistant'
  | 'Other';

export type MilestoneTiming =
  | 'ai_choose'
  | 'beginning'
  | 'middle'
  | 'before_last_year'
  | 'after_graduation';

export interface Event {
  id?: string; // Optional - only needed for React keys in UI
  type: EventType;
  title: string;
  afterTerm: number;
  timingPreference?: MilestoneTiming; // Optional: used during plan creation to indicate user's timing preference
}

export interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
  is_active?: boolean;
  allCoursesCompleted?: boolean; // All courses successfully completed (isCompleted = true)
  termPassed?: boolean; // Term has already occurred (all courses have status - either Completed or Withdrawn)
}
