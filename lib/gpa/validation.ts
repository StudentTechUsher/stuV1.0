/**
 * Input validation utilities for GPA calculator
 */

import { isValidGrade, GradeKey } from './gradeScale';

/**
 * Validation error with detailed message
 */
export class ValidationError extends Error {
  constructor(message: string, public fieldName?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate target GPA input
 * @param targetGpa - The target GPA value to validate
 * @returns The validated target GPA
 * @throws ValidationError if invalid
 */
export function validateTargetGpa(targetGpa: unknown): number {
  if (typeof targetGpa !== 'number') {
    throw new ValidationError('Target GPA must be a number', 'targetGpa');
  }

  if (!Number.isFinite(targetGpa)) {
    throw new ValidationError('Target GPA must be a finite number', 'targetGpa');
  }

  if (targetGpa < 0 || targetGpa > 4.0) {
    throw new ValidationError('Target GPA must be between 0.0 and 4.0', 'targetGpa');
  }

  return targetGpa;
}

/**
 * Validate credits value
 * @param credits - The credits value to validate
 * @param fieldName - The field name for error messages
 * @returns The validated credits value
 * @throws ValidationError if invalid
 */
export function validateCredits(credits: unknown, fieldName = 'credits'): number {
  if (typeof credits !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`, fieldName);
  }

  if (!Number.isFinite(credits)) {
    throw new ValidationError(`${fieldName} must be a finite number`, fieldName);
  }

  if (credits < 0) {
    throw new ValidationError(`${fieldName} cannot be negative`, fieldName);
  }

  return credits;
}

/**
 * Validate a grade key
 * @param grade - The grade to validate
 * @returns The validated grade, or null if null is passed
 * @throws ValidationError if invalid
 */
export function validateGrade(grade: unknown): GradeKey | null {
  if (grade === null || grade === undefined || grade === '') {
    return null;
  }

  if (!isValidGrade(grade)) {
    throw new ValidationError(
      `Invalid grade. Must be one of: A, A-, B+, B, B-, C+, C, C-, D+, D, D-, E`,
      'grade'
    );
  }

  return grade;
}

/**
 * Validate a remaining course object
 * @param course - The course to validate
 * @returns The validated course object
 * @throws ValidationError if invalid
 */
export function validateRemainingCourse(course: unknown): {
  id?: string;
  credits: number;
  goalGrade?: GradeKey | null;
} {
  if (typeof course !== 'object' || course === null) {
    throw new ValidationError('Course must be an object');
  }

  const courseObj = course as Record<string, unknown>;

  const credits = validateCredits(courseObj.credits, 'course.credits');

  let goalGrade: GradeKey | null | undefined;
  if (courseObj.goalGrade !== undefined) {
    goalGrade = validateGrade(courseObj.goalGrade);
  }

  return {
    id: typeof courseObj.id === 'string' ? courseObj.id : undefined,
    credits,
    goalGrade,
  };
}

/**
 * Validate an array of remaining courses
 * @param courses - The courses array to validate
 * @returns Array of validated courses
 * @throws ValidationError if any course is invalid
 */
export function validateRemainingCourses(
  courses: unknown
): Array<{ id?: string; credits: number; goalGrade?: GradeKey | null }> {
  if (!Array.isArray(courses)) {
    throw new ValidationError('Remaining courses must be an array');
  }

  return courses.map((course, index) => {
    try {
      return validateRemainingCourse(course);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Course ${index}: ${error.message}`,
          `remaining[${index}]`
        );
      }
      throw error;
    }
  });
}

/**
 * Validate the complete distribution request payload
 * @param payload - The payload to validate
 * @returns Validated payload
 * @throws ValidationError if any field is invalid
 */
export function validateDistributionRequest(payload: unknown): {
  targetGpa: number;
  completedCredits: number;
  completedQualityPoints: number;
  remaining: Array<{ id?: string; credits: number; goalGrade?: GradeKey | null }>;
} {
  if (typeof payload !== 'object' || payload === null) {
    throw new ValidationError('Payload must be an object');
  }

  const obj = payload as Record<string, unknown>;

  return {
    targetGpa: validateTargetGpa(obj.targetGpa),
    completedCredits: validateCredits(obj.completedCredits, 'completedCredits'),
    completedQualityPoints: validateCredits(
      obj.completedQualityPoints,
      'completedQualityPoints'
    ),
    remaining: validateRemainingCourses(obj.remaining),
  };
}
