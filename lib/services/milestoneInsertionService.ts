/**
 * Milestone Insertion Service
 *
 * Handles programmatic insertion of milestones into AI-generated graduation plans.
 * Milestones are placed based on user timing preferences (beginning, middle, etc.)
 * and ensure "Apply for Graduation" is always included.
 *
 * AUTHORIZATION: INTERNAL SERVICE - Called by openaiService after AI generation
 */

import { EventType } from '@/components/grad-planner/types';

// ============================================================================
// Type Definitions
// ============================================================================

export type MilestoneTiming =
  | 'beginning'
  | 'middle'
  | 'before_last_year'
  | 'after_graduation'
  | 'ai_choose';

export interface MilestoneInput {
  type: EventType;
  title: string;
  timing: MilestoneTiming;
}

export interface MilestoneInPlan {
  id: string;
  type: EventType;
  title: string;
  afterTerm: number;
}

export interface TermInPlan {
  term: string;
  notes?: string;
  courses: unknown[];
  credits_planned: number;
}

export type PlanItem = TermInPlan | MilestoneInPlan;

// ============================================================================
// Type Guards
// ============================================================================

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generates a unique ID for a milestone
 * Format: "milestone-{slug}-{timestamp}"
 */
export function generateMilestoneId(type: EventType, index: number): string {
  const slug = type
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const timestamp = Date.now();
  return `milestone-${slug}-${timestamp}-${index}`;
}

/**
 * Ensures "Apply for Graduation" milestone exists in the list
 * If not present, adds it with "before_last_year" timing
 */
export function ensureApplyForGraduation(
  milestones: MilestoneInput[] | undefined
): MilestoneInput[] {
  const milestoneList = milestones || [];

  // Check if "Apply for Graduation" already exists
  const hasApplyForGraduation = milestoneList.some(
    (m) => m.type === 'Apply for Graduation'
  );

  if (hasApplyForGraduation) {
    return milestoneList;
  }

  // Add "Apply for Graduation" with before_last_year timing
  return [
    ...milestoneList,
    {
      type: 'Apply for Graduation',
      title: 'Apply for Graduation',
      timing: 'before_last_year',
    },
  ];
}

/**
 * Calculates which term a milestone should appear after based on timing preference
 */
export function calculateAfterTerm(
  timing: MilestoneTiming,
  termCount: number,
  occupiedTerms: Set<number>
): number {
  // Handle edge case: empty or single-term plan
  if (termCount <= 0) return 0;
  if (termCount === 1) return 1;

  switch (timing) {
    case 'beginning':
      return 2;

    case 'middle': {
      let middle = Math.floor(termCount / 2);
      // Ensure even number (round down to nearest even)
      if (middle % 2 !== 0 && middle > 2) {
        middle = middle - 1;
      }
      return Math.max(2, Math.min(middle, termCount));
    }

    case 'before_last_year':
      // Place before the final term (after second-to-last term)
      return Math.max(2, termCount - 1);

    case 'after_graduation':
      return termCount;

    case 'ai_choose': {
      // Find first unoccupied term in middle range (25%-75% of plan)
      const start = Math.max(2, Math.floor(termCount / 4));
      const end = Math.min(termCount - 1, Math.floor(3 * termCount / 4));

      for (let i = start; i <= end; i++) {
        if (!occupiedTerms.has(i)) {
          return i;
        }
      }

      // Fallback to middle if all occupied
      return Math.floor(termCount / 2);
    }

    default:
      // Fallback to middle for unknown timing values
      return Math.floor(termCount / 2);
  }
}

/**
 * Converts milestone inputs to milestone objects with calculated positions
 */
function prepareMilestonesForInsertion(
  milestones: MilestoneInput[],
  termCount: number
): MilestoneInPlan[] {
  const occupiedTerms = new Set<number>();
  const preparedMilestones: MilestoneInPlan[] = [];

  milestones.forEach((milestone, index) => {
    const afterTerm = calculateAfterTerm(
      milestone.timing,
      termCount,
      occupiedTerms
    );

    // Note: We don't add to occupiedTerms for non-ai_choose milestones
    // This allows multiple milestones with same timing to be placed together
    if (milestone.timing === 'ai_choose') {
      occupiedTerms.add(afterTerm);
    }

    preparedMilestones.push({
      id: generateMilestoneId(milestone.type, index),
      type: milestone.type,
      title: milestone.title,
      afterTerm,
    });
  });

  return preparedMilestones;
}

/**
 * Merges terms and milestones into a single properly-ordered plan array
 * Terms are sorted by term number, milestones appear after their designated term
 */
export function mergePlanWithMilestones(
  terms: TermInPlan[],
  milestones: MilestoneInPlan[]
): PlanItem[] {
  const result: PlanItem[] = [];

  // Sort terms by term number
  const sortedTerms = [...terms].sort((a, b) => {
    const termA = parseInt(a.term, 10);
    const termB = parseInt(b.term, 10);
    return termA - termB;
  });

  // Group milestones by afterTerm
  const milestonesByTerm = new Map<number, MilestoneInPlan[]>();
  milestones.forEach((milestone) => {
    const existing = milestonesByTerm.get(milestone.afterTerm) || [];
    existing.push(milestone);
    milestonesByTerm.set(milestone.afterTerm, existing);
  });

  // Merge terms and milestones
  sortedTerms.forEach((term) => {
    const termNumber = parseInt(term.term, 10);
    result.push(term);

    // Add any milestones that come after this term
    const milestonesAfterTerm = milestonesByTerm.get(termNumber);
    if (milestonesAfterTerm) {
      result.push(...milestonesAfterTerm);
    }
  });

  // Add any milestones that are after graduation (afterTerm > last term)
  const lastTermNumber = sortedTerms.length > 0
    ? parseInt(sortedTerms[sortedTerms.length - 1].term, 10)
    : 0;

  for (let i = lastTermNumber + 1; i <= lastTermNumber + 10; i++) {
    const afterGradMilestones = milestonesByTerm.get(i);
    if (afterGradMilestones) {
      result.push(...afterGradMilestones);
    }
  }

  return result;
}

/**
 * Main entry point: Inserts milestones into an AI-generated graduation plan
 *
 * @param plan - The AI-generated plan array (terms only, no milestones)
 * @param milestones - User's milestone selections with timing preferences
 * @returns Complete plan array with milestones inserted at appropriate positions
 */
export function insertMilestonesIntoPlan(
  plan: TermInPlan[],
  milestones: MilestoneInput[] | undefined
): PlanItem[] {
  // Handle edge cases
  if (!plan || plan.length === 0) {
    console.warn('⚠️ Empty plan provided to insertMilestonesIntoPlan');
    return plan;
  }

  // Ensure "Apply for Graduation" is in the milestone list
  const completeMilestones = ensureApplyForGraduation(milestones);

  // If no milestones after ensuring Apply for Graduation, just return terms
  if (completeMilestones.length === 0) {
    return plan;
  }

  // Calculate term count
  const termCount = plan.length;

  // Prepare milestones with calculated positions
  const preparedMilestones = prepareMilestonesForInsertion(
    completeMilestones,
    termCount
  );

  // Merge terms and milestones into final plan array
  const finalPlan = mergePlanWithMilestones(plan, preparedMilestones);

  return finalPlan;
}
