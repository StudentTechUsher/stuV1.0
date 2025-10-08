/**
 * Assumptions:
 * - Using standard organizational hierarchy (University → College → Department → Major)
 * - ISO 8601 date strings for all timestamps
 */

export type OrgScope = 'UNIVERSITY' | 'COLLEGE' | 'DEPARTMENT' | 'MAJOR';

export interface Advisor {
  id: string;
  name: string;
  email: string;
  scope: OrgScope;
  collegeId?: string;
  departmentId?: string;
  majorId?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  collegeId: string;
  departmentId: string;
  majorId: string;
  advisorId: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  section: string;
  credits: number;
  instructor: string;
  term: string;
  addDropDeadlineISO: string;
}

export interface EnrollmentAction {
  id: string;
  studentId: string;
  courseId: string;
  action: 'ENROLL' | 'WITHDRAW';
  actionAtISO: string;
  reason?: string;
}

export interface WithdrawalRow {
  student: Student;
  course: Course;
  actionAtISO: string;
  daysAfterDeadline: number;
}
