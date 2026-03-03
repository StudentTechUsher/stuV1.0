import type { V3GenerationPhase } from '@/lib/chatbot/grad-plan/v3/types';

export type ModelRouteClass = 'high_context' | 'lightweight';

export type ModelRouteDecision = {
  model: string;
  routeClass: ModelRouteClass;
  reason: string;
  maxOutputTokens: number;
};

const HIGH_CONTEXT_MODEL = process.env.OPENAI_GRAD_PLAN_HIGH_CONTEXT_MODEL || 'gpt-5';
const LIGHTWEIGHT_MODEL = process.env.OPENAI_GRAD_PLAN_LIGHT_MODEL || 'gpt-5-mini';

const HIGH_CONTEXT_PHASES = new Set<V3GenerationPhase>([
  'major_skeleton',
  'verify_heuristics',
]);

const LIGHTWEIGHT_PHASES = new Set<V3GenerationPhase>([
  'major_fill',
  'minor_fill',
  'gen_ed_fill',
  'elective_fill',
]);

export function selectModelForGenerationPhase(phase: V3GenerationPhase): ModelRouteDecision {
  if (HIGH_CONTEXT_PHASES.has(phase)) {
    return {
      model: HIGH_CONTEXT_MODEL,
      routeClass: 'high_context',
      reason: 'Phase has global constraint reasoning and long-context dependencies',
      maxOutputTokens: 24_000,
    };
  }

  if (LIGHTWEIGHT_PHASES.has(phase)) {
    return {
      model: LIGHTWEIGHT_MODEL,
      routeClass: 'lightweight',
      reason: 'Phase is deterministic fill from bounded requirement sets',
      maxOutputTokens: 12_000,
    };
  }

  return {
    model: LIGHTWEIGHT_MODEL,
    routeClass: 'lightweight',
    reason: 'Non-reasoning phase does not require high context',
    maxOutputTokens: 8_000,
  };
}

export function getModelPolicySummary() {
  return {
    highContextModel: HIGH_CONTEXT_MODEL,
    lightweightModel: LIGHTWEIGHT_MODEL,
    highContextPhases: [...HIGH_CONTEXT_PHASES],
    lightweightPhases: [...LIGHTWEIGHT_PHASES],
  };
}
