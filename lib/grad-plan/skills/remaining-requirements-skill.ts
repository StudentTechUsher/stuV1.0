import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  type TraceEvent,
} from '@/lib/chatbot/grad-plan/v3/types';
import type {
  RuntimeSkill,
  RuntimeSkillResult,
} from '@/lib/grad-plan/skills/types';

function buildTraceEvent(message: string, payload: Record<string, unknown>): TraceEvent {
  return {
    id: `trace-remaining-${Date.now()}`,
    sessionId: payload.sessionId as string || 'local',
    ts: new Date().toISOString(),
    level: 'info',
    scope: 'skill',
    phase: payload.phase as TraceEvent['phase'] || null,
    message,
    payload,
    redacted: true,
  };
}

export const remainingRequirementsSkill: RuntimeSkill = {
  name: 'remaining-requirements-skill',
  supportsPhase: (phase) =>
    phase === 'major_fill' ||
    phase === 'minor_fill' ||
    phase === 'gen_ed_fill' ||
    phase === 'verify_heuristics' ||
    phase === 'any',
  run(input): RuntimeSkillResult {
    const requirementBuckets = input.snapshot.courses.requirementBuckets;
    const remainingRequirementCredits = requirementBuckets.reduce((sum, bucket) => {
      const remaining = Math.max(0, bucket.requiredCredits - bucket.completedCredits);
      return sum + remaining;
    }, 0);

    const requestedElectiveCredits = input.snapshot.courses.requestedElectiveCredits;
    const totalCreditsToComplete = remainingRequirementCredits + requestedElectiveCredits;

    const checks = [
      {
        id: 'remaining-credits-recomputed',
        status: 'pass' as const,
        message: 'Remaining requirement credits recomputed from bucket diff',
        details: {
          remainingRequirementCredits,
          requestedElectiveCredits,
          totalCreditsToComplete,
        },
      },
    ];

    return {
      skillName: 'remaining-requirements-skill',
      updates: {
        schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
        courses: {
          ...input.snapshot.courses,
          remainingRequirementCredits,
          totalCreditsToComplete,
        },
      },
      checks,
      suggestedRepairs: [],
      trace: [
        buildTraceEvent('remaining-requirements-skill completed', {
          sessionId: input.snapshot.meta.sessionId,
          phase: input.phase,
          remainingRequirementCredits,
          totalCreditsToComplete,
        }),
      ],
    };
  },
};
