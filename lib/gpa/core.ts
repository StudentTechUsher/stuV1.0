/**
 * Core GPA calculation functions for the prediction calculator
 * Implements the mathematical model for required grades and distribution
 */

import { gp, GradeKey, ALL_GRADES } from './gradeScale';

/**
 * Represents a remaining course in the graduation plan
 */
export type RemainingCourse = {
  id?: string;
  credits: number;
  goalGrade?: GradeKey | null;
};

/**
 * Compute cumulative GPA totals from completed transcript courses
 * @param rows - Array of completed courses with credits and grades
 * @returns Object with completed credits, quality points, and current GPA
 */
export function computeTotalsFromTranscript(
  rows: Array<{ credits: number; grade: GradeKey }>
): {
  completedCredits: number;
  completedQualityPoints: number;
  currentGpa: number;
} {
  const completedCredits = rows.reduce((sum, row) => sum + row.credits, 0);
  const completedQualityPoints = rows.reduce(
    (sum, row) => sum + row.credits * gp(row.grade),
    0
  );
  const currentGpa = completedCredits > 0 ? completedQualityPoints / completedCredits : 0;

  return {
    completedCredits,
    completedQualityPoints,
    currentGpa,
  };
}

/**
 * Calculate the total quality points needed at graduation to hit target GPA
 * @param completedCredits - Credits already completed
 * @param completedQP - Quality points already earned
 * @param remainingCredits - Credits still to be completed
 * @param targetGpa - Target GPA at graduation
 * @returns Total QP needed at graduation
 */
export function requiredQPAtGraduation(
  completedCredits: number,
  completedQP: number,
  remainingCredits: number,
  targetGpa: number
): number {
  const totalCredits = completedCredits + remainingCredits;
  const qpTarget = targetGpa * totalCredits;
  return Math.max(0, qpTarget - completedQP);
}

/**
 * Partition remaining courses into locked (with goal grades) and free courses
 * @param remaining - Array of remaining courses
 * @returns Object with locked course stats and free course list
 */
export function lockFromGoals(remaining: RemainingCourse[]): {
  C_locked: number;
  QP_locked: number;
  free: RemainingCourse[];
} {
  let C_locked = 0;
  let QP_locked = 0;
  const free: RemainingCourse[] = [];

  for (const course of remaining) {
    if (course.goalGrade) {
      C_locked += course.credits;
      QP_locked += course.credits * gp(course.goalGrade);
    } else {
      free.push(course);
    }
  }

  return { C_locked, QP_locked, free };
}

/**
 * Distribution result from the greedy fill algorithm
 */
export type DistributionResult = {
  feasible: boolean;
  requiredAvg: number;
  qualityPointsNeeded: number;
  distribution: Record<GradeKey, number>;
  message?: string;
};

/**
 * Compute required grade distribution using greedy fill algorithm
 * Sorts free courses by credits (desc) and assigns grades A→E greedily
 *
 * @param completedCredits - Credits already completed
 * @param completedQP - Quality points already earned
 * @param remaining - Array of remaining courses (may have locked goal grades)
 * @param targetGpa - Target GPA at graduation
 * @returns Distribution result with feasibility, required avg, and grade counts
 */
