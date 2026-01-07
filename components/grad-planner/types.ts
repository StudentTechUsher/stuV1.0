export interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
  isCompleted?: boolean;
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
}
