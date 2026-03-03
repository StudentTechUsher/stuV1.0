import type { AgentContextSnapshot } from '@/lib/chatbot/grad-plan/v3/types';
import { heuristicVerificationSkill } from '@/lib/grad-plan/skills/heuristic-verification-skill';
import { remainingRequirementsSkill } from '@/lib/grad-plan/skills/remaining-requirements-skill';
import { termEnvelopeSkill } from '@/lib/grad-plan/skills/term-envelope-skill';
import type {
  DeepPartial,
  RuntimeSkill,
  RuntimeSkillInput,
  RuntimeSkillPipelineResult,
  RuntimeSkillResult,
} from '@/lib/grad-plan/skills/types';

const runtimeSkills: RuntimeSkill[] = [
  remainingRequirementsSkill,
  termEnvelopeSkill,
  heuristicVerificationSkill,
];

function mergeSnapshotUpdates(
  base: DeepPartial<AgentContextSnapshot>,
  next: DeepPartial<AgentContextSnapshot>
): DeepPartial<AgentContextSnapshot> {
  return {
    ...base,
    ...next,
    profile: {
      ...(base.profile ?? {}),
      ...(next.profile ?? {}),
    },
    transcript: {
      ...(base.transcript ?? {}),
      ...(next.transcript ?? {}),
    },
    programs: {
      ...(base.programs ?? {}),
      ...(next.programs ?? {}),
    },
    courses: {
      ...(base.courses ?? {}),
      ...(next.courses ?? {}),
    },
    distribution: {
      ...(base.distribution ?? {}),
      ...(next.distribution ?? {}),
    },
    constraints: {
      ...(base.constraints ?? {}),
      ...(next.constraints ?? {}),
    },
    generation: {
      ...(base.generation ?? {}),
      ...(next.generation ?? {}),
    },
    meta: {
      ...(base.meta ?? {}),
      ...(next.meta ?? {}),
    },
  };
}

export function getSkillRegistry(): RuntimeSkill[] {
  return runtimeSkills;
}

export async function runSkillPipeline(
  input: RuntimeSkillInput,
  overrides: {
    skills?: RuntimeSkill[];
  } = {}
): Promise<RuntimeSkillPipelineResult> {
  const skills = overrides.skills ?? runtimeSkills;
  const runnable = skills.filter((skill) => skill.supportsPhase(input.phase) || skill.supportsPhase('any'));

  const results: RuntimeSkillResult[] = [];
  for (const skill of runnable) {
    const result = await skill.run(input);
    results.push(result);
  }

  let mergedUpdates: DeepPartial<AgentContextSnapshot> = {};
  const checks = [] as RuntimeSkillPipelineResult['checks'];
  const suggestedRepairs = [] as RuntimeSkillPipelineResult['suggestedRepairs'];
  const trace = [] as RuntimeSkillPipelineResult['trace'];

  for (const result of results) {
    mergedUpdates = mergeSnapshotUpdates(mergedUpdates, result.updates);
    checks.push(...result.checks);
    suggestedRepairs.push(...result.suggestedRepairs);
    trace.push(...result.trace);
  }

  return {
    results,
    mergedUpdates,
    checks,
    suggestedRepairs,
    trace,
  };
}
