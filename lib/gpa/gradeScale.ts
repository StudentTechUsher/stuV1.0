/**
 * Grade scale definitions and utilities for GPA calculations
 * Implements standard 4.0 scale: A=4.0, A-=3.7, ..., E=0.0
 */

export const GRADE_POINTS = {
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.4,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.4,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.4,
  'D': 1.0,
  'D-': 0.7,
  'E': 0.0,
} as const;

export type GradeKey = keyof typeof GRADE_POINTS;

/**
 * Ordered list of all valid grades from highest to lowest point value
 */
export const ALL_GRADES: GradeKey[] = [
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
  'E',
] as const;

/**
 * Get grade points for a given grade
 * @param grade - The letter grade
 * @returns The grade point value (0.0 to 4.0)
 */
export function gp(grade: GradeKey): number {
  return GRADE_POINTS[grade];
}

/**
 * Check if a value is a valid grade key
 * @param value - The value to check
 * @returns True if value is a valid grade key
 */
export function isValidGrade(value: unknown): value is GradeKey {
  return typeof value === 'string' && value in GRADE_POINTS;
}

/**
 * Get the display name for a grade
 * @param grade - The grade key
 * @returns Display-friendly string (e.g., "A" → "A (4.0)")
 */
export function getGradeDisplay(grade: GradeKey): string {
  return `${grade} (${gp(grade).toFixed(1)})`;
}
