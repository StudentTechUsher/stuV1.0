
import type { ProgramRow } from '@/types/program';
import type {
    RequirementType,
    Course as RequirementCourse,
} from '@/types/programRequirements';

export interface RequirementAuditResult {
    requirementId: string | number;
    description: string;
    type: RequirementType;
    satisfied: boolean;

    // Progress metrics
    satisfiedCount?: number;
    totalCount?: number;
    requiredCount?: number;  // For chooseNOf
    earnedCredits?: number;  // For creditBucket
    requiredCredits?: number;

    // Applied courses (course codes that satisfied this requirement)
    appliedCourses: string[];

    // All required courses (for showing what's missing)
    requiredCourses?: RequirementCourse[];

    // Nested results
    subResults?: RequirementAuditResult[];

    // Messages
    message?: string;
}

export interface ProgramAuditResult {
    program: ProgramRow;
    percentComplete: number;
    satisfiedCount: number;
    totalCount: number;
    results: RequirementAuditResult[];
    appliedCourseIds: string[];
    courseToRequirementMap: Map<string, string[]>;
}
