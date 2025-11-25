/**
 * Course Requirement Auto-Matcher
 * Automatically matches transcript courses to program requirements
 */

import type { CourseBlock } from '@/components/grad-planner/helpers/grad-plan-helpers';

export interface TranscriptCourse {
  code: string;
  title: string;
  credits: number;
}

export interface RequirementOption {
  requirementKey: string;
  requirementTitle: string;
  availableCourses: CourseBlock[];
  dropdownIndex?: number;
}

export interface CourseMatch {
  transcriptCourse: TranscriptCourse;
  requirementKey: string;
  matchedCourseCode: string;
  confidence: 'exact' | 'high' | 'medium' | 'low';
  dropdownIndex?: number;
}

/**
 * Normalizes a course code by removing spaces and converting to uppercase
 * e.g., "CS 142", "CS142", "cs 142" -> "CS142"
 */
function normalizeCourseCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

/**
 * Extracts subject code and number from a course code
 * e.g., "CS142" -> { subject: "CS", number: "142" }
 * Also handles "CS 142" format
 */
function parseCourseCode(code: string): { subject: string; number: string } | null {
  const normalized = normalizeCourseCode(code);
  const match = normalized.match(/^([A-Z]+)(\d+[A-Z]?)$/);
  if (!match) return null;
  return {
    subject: match[1],
    number: match[2],
  };
}

/**
 * Calculates similarity score between two strings (0-1)
 * Uses simple word overlap for course titles
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalize = (str: string) =>
    str.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Ignore short words

  const words1 = new Set(normalize(title1));
  const words2 = new Set(normalize(title2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

/**
 * Matches a single transcript course against a requirement's available courses
 */
function matchCourseToRequirement(
  transcriptCourse: TranscriptCourse,
  requirement: RequirementOption
): { matchedCode: string; confidence: 'exact' | 'high' | 'medium' | 'low' } | null {
  const transcriptParsed = parseCourseCode(transcriptCourse.code);
  if (!transcriptParsed) return null;

  let bestMatch: { code: string; confidence: 'exact' | 'high' | 'medium' | 'low'; score: number } | null = null;

  for (const course of requirement.availableCourses) {
    const requirementParsed = parseCourseCode(course.code);
    if (!requirementParsed) continue;

    // Normalize both codes for comparison
    const normalizedTranscript = normalizeCourseCode(transcriptCourse.code);
    const normalizedRequirement = normalizeCourseCode(course.code);

    // Exact code match after normalization (highest priority)
    if (normalizedTranscript === normalizedRequirement) {
      return { matchedCode: course.code, confidence: 'exact' };
    }

    // Subject + number match (very high priority - redundant after normalization but kept for clarity)
    if (
      requirementParsed.subject === transcriptParsed.subject &&
      requirementParsed.number === transcriptParsed.number
    ) {
      return { matchedCode: course.code, confidence: 'exact' };
    }

    // Subject match with close number (high priority)
    if (requirementParsed.subject === transcriptParsed.subject) {
      const reqNum = parseInt(requirementParsed.number);
      const transNum = parseInt(transcriptParsed.number);

      if (!isNaN(reqNum) && !isNaN(transNum) && Math.abs(reqNum - transNum) <= 5) {
        const score = 0.9 - (Math.abs(reqNum - transNum) * 0.02);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { code: course.code, confidence: 'high', score };
        }
      }
    }

    // Title similarity (medium priority)
    const titleSim = calculateTitleSimilarity(transcriptCourse.title, course.title);
    if (titleSim > 0.5) {
      const score = titleSim * 0.7;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          code: course.code,
          confidence: titleSim > 0.7 ? 'high' : 'medium',
          score
        };
      }
    }
  }

  return bestMatch ? { matchedCode: bestMatch.code, confidence: bestMatch.confidence } : null;
}

/**
 * Auto-matches all transcript courses to available requirements
 * Returns only matches with confidence >= medium
 */
export function autoMatchTranscriptCourses(
  transcriptCourses: TranscriptCourse[],
  requirements: RequirementOption[]
): CourseMatch[] {
  const matches: CourseMatch[] = [];
  const usedCourses = new Set<string>();

  // First pass: exact and high confidence matches
  for (const transcriptCourse of transcriptCourses) {
    if (usedCourses.has(transcriptCourse.code)) continue;

    for (const requirement of requirements) {
      const match = matchCourseToRequirement(transcriptCourse, requirement);

      if (match && (match.confidence === 'exact' || match.confidence === 'high')) {
        matches.push({
          transcriptCourse,
          requirementKey: requirement.requirementKey,
          matchedCourseCode: match.matchedCode,
          confidence: match.confidence,
          dropdownIndex: requirement.dropdownIndex,
        });
        usedCourses.add(transcriptCourse.code);
        break; // Stop after first high-confidence match for this course
      }
    }
  }

  // Second pass: medium confidence matches for remaining courses
  for (const transcriptCourse of transcriptCourses) {
    if (usedCourses.has(transcriptCourse.code)) continue;

    for (const requirement of requirements) {
      const match = matchCourseToRequirement(transcriptCourse, requirement);

      if (match && match.confidence === 'medium') {
        matches.push({
          transcriptCourse,
          requirementKey: requirement.requirementKey,
          matchedCourseCode: match.matchedCode,
          confidence: match.confidence,
          dropdownIndex: requirement.dropdownIndex,
        });
        usedCourses.add(transcriptCourse.code);
        break;
      }
    }
  }

  return matches;
}

/**
 * Groups matches by requirement key for easy application
 */
export function groupMatchesByRequirement(matches: CourseMatch[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  for (const match of matches) {
    if (!grouped[match.requirementKey]) {
      grouped[match.requirementKey] = [];
    }
    grouped[match.requirementKey].push(match.matchedCourseCode);
  }

  return grouped;
}
