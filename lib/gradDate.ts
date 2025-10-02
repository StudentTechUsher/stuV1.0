/**
 * Helper functions for graduation timeline calculations
 */

export type Term = "Spring" | "Summer" | "Fall" | "Winter";

/**
 * Convert term and year to ISO date string (YYYY-MM-DD)
 * Uses campus convention dates (mid-month)
 */
export function termYearToDate(term: Term, year: number): string {
  const monthMap: Record<Term, string> = {
    Spring: "04",
    Summer: "08",
    Fall: "12",
    Winter: "02"
  };

  const month = monthMap[term];

  // Winter is the only term that might be in the following year
  // but we'll use the year provided for simplicity
  return `${year}-${month}-15`;
}

/**
 * Convert term and year to semester string (e.g., "Fall 2026")
 */
export function termYearToSem(term: Term, year: number): string {
  return `${term} ${year}`;
}

/**
 * Parse semester string (e.g., "Fall 2026") back to term and year
 * Returns null if invalid format
 */
export function parseSem(sem: string): { term: Term; year: number } | null {
  const parts = sem.trim().split(/\s+/);
  if (parts.length !== 2) return null;

  const [term, yearStr] = parts;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || !["Spring", "Summer", "Fall", "Winter"].includes(term)) {
    return null;
  }

  return { term: term as Term, year };
}

/**
 * Validate semester string format
 */
export function isValidSem(sem: string): boolean {
  return parseSem(sem) !== null;
}
