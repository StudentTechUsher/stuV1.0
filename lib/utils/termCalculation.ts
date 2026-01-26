/**
 * Term Calculation Utilities
 * Intelligently determines the next appropriate term for graduation planning
 */

import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';

export interface TermInfo {
  term: string;
  year: number;
  termLabel: string;
}

export interface NextTermCalculationResult {
  suggestedTerm: string;
  suggestedYear: number;
  message: string;
  lastCompletedTerm: TermInfo | null;
}

/**
 * Parses a term string like "Fall 2025" or "Fall Semester 2025" into components
 */
export function parseTerm(termString: string): TermInfo | null {
  if (!termString) return null;

  // Extract year (4-digit number)
  const yearMatch = termString.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[0], 10);

  // Extract term name
  const lowerTerm = termString.toLowerCase();
  let term = '';

  if (lowerTerm.includes('winter')) term = 'Winter';
  else if (lowerTerm.includes('spring')) term = 'Spring';
  else if (lowerTerm.includes('summer')) term = 'Summer';
  else if (lowerTerm.includes('fall')) term = 'Fall';
  else return null;

  return {
    term,
    year,
    termLabel: `${term} ${year}`,
  };
}

/**
 * Gets the chronological order of terms based on university configuration
 */
function getTermOrdering(academicTerms?: AcademicTermsConfig): string[] {
  if (!academicTerms || !academicTerms.ordering || academicTerms.ordering.length === 0) {
    // Default ordering (most common in US universities)
    return ['Winter', 'Spring', 'Summer', 'Fall'];
  }

  // Normalize the ordering to use capitalized term names
  return academicTerms.ordering.map(term => {
    const normalized = term.toLowerCase();
    if (normalized.includes('winter')) return 'Winter';
    if (normalized.includes('spring')) return 'Spring';
    if (normalized.includes('summer')) return 'Summer';
    if (normalized.includes('fall')) return 'Fall';
    return term.charAt(0).toUpperCase() + term.slice(1);
  });
}

/**
 * Calculates the next term after a given term
 */
function getNextTerm(currentTerm: string, currentYear: number, ordering: string[]): TermInfo {
  const currentIndex = ordering.findIndex(t =>
    t.toLowerCase() === currentTerm.toLowerCase()
  );

  if (currentIndex === -1) {
    // Fallback to next Fall
    return {
      term: 'Fall',
      year: currentYear,
      termLabel: `Fall ${currentYear}`,
    };
  }

  // Get next term in sequence
  const nextIndex = (currentIndex + 1) % ordering.length;
  const nextTerm = ordering[nextIndex];

  // If we wrapped around, increment year
  const nextYear = nextIndex <= currentIndex ? currentYear + 1 : currentYear;

  return {
    term: nextTerm,
    year: nextYear,
    termLabel: `${nextTerm} ${nextYear}`,
  };
}

/**
 * Checks if a term/year combination is in the past or current
 * Returns true if the term is too recent to be used as a planning start
 */
function isTermTooRecent(term: string, year: number, ordering: string[]): boolean {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  // If the year is in the past, it's too recent
  if (year < currentYear) return true;

  // If the year is in the future, it's not too recent
  if (year > currentYear) return false;

  // Same year - need to check the month
  const termIndex = ordering.findIndex(t => t.toLowerCase() === term.toLowerCase());

  // Map months to terms (approximate, can be adjusted based on university)
  // Winter: Dec-Feb (11, 0, 1)
  // Spring: Mar-May (2, 3, 4)
  // Summer: Jun-Aug (5, 6, 7)
  // Fall: Sep-Nov (8, 9, 10)

  const currentTermIndex = (() => {
    if (currentMonth >= 8 && currentMonth <= 10) return ordering.findIndex(t => t.toLowerCase() === 'fall');
    if (currentMonth >= 11 || currentMonth <= 1) return ordering.findIndex(t => t.toLowerCase() === 'winter');
    if (currentMonth >= 2 && currentMonth <= 4) return ordering.findIndex(t => t.toLowerCase() === 'spring');
    if (currentMonth >= 5 && currentMonth <= 7) return ordering.findIndex(t => t.toLowerCase() === 'summer');
    return -1;
  })();

  // If we can't determine current term, assume next term is valid
  if (currentTermIndex === -1 || termIndex === -1) return false;

  // If the suggested term is before or equal to current term in the same year, it's too recent
  return termIndex <= currentTermIndex;
}

