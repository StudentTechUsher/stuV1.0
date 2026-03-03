import { describe, expect, it } from 'vitest';
import { getModelPolicySummary, selectModelForGenerationPhase } from '@/lib/grad-plan/v3/modelPolicy';

describe('v3 model policy routing', () => {
  it('routes major_skeleton to high-context model', () => {
    const decision = selectModelForGenerationPhase('major_skeleton');
    expect(decision.routeClass).toBe('high_context');
  });

  it('routes deterministic fill phases to lightweight model', () => {
    const decision = selectModelForGenerationPhase('major_fill');
    expect(decision.routeClass).toBe('lightweight');
  });

  it('routes verify_heuristics to high-context model', () => {
    const decision = selectModelForGenerationPhase('verify_heuristics');
    expect(decision.routeClass).toBe('high_context');
  });

  it('returns policy summary with both model classes', () => {
    const summary = getModelPolicySummary();
    expect(summary.highContextPhases.length).toBeGreaterThan(0);
    expect(summary.lightweightPhases.length).toBeGreaterThan(0);
  });
});
