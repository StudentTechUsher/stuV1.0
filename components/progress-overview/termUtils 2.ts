/**
 * Term formatting utilities for Progress Overview.
 * Converts various term formats to consistent, readable labels.
 */

/**
 * Term code format (e.g., BYU style):
 * - First 4 digits: year (e.g., 2024)
 * - Last digit: semester (1=Winter, 3=Spring, 4=Summer, 5=Fall)
 *
 * Example: "20245" = Fall 2024, "20251" = Winter 2025
 */
const SEMESTER_MAP: Record<string, string> = {
  '1': 'Winter',
  '2': 'Spring', // Some systems use 2 for Spring
  '3': 'Spring',
  '4': 'Summer',
  '5': 'Fall',
};

/**
 * Checks if a string looks like a term code (e.g., "20245")
 */
function isTermCode(term: string): boolean {
  return /^\d{5}$/.test(term);
}

/**
 * Parses a 5-digit term code into year and semester.
 * @param termCode - e.g., "20245"
 * @returns { year: "2024", semester: "Fall" } or null if invalid
 */
function parseTermCode(termCode: string): { year: string; semester: string } | null {
  if (!isTermCode(termCode)) return null;

  const year = termCode.slice(0, 4);
  const semesterCode = termCode.slice(4);
  const semester = SEMESTER_MAP[semesterCode];

  if (!semester) return null;

  return { year, semester };
}

/**
 * Checks if a string is already a readable term label.
 * Matches patterns like "Fall 2024", "Winter 2025", "Spring 2023", "Summer 2024"
 */
function isReadableTermLabel(term: string): boolean {
  return /^(Winter|Spring|Summer|Fall)\s+\d{4}$/i.test(term);
}

/**
 * Normalizes a readable term label to consistent capitalization.
 * @param term - e.g., "fall 2024" or "WINTER 2025"
 * @returns "Fall 2024" or "Winter 2025"
 */
function normalizeReadableLabel(term: string): string {
  const match = term.match(/^(winter|spring|summer|fall)\s+(\d{4})$/i);
  if (!match) return term;

  const semester = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const year = match[2];

  return `${semester} ${year}`;
}

/**
 * Formats a term value into a consistent, readable label.
 *
 * Handles:
 * - Term codes: "20245" -> "Fall 2024"
 * - Readable labels: "fall 2024" -> "Fall 2024"
 * - Already formatted: "Fall 2024" -> "Fall 2024"
 * - Unknown/empty: returns null
 *
 * @param term - The term value from course data
 * @returns Formatted label like "Fall 2024" or null if cannot be formatted
 */
export function formatTermLabel(term: string | undefined | null): string | null {
  if (!term || term.trim() === '') return null;

  const trimmed = term.trim();

  // Check if it's a term code
  if (isTermCode(trimmed)) {
    const parsed = parseTermCode(trimmed);
    if (parsed) {
      return `${parsed.semester} ${parsed.year}`;
    }
  }

  // Check if it's already a readable label
  if (isReadableTermLabel(trimmed)) {
    return normalizeReadableLabel(trimmed);
  }

  // Return as-is if it looks like some other format we should display
  // (e.g., "2024-2025", "FA24", etc.)
  if (trimmed.length > 0) {
    return trimmed;
  }

  return null;
}

/**
 * Gets a display-ready status label.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In Progress';
    case 'planned':
      return 'Planned';
    case 'remaining':
      return 'Remaining';
    default:
      return status;
  }
}