export function distributionForTarget(
  completedCredits: number,
  completedQP: number,
  remaining: RemainingCourse[],
  targetGpa: number
): DistributionResult {
  const C_left = remaining.reduce((sum, r) => sum + r.credits, 0);

  // No remaining courses: check if target already met
  if (C_left <= 0) {
    const feasible = completedQP >= targetGpa * completedCredits;
    return {
      feasible,
      requiredAvg: 0,
      qualityPointsNeeded: 0,
      distribution: {} as Record<GradeKey, number>,
      message: feasible
        ? 'You have no remaining courses. Your current GPA exceeds your target.'
        : 'You have no remaining courses. Your current GPA is below your target.',
    };
  }

  // Partition locked and free courses
  const { C_locked, QP_locked, free } = lockFromGoals(remaining);

  const totalCredits = completedCredits + C_left;
  const qpTarget = targetGpa * totalCredits;

  // Calculate QP needed for free courses only
  const qpNeededRemaining = Math.max(0, qpTarget - (completedQP + QP_locked));
  const C_free = C_left - C_locked;


  // All remaining courses are locked: check feasibility only
  if (C_free <= 0) {
    const feasible = qpNeededRemaining <= 0;
    return {
      feasible,
      requiredAvg: 0,
      qualityPointsNeeded: Math.max(0, qpNeededRemaining),
      distribution: {} as Record<GradeKey, number>,
      message: feasible
        ? 'All remaining courses have goal grades set. Your target is achievable.'
        : 'All remaining courses have goal grades set. Your target is not achievable with these grades.',
    };
  }

  const requiredAvg = C_free > 0 ? qpNeededRemaining / C_free : 0;

  // Unattainable: average needed exceeds 4.0
  if (requiredAvg > 4.0) {
    return {
      feasible: false,
      requiredAvg,
      qualityPointsNeeded: qpNeededRemaining,
      distribution: {} as Record<GradeKey, number>,
      message: `This target is impossible. You would need an average of ${requiredAvg.toFixed(2)} GPA on remaining courses, but the maximum is 4.0.`,
    };
  }

  // Greedy fill: assign grades to free courses
  const dist: Record<GradeKey, number> = Object.fromEntries(
    ALL_GRADES.map((g) => [g, 0])
  ) as Record<GradeKey, number>;

  // Sort free courses by credits (descending) to reduce rounding error
  const sortedFree = [...free].sort((a, b) => b.credits - a.credits);

  let qpAccumulated = 0;
  const gradeAssignments: { course: RemainingCourse; grade: GradeKey }[] = [];

  for (let courseIdx = 0; courseIdx < sortedFree.length; courseIdx++) {
    const course = sortedFree[courseIdx];
    const remainingQPAfterThis = qpNeededRemaining - qpAccumulated;
    const remainingCoursesAfterThis = sortedFree.length - courseIdx - 1;
    const remainingCreditsAfterThis = remainingCoursesAfterThis > 0
      ? sortedFree.slice(courseIdx + 1).reduce((sum, c) => sum + c.credits, 0)
      : 0;

    let selectedGrade: GradeKey = 'A'; // Default to highest grade (safest)

    // Try grades from LOWEST (E) to HIGHEST (A)
    // Pick the LOWEST grade that still allows reaching target with remaining courses
    for (let i = ALL_GRADES.length - 1; i >= 0; i--) {
      const grade = ALL_GRADES[i];
      const qpIfWeChooseThisGrade = course.credits * gp(grade);
      const qpStillNeeded = remainingQPAfterThis - qpIfWeChooseThisGrade;

      // Can we cover the remaining QP with A's on remaining courses?
      const maxQPFromRemainingCourses = remainingCreditsAfterThis * 4.0;

      if (qpStillNeeded <= maxQPFromRemainingCourses) {
        selectedGrade = grade;
        break; // Found the lowest grade that works - stop here
      }
    }

    gradeAssignments.push({ course, grade: selectedGrade });
    dist[selectedGrade] = (dist[selectedGrade] ?? 0) + 1;
    qpAccumulated += course.credits * gp(selectedGrade);
  }

  const feasible = qpAccumulated >= qpNeededRemaining;

  return {
    feasible,
    requiredAvg,
    qualityPointsNeeded: Math.max(0, qpNeededRemaining - qpAccumulated),
    distribution: dist,
  };
}

/**
 * Format a distribution record as human-readable sentence
 * E.g., { A: 15, B: 3, C: 1 } → "You need 15 A, 3 B, 1 C"
 * @param distribution - Grade counts
 * @returns Formatted string
 */
export function formatDistributionMessage(
  distribution: Record<GradeKey, number>
): string {
  const parts: string[] = [];

  for (const grade of ALL_GRADES) {
    const count = distribution[grade] ?? 0;
    if (count > 0) {
      const gradeStr = count === 1 ? grade : `${grade}s`;
      parts.push(`${count} ${gradeStr}`);
    }
  }

  if (parts.length === 0) {
    return 'No specific grade distribution needed.';
  }

  if (parts.length === 1) {
    return `You need ${parts[0]}.`;
  }

  const lastPart = parts.pop()!;
  return `You need ${parts.join(', ')}, and ${lastPart}.`;
}