/**
 * Gets the next available term that's not too recent for planning
 */
function getNextPlanningTerm(
  lastTerm: TermInfo,
  ordering: string[],
  preferredTerms?: string[]
): TermInfo {
  let candidate = getNextTerm(lastTerm.term, lastTerm.year, ordering);

  // Keep advancing until we find a term that's not too recent
  let attempts = 0;
  while (isTermTooRecent(candidate.term, candidate.year, ordering) && attempts < 8) {
    candidate = getNextTerm(candidate.term, candidate.year, ordering);
    attempts++;
  }

  // If user has preferred start terms, try to find the next occurrence
  if (preferredTerms && preferredTerms.length > 0) {
    let searchCandidate = candidate;
    let searchAttempts = 0;

    // Look ahead up to 4 terms to find a preferred term
    while (searchAttempts < 4) {
      if (preferredTerms.some(pref => pref.toLowerCase() === searchCandidate.term.toLowerCase())) {
        return searchCandidate;
      }
      searchCandidate = getNextTerm(searchCandidate.term, searchCandidate.year, ordering);
      searchAttempts++;
    }
  }

  return candidate;
}

/**
 * Main function to calculate the next appropriate term for graduation planning
 */
export function calculateNextPlanningTerm(
  lastCompletedTerm: string | null,
  academicTerms?: AcademicTermsConfig,
  preferredStartTerms?: string[]
): NextTermCalculationResult {
  const ordering = getTermOrdering(academicTerms);

  // Parse the last completed term if available
  const lastTerm = lastCompletedTerm ? parseTerm(lastCompletedTerm) : null;

  if (lastTerm) {
    // User has academic history
    const nextTerm = getNextPlanningTerm(lastTerm, ordering, preferredStartTerms);

    return {
      suggestedTerm: nextTerm.term,
      suggestedYear: nextTerm.year,
      message: `Your last listed term in your history is ${lastTerm.termLabel}. What term do you want to have me start putting planned courses in?`,
      lastCompletedTerm: lastTerm,
    };
  }

  // No academic history - suggest based on current date and preferred terms
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Determine current term
  let currentTerm = 'Fall';
  if (currentMonth >= 11 || currentMonth <= 1) currentTerm = 'Winter';
  else if (currentMonth >= 2 && currentMonth <= 4) currentTerm = 'Spring';
  else if (currentMonth >= 5 && currentMonth <= 7) currentTerm = 'Summer';
  else if (currentMonth >= 8 && currentMonth <= 10) currentTerm = 'Fall';

  const virtualLastTerm: TermInfo = {
    term: currentTerm,
    year: currentYear,
    termLabel: `${currentTerm} ${currentYear}`,
  };

  const nextTerm = getNextPlanningTerm(virtualLastTerm, ordering, preferredStartTerms);

  return {
    suggestedTerm: nextTerm.term,
    suggestedYear: nextTerm.year,
    message: 'Which term should I start your plan from?',
    lastCompletedTerm: null,
  };
}

/**
 * Finds the most recent term from a list of course terms
 */
export function findMostRecentTerm(courseTerms: string[]): string | null {
  if (!courseTerms || courseTerms.length === 0) return null;

  // Parse all terms
  const parsedTerms = courseTerms
    .map(parseTerm)
    .filter((t): t is TermInfo => t !== null);

  if (parsedTerms.length === 0) return null;

  // Sort by year descending, then by term order
  const ordering = ['Winter', 'Spring', 'Summer', 'Fall'];
  parsedTerms.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return ordering.indexOf(b.term) - ordering.indexOf(a.term);
  });

  return parsedTerms[0].termLabel;
}
