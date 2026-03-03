import type { ParsedCourse } from '@/lib/services/userCoursesService';
import type { ProgramRow } from '@/types/program';
import type { Course as RequirementCourse } from '@/types/programRequirements';
import type { RequirementAuditResult } from '@/types/degree-audit';

export interface CourseWithAnnotation {
    course: ParsedCourse;
    isDoubleCount: boolean;
    doubleCountsWith: string[];  // Program names this course satisfies
    satisfiesRequirements: string[];  // Requirement IDs
}

export interface MajorComparisonResult {
    program: ProgramRow;
    percentComplete: number;
    requirementsSatisfied: number;
    totalRequirements: number;
    coursesThatCount: CourseWithAnnotation[];
    stillNeeded: RequirementCourse[];
    notUsed: ParsedCourse[];
    auditDetails: RequirementAuditResult[];
}
