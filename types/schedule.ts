export type RequirementTag = 'MAJOR' | 'MINOR' | 'GE' | 'REL' | 'ELECTIVE';

export type DayOfWeek = 'M' | 'Tu' | 'W' | 'Th' | 'F';

export interface Meeting {
  days: DayOfWeek[];
  start: string; // "09:00"
  end: string;   // "09:45"
}

export interface Location {
  building: string;
  room?: string;
}

export interface CourseRow {
  id: string;
  code: string;           // "FIN 413"
  title: string;          // "Real Estate Finance and Investment"
  section: string;        // "002"
  difficulty?: number;    // 0..5
  instructorId: string;
  instructorName: string;
  instructorRating?: number; // 0..5
  meeting: Meeting;
  location: Location;
  credits: number;        // e.g., 3.0
  requirementTags: Array<{ type: RequirementTag; weight?: number }>;
  description?: string;
  prereqs?: string[];
  seats?: { capacity: number; open: number; waitlist?: number };
  attributes?: string[];
  actions?: { withdrawable: boolean };
}

export interface SectionOption {
  sectionId: string;
  section: string;
  instructorId: string;
  instructorName: string;
  instructorRating?: number;
  meeting: Meeting;
  location: Location;
  seats: { capacity: number; open: number; waitlist?: number };
  conflicts?: string[]; // Array of course IDs that conflict
}

export interface InstructorOption {
  instructorId: string;
  instructorName: string;
  instructorRating?: number;
  sectionId: string;
  section: string;
  meeting: Meeting;
}
