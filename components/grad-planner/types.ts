export interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

export type EventType =
  | 'Major/Minor Application'
  | 'Internship'
  | 'Sabbatical'
  | 'Study Abroad'
  | 'Research Project'
  | 'Teaching Assistant'
  | 'Co-op'
  | 'Apply for Graduate School'
  | 'Apply for Graduation'
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
}
