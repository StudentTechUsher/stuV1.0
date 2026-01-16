/**
 * Mock data for course schedule table in PDF export
 * Structured for future integration with real scheduler data
 */

export interface CourseScheduleRow {
  course: string;
  section: string;
  difficulty: string;
  instructor: string;
  schedule: string;
  location: string;
  credits: number;
  requirement: string;
}

/**
 * DUMMY DATA for course schedule table
 * Used in "Download Full Schedule" PDF export
 * Replace with real data from scheduler when available
 */
export const SCHEDULE_TABLE_MOCK: CourseScheduleRow[] = [
  {
    course: 'M COM 320',
    section: '001',
    difficulty: 'Med',
    instructor: 'Dr. Smith',
    schedule: 'MWF 9:00-9:50',
    location: 'TNRB 120',
    credits: 3,
    requirement: 'Major',
  },
  {
    course: 'FIN 401',
    section: '002',
    difficulty: 'Hard',
    instructor: 'Dr. Jones',
    schedule: 'TTh 11:00-12:15',
    location: 'JFSB 250',
    credits: 3,
    requirement: 'Major',
  },
  {
    course: 'IHUM 202',
    section: '004',
    difficulty: 'Easy',
    instructor: 'Prof. Lee',
    schedule: 'TTh 1:00-2:15',
    location: 'JFSB 150',
    credits: 3,
    requirement: 'GE',
  },
  {
    course: 'REL 275',
    section: '003',
    difficulty: 'Med',
    instructor: 'Bro. Williams',
    schedule: 'MWF 11:00-11:50',
    location: 'JSB 234',
    credits: 2,
    requirement: 'REL',
  },
  {
    course: 'STAT 221',
    section: '001',
    difficulty: 'Hard',
    instructor: 'Dr. Chen',
    schedule: 'TTh 2:30-3:45',
    location: 'TMCB 1170',
    credits: 3,
    requirement: 'Major',
  },
];

/**
 * Table column headers for PDF export
 */
export const SCHEDULE_TABLE_HEADERS = [
  'Course',
  'Sec',
  'Dif',
  'Instructor',
  'Schedule',
  'Location',
  'Hrs',
  'Req',
] as const;
