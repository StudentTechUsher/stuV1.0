export interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

export interface Event {
  id: string;
  type: 'Major/Minor Application' | 'Internship';
  title: string;
  afterTerm: number;
}

export interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}
