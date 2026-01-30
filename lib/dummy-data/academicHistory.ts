/**
 * Dummy Academic History Data for POC
 * These structures match the expected transcript format.
 * Toggle with NEXT_PUBLIC_USE_DUMMY_ACADEMIC_DATA=true
 *
 * TODO: Replace with real data from Supabase once backend is implemented
 */

// ============================================================================
// TERM METRICS
// ============================================================================

export interface TermMetrics {
  term: string;
  hoursEarned: number;
  hoursGraded: number;
  termGpa: number;
}

export const DUMMY_TERM_METRICS: TermMetrics[] = [
  { term: 'Fall Semester 2023', hoursEarned: 15.0, hoursGraded: 15.0, termGpa: 3.67 },
  { term: 'Winter Semester 2023', hoursEarned: 14.0, hoursGraded: 14.0, termGpa: 3.85 },
  { term: 'Spring Semester 2023', hoursEarned: 16.0, hoursGraded: 16.0, termGpa: 3.72 },
  { term: 'Fall Semester 2022', hoursEarned: 15.0, hoursGraded: 15.0, termGpa: 3.54 },
  { term: 'Winter Semester 2022', hoursEarned: 13.0, hoursGraded: 13.0, termGpa: 3.62 },
];

// ============================================================================
// TRANSFER CREDITS
// ============================================================================

export interface TransferCourse {
  id: string;
  originalCode: string; // "ENGLIS 101"
  originalTitle: string; // "English Composition I"
  hours: number; // 3
  grade: string; // "A"
  accepted: boolean; // true/false
  equivalent?: string; // "WRTG 150"
}

export interface TransferInstitution {
  name: string;
  location?: string;
  fromYear: number;
  toYear: number;
  courses: TransferCourse[];
}

export const DUMMY_TRANSFER_INSTITUTIONS: TransferInstitution[] = [
  {
    name: 'Washington State University (WA)',
    location: 'Pullman, WA',
    fromYear: 2018,
    toYear: 2020,
    courses: [
      {
        id: 't1',
        originalCode: 'ENGLIS 101',
        originalTitle: 'English Composition I',
        hours: 3,
        grade: 'A',
        accepted: true,
        equivalent: 'WRTG 150',
      },
      {
        id: 't2',
        originalCode: 'MATH 171',
        originalTitle: 'Calculus I',
        hours: 4,
        grade: 'A-',
        accepted: true,
        equivalent: 'MATH 112',
      },
      {
        id: 't3',
        originalCode: 'PHYS 201',
        originalTitle: 'Physics I',
        hours: 4,
        grade: 'B+',
        accepted: true,
        equivalent: 'PHYS 121',
      },
      {
        id: 't4',
        originalCode: 'CHEM 165',
        originalTitle: 'Chemistry I',
        hours: 4,
        grade: 'B',
        accepted: false,
      },
    ],
  },
  {
    name: 'Seattle Community College (WA)',
    location: 'Seattle, WA',
    fromYear: 2017,
    toYear: 2018,
    courses: [
      {
        id: 't5',
        originalCode: 'CS 110',
        originalTitle: 'Introduction to Computer Science',
        hours: 3,
        grade: 'A',
        accepted: true,
        equivalent: 'CS 142',
      },
      {
        id: 't6',
        originalCode: 'BUS 101',
        originalTitle: 'Business Fundamentals',
        hours: 3,
        grade: 'A',
        accepted: true,
        equivalent: 'BUS 100',
      },
    ],
  },
];

// ============================================================================
// EXAM CREDITS (AP/IB/CLEP)
// ============================================================================

export interface ExamCredit {
  id: string;
  type: 'AP' | 'IB' | 'CLEP';
  subject: string; // "Biology"
  score: number | string; // 3, "5", "7"
  equivalent: string; // "BIO 100 Principles of Biology"
  hours: number; // 3
  grade: string; // "P" (Pass)
  year?: number; // 2018
}

export const DUMMY_EXAM_CREDITS: ExamCredit[] = [
  {
    id: 'e1',
    type: 'AP',
    subject: 'Biology',
    score: 3,
    equivalent: 'BIO 100 Principles of Biology',
    hours: 3,
    grade: 'P',
    year: 2018,
  },
  {
    id: 'e2',
    type: 'AP',
    subject: 'Calculus AB',
    score: 5,
    equivalent: 'MATH 112 Calculus I',
    hours: 4,
    grade: 'P',
    year: 2018,
  },
  {
    id: 'e3',
    type: 'AP',
    subject: 'Chemistry',
    score: 4,
    equivalent: 'CHEM 105 Chemistry I',
    hours: 4,
    grade: 'P',
    year: 2018,
  },
  {
    id: 'e4',
    type: 'AP',
    subject: 'European History',
    score: 3,
    equivalent: 'HIST 200 European History',
    hours: 3,
    grade: 'P',
    year: 2018,
  },
  {
    id: 'e5',
    type: 'IB',
    subject: 'Spanish',
    score: 6,
    equivalent: 'SPAN 201 Spanish Literature',
    hours: 3,
    grade: 'P',
    year: 2017,
  },
];

// ============================================================================
// ENTRANCE EXAMS
// ============================================================================

export interface EntranceExam {
  id: string;
  name: 'ACT' | 'SAT' | 'SAT1' | 'SAT2';
  scoreType?: string; // "COMP", "MATH", "VERB", "TOTAL"
  score: number; // 29, 1450, etc.
  date?: string; // "Dec 2018"
}

export const DUMMY_ENTRANCE_EXAMS: EntranceExam[] = [
  {
    id: 'act1',
    name: 'ACT',
    scoreType: 'COMP',
    score: 29,
    date: 'Dec 2018',
  },
  {
    id: 'sat1',
    name: 'SAT',
    scoreType: 'TOTAL',
    score: 1450,
    date: 'Oct 2018',
  },
  {
    id: 'sat2-math',
    name: 'SAT2',
    scoreType: 'MATH',
    score: 750,
    date: 'June 2018',
  },
  {
    id: 'sat2-chem',
    name: 'SAT2',
    scoreType: 'CHEM',
    score: 720,
    date: 'June 2018',
  },
];

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Toggle to use dummy data instead of loading from Supabase.
 * Set NEXT_PUBLIC_USE_DUMMY_ACADEMIC_DATA=true in .env.local
 */
export const USE_DUMMY_DATA =
  process.env.NEXT_PUBLIC_USE_DUMMY_ACADEMIC_DATA === 'true';
