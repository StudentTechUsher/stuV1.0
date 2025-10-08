/**
 * Assumptions:
 * - Simple hierarchical scoping check
 */

import type { Advisor, Student } from '@/types/withdrawals';

export function isStudentInScope(student: Student, advisor: Advisor): boolean {
  if (advisor.scope === 'UNIVERSITY') return true;
  if (advisor.scope === 'COLLEGE') return student.collegeId === advisor.collegeId;
  if (advisor.scope === 'DEPARTMENT')
    return student.departmentId === advisor.departmentId;
  if (advisor.scope === 'MAJOR') return student.majorId === advisor.majorId;
  return false;
}
