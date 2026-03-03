import type { TraceEvent } from '@/lib/chatbot/grad-plan/v3/types';
import type {
  DraftPlanTerm,
  RuntimeSkill,
  RuntimeSkillCheck,
  RuntimeSkillRepairHint,
  RuntimeSkillResult,
} from '@/lib/grad-plan/skills/types';

function sumTermCredits(term: DraftPlanTerm): number {
  return term.plannedCourses.reduce((sum, course) => sum + course.credits, 0);
}

function buildTrace(message: string, payload: Record<string, unknown>): TraceEvent {
  return {
    id: `trace-term-envelope-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : 'local',
    ts: new Date().toISOString(),
    level: 'info',
    scope: 'skill',
    phase: (payload.phase as TraceEvent['phase']) ?? null,
    message,
    payload,
    redacted: true,
  };
}

export const termEnvelopeSkill: RuntimeSkill = {
  name: 'term-envelope-skill',
  supportsPhase: (phase) => phase === 'elective_fill' || phase === 'verify_heuristics' || phase === 'any',
  run(input): RuntimeSkillResult {
    if (!input.draftPlan || input.draftPlan.terms.length === 0) {
      return {
        skillName: 'term-envelope-skill',
        updates: {},
        checks: [
          {
            id: 'term-envelope-missing-draft-plan',
            status: 'warn',
            message: 'No draft plan terms supplied for term-envelope validation',
          },
        ],
        suggestedRepairs: [],
        trace: [
          buildTrace('term-envelope-skill skipped due to missing draft plan', {
            sessionId: input.snapshot.meta.sessionId,
            phase: input.phase,
          }),
        ],
      };
    }

    const minCredits = input.snapshot.distribution.minCreditsPerTerm ?? 0;
    const maxCredits = input.snapshot.distribution.maxCreditsPerTerm ?? Number.POSITIVE_INFINITY;

    const checks: RuntimeSkillCheck[] = [];
    const suggestedRepairs: RuntimeSkillRepairHint[] = [];

    for (const term of input.draftPlan.terms) {
      const credits = sumTermCredits(term);
      if (credits < minCredits) {
        checks.push({
          id: `term-under-min-${term.termId}`,
          status: 'warn',
          message: `Term ${term.termLabel} is under the minimum credit envelope`,
          details: {
            termId: term.termId,
            termLabel: term.termLabel,
            credits,
            minCredits,
          },
        });
        suggestedRepairs.push({
          phase: 'elective_fill',
          reason: `Increase credits in ${term.termLabel} to satisfy min credits`,
          priority: 2,
        });
      }

      if (credits > maxCredits) {
        checks.push({
          id: `term-over-max-${term.termId}`,
          status: 'fail',
          message: `Term ${term.termLabel} exceeds max credits`,
          details: {
            termId: term.termId,
            termLabel: term.termLabel,
            credits,
            maxCredits,
          },
        });
        suggestedRepairs.push({
          phase: 'elective_fill',
          reason: `Reduce credits in ${term.termLabel} to max ${maxCredits}`,
          priority: 1,
        });
      }
    }

    if (checks.length === 0) {
      checks.push({
        id: 'term-envelope-ok',
        status: 'pass',
        message: 'All terms are within selected credit envelope',
      });
    }

    return {
      skillName: 'term-envelope-skill',
      updates: {},
      checks,
      suggestedRepairs,
      trace: [
        buildTrace('term-envelope-skill completed', {
          sessionId: input.snapshot.meta.sessionId,
          phase: input.phase,
          checks: checks.length,
          failed: checks.filter((check) => check.status === 'fail').length,
        }),
      ],
    };
  },
};
