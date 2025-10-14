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
  | 'Other';

export interface Event {
  id: string;
  type: EventType;
  title: string;
  afterTerm: number;
}

export interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}
