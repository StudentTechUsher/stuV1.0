import type { DraftPlanTerm, RuntimeSkill, RuntimeSkillCheck, RuntimeSkillRepairHint, RuntimeSkillResult } from '@/lib/grad-plan/skills/types';
import type { TraceEvent } from '@/lib/chatbot/grad-plan/v3/types';

function termCredits(term: DraftPlanTerm): number {
  return term.plannedCourses.reduce((sum, course) => sum + course.credits, 0);
}

function buildTrace(message: string, payload: Record<string, unknown>, level: TraceEvent['level'] = 'info'): TraceEvent {
  return {
    id: `trace-heuristics-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : 'local',
    ts: new Date().toISOString(),
    level,
    scope: 'validation',
    phase: (payload.phase as TraceEvent['phase']) ?? null,
    message,
    payload,
    redacted: true,
  };
}

export const heuristicVerificationSkill: RuntimeSkill = {
  name: 'heuristic-verification-skill',
  supportsPhase: (phase) => phase === 'verify_heuristics' || phase === 'repair' || phase === 'any',
  run(input): RuntimeSkillResult {
    const checks: RuntimeSkillCheck[] = [];
    const suggestedRepairs: RuntimeSkillRepairHint[] = [];

    if (!input.draftPlan || input.draftPlan.terms.length === 0) {
      return {
        skillName: 'heuristic-verification-skill',
        updates: {},
        checks: [
          {
            id: 'verify-no-plan',
            status: 'fail',
            message: 'No draft plan supplied for heuristics validation',
          },
        ],
        suggestedRepairs: [
          {
            phase: 'major_skeleton',
            reason: 'Regenerate base skeleton before validation',
            priority: 1,
          },
        ],
        trace: [
          buildTrace('heuristic-verification failed due to missing draft plan', {
            sessionId: input.snapshot.meta.sessionId,
            phase: input.phase,
          }, 'error'),
        ],
      };
    }

    const seen = new Set<string>();
    const duplicates = new Set<string>();
    const plannedCodes = new Set<string>();

    for (const term of input.draftPlan.terms) {
      for (const course of term.plannedCourses) {
        plannedCodes.add(course.courseCode);
        if (seen.has(course.courseCode)) {
          duplicates.add(course.courseCode);
        }
        seen.add(course.courseCode);
      }
    }

    if (duplicates.size > 0) {
      const duplicateCodes = [...duplicates];
      checks.push({
        id: 'verify-duplicate-courses',
        status: 'fail',
        message: 'Duplicate planned course codes found across terms',
        details: { duplicateCodes },
      });
      suggestedRepairs.push({
        phase: 'major_fill',
        reason: 'Remove duplicate course placements',
        priority: 1,
      });
    }

    const completedCodes = new Set(input.snapshot.transcript.completedCourseCodes);
    const completedLeakage = [...plannedCodes].filter((code) => completedCodes.has(code));
    if (completedLeakage.length > 0) {
      checks.push({
        id: 'verify-completed-course-leakage',
        status: 'fail',
        message: 'Transcript-completed courses were re-planned',
        details: { completedLeakage },
      });
      suggestedRepairs.push({
        phase: 'gen_ed_fill',
        reason: 'Exclude transcript-completed courses from plan',
        priority: 1,
      });
    }

    const missingBuckets: string[] = [];
    for (const bucket of input.snapshot.courses.requirementBuckets) {
      const satisfied = bucket.candidateCourseCodes.some((code) => plannedCodes.has(code));
      if (bucket.remainingCredits > 0 && !satisfied) {
        missingBuckets.push(bucket.bucketKey);
      }
    }
    if (missingBuckets.length > 0) {
      checks.push({
        id: 'verify-missing-requirement-buckets',
        status: 'fail',
        message: 'One or more requirement buckets remain unsatisfied in draft plan',
        details: { missingBuckets },
      });
      suggestedRepairs.push({
        phase: 'major_fill',
        reason: 'Refill missing requirement buckets',
        priority: 1,
      });
    }

    const minCredits = input.snapshot.distribution.minCreditsPerTerm ?? 0;
    const maxCredits = input.snapshot.distribution.maxCreditsPerTerm ?? Number.POSITIVE_INFINITY;
    const envelopeViolations: Array<{ termId: string; credits: number; min: number; max: number }> = [];

    for (const term of input.draftPlan.terms) {
      const credits = termCredits(term);
      if (credits < minCredits || credits > maxCredits) {
        envelopeViolations.push({
          termId: term.termId,
          credits,
          min: minCredits,
          max: Number.isFinite(maxCredits) ? maxCredits : Number.MAX_SAFE_INTEGER,
        });
      }
    }

    if (envelopeViolations.length > 0) {
      checks.push({
        id: 'verify-credit-envelope',
        status: 'fail',
        message: 'One or more terms violate selected credit envelope',
        details: { envelopeViolations },
      });
      suggestedRepairs.push({
        phase: 'elective_fill',
        reason: 'Rebalance term loads to satisfy credit envelope',
        priority: 2,
      });
    }

    if (checks.length === 0) {
      checks.push({
        id: 'verify-all-passed',
        status: 'pass',
        message: 'All deterministic heuristics passed',
      });
    }

    const hasFailures = checks.some((check) => check.status === 'fail');

    return {
      skillName: 'heuristic-verification-skill',
      updates: {},
      checks,
      suggestedRepairs: suggestedRepairs
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5),
      trace: [
        buildTrace(
          hasFailures ? 'heuristic verification found violations' : 'heuristic verification passed',
          {
            sessionId: input.snapshot.meta.sessionId,
            phase: input.phase,
            failures: checks.filter((check) => check.status === 'fail').map((check) => check.id),
          },
          hasFailures ? 'warn' : 'info'
        ),
      ],
    };
  },
};
