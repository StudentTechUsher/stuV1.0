import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import type { GenerationPhase } from '@/lib/chatbot/grad-plan/types';
import type { AutomaticRepairPhase, AutomaticValidationResult } from '@/lib/grad-plan/automaticPlanValidator';

type PhasePayload = Record<string, unknown>;

type NormalizedPlan = {
  plan: Array<{
    term: string;
    courses: Array<Record<string, unknown>>;
    credits_planned?: number;
    metadata?: Record<string, unknown>;
  }>;
  plan_metadata?: Record<string, unknown>;
};

const phaseOrder: AutomaticRepairPhase[] = [
  'major_fill',
  'minor_fill',
  'gen_ed_fill',
  'elective_fill',
];

const workflowInputSchema = z.object({
  jobId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()),
});

const planTermSchema = z.object({
  term: z.string(),
  courses: z.array(z.record(z.string(), z.unknown())),
  credits_planned: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const planSchema = z.object({
  plan: z.array(planTermSchema),
  plan_metadata: z.record(z.string(), z.unknown()).optional(),
});

const planStateSchema = workflowInputSchema.extend({
  currentPlan: planSchema.optional(),
});

const finalizedPlanStateSchema = workflowInputSchema.extend({
  currentPlan: planSchema,
});

const workflowOutputSchema = z.object({
  accessId: z.string(),
  finalPlan: planSchema,
});

export class WorkflowValidationError extends Error {
  constructor(
    public readonly result: AutomaticValidationResult,
    public readonly attempts: number
  ) {
    super(`Heuristics validation failed after ${attempts} repair attempts`);
    this.name = 'WorkflowValidationError';
  }
}

export type AutomaticWorkflowDeps = {
  onPhaseStarted?: (phase: GenerationPhase, progressPercent: number, message: string) => Promise<void> | void;
  onPhaseCompleted?: (phase: GenerationPhase, progressPercent: number, message: string) => Promise<void> | void;
  runPhase: (args: {
    phase: 'major_skeleton' | AutomaticRepairPhase;
    payload: PhasePayload;
    draftPlan?: Record<string, unknown>;
  }) => Promise<unknown>;
  validatePlan: (args: {
    payload: PhasePayload;
    finalPlan: NormalizedPlan;
  }) => Promise<AutomaticValidationResult> | AutomaticValidationResult;
  persistPlan: (args: {
    payload: PhasePayload;
    finalPlan: Record<string, unknown>;
  }) => Promise<{ accessId: string }>;
};

function normalizePlanOutput(raw: unknown): NormalizedPlan {
  const normalizeTerms = (
    input: unknown[],
    readLabel: (term: Record<string, unknown>) => string | null,
    readCredits: (term: Record<string, unknown>, courses: Array<Record<string, unknown>>) => number | undefined
  ): NormalizedPlan['plan'] => {
    const normalized: NormalizedPlan['plan'] = [];

    for (const term of input) {
      if (!term || typeof term !== 'object') continue;
      const cast = term as Record<string, unknown>;
      const label = readLabel(cast);
      if (!label) continue;

      const courses = Array.isArray(cast.courses)
        ? cast.courses.filter(course => course && typeof course === 'object') as Array<Record<string, unknown>>
        : [];

      const entry: NormalizedPlan['plan'][number] = {
        term: label,
        courses,
      };

      const creditsPlanned = readCredits(cast, courses);
      if (typeof creditsPlanned === 'number') {
        entry.credits_planned = creditsPlanned;
      }

      if (cast.metadata && typeof cast.metadata === 'object') {
        entry.metadata = cast.metadata as Record<string, unknown>;
      }

      normalized.push(entry);
    }

    return normalized;
  };

  if (raw && typeof raw === 'object' && Array.isArray((raw as { plan?: unknown }).plan)) {
    const root = raw as { plan: unknown[]; plan_metadata?: unknown };
    const plan = normalizeTerms(
      root.plan,
      term => (typeof term.term === 'string' ? term.term : typeof term.label === 'string' ? term.label : null),
      term => (typeof term.credits_planned === 'number' ? term.credits_planned : undefined)
    );

    if (plan.length > 0) {
      return {
        plan,
        plan_metadata: root.plan_metadata && typeof root.plan_metadata === 'object'
          ? root.plan_metadata as Record<string, unknown>
          : undefined,
      };
    }
  }

  if (raw && typeof raw === 'object' && Array.isArray((raw as { terms?: unknown }).terms)) {
    const terms = normalizeTerms(
      (raw as { terms: unknown[] }).terms,
      term => (typeof term.label === 'string' ? term.label : typeof term.term === 'string' ? term.term : null),
      (_term, courses) => courses.reduce((sum, course) => {
        const credits = course.credits;
        if (typeof credits === 'number') return sum + credits;
        if (typeof credits === 'string') {
          const parsed = Number.parseFloat(credits);
          return Number.isNaN(parsed) ? sum : sum + parsed;
        }
        return sum;
      }, 0)
    );

    if (terms.length > 0) {
      return { plan: terms };
    }
  }

  if (Array.isArray(raw)) {
    const plan = normalizeTerms(
      raw,
      term => (typeof term.term === 'string' ? term.term : null),
      term => (typeof term.credits_planned === 'number' ? term.credits_planned : undefined)
    );

    if (plan.length > 0) {
      return { plan };
    }
  }

  throw new Error('Unable to normalize AI phase output into a plan');
}

function validateFinalPlan(finalPlan: NormalizedPlan) {
  const seen = new Set<string>();
  for (const term of finalPlan.plan) {
    const key = term.term.toLowerCase().trim();
    if (seen.has(key)) {
      throw new Error(`Duplicate term label detected: ${term.term}`);
    }
    seen.add(key);
  }
}

function toSuggestedDistributionMap(payload: PhasePayload) {
  const ranges = new Map<string, Record<string, unknown>>();
  const suggested = Array.isArray(payload.suggestedDistribution) ? payload.suggestedDistribution : [];
  for (const raw of suggested) {
    if (!raw || typeof raw !== 'object') continue;
    const term = raw as Record<string, unknown>;
    const termLabel = typeof term.term === 'string' ? term.term.trim() : '';
    const year = typeof term.year === 'number' ? term.year : null;
    if (!termLabel) continue;
    const key = year && !termLabel.match(/\d{4}/)
      ? `${termLabel} ${year}`.toLowerCase()
      : termLabel.toLowerCase();
    ranges.set(key, term);
  }
  return ranges;
}

function addSkeletonMetadata(plan: NormalizedPlan, payload: PhasePayload): NormalizedPlan {
  const distributionMap = toSuggestedDistributionMap(payload);
  const genEdStrategy = typeof payload.genEdDistribution === 'string' ? payload.genEdDistribution : 'balanced';
  const transcriptState = payload.hasTranscript ? 'included' : 'excluded';
  const planStartTerm = typeof payload.planStartTerm === 'string' ? payload.planStartTerm : null;
  const planStartYear = typeof payload.planStartYear === 'number' ? payload.planStartYear : null;

  const termsWithMetadata = plan.plan.map(term => {
    const dist = distributionMap.get(term.term.toLowerCase());
    const creditDistribution = dist
      ? {
          min: typeof dist.minCredits === 'number' ? dist.minCredits : null,
          max: typeof dist.maxCredits === 'number' ? dist.maxCredits : null,
          target: typeof dist.suggestedCredits === 'number' ? dist.suggestedCredits : null,
        }
      : null;

    return {
      ...term,
      metadata: {
        ...(term.metadata || {}),
        term_type: dist && typeof dist.termType === 'string' ? dist.termType : 'planned',
        credit_distribution: creditDistribution,
        gen_ed_strategy: genEdStrategy,
      },
    };
  });

  return {
    ...plan,
    plan_metadata: {
      ...(plan.plan_metadata || {}),
      transcript_state: transcriptState,
      plan_start_term: planStartTerm,
      plan_start_year: planStartYear,
      gen_ed_strategy: genEdStrategy,
    },
    plan: termsWithMetadata,
  };
}

async function executePhase(args: {
  phase: 'major_skeleton' | AutomaticRepairPhase;
  startProgress: number;
  endProgress: number;
  startMessage: string;
  completeMessage: string;
  payload: PhasePayload;
  currentPlan?: NormalizedPlan;
  deps: AutomaticWorkflowDeps;
}): Promise<NormalizedPlan> {
  const {
    phase,
    startProgress,
    endProgress,
    startMessage,
    completeMessage,
    payload,
    currentPlan,
    deps,
  } = args;

  await deps.onPhaseStarted?.(phase, startProgress, startMessage);
  const rawOutput = await deps.runPhase({
    phase,
    payload,
    draftPlan: currentPlan as unknown as Record<string, unknown> | undefined,
  });
  const normalized = normalizePlanOutput(rawOutput);
  await deps.onPhaseCompleted?.(phase, endProgress, completeMessage);
  return phase === 'major_skeleton'
    ? addSkeletonMetadata(normalized, payload)
    : normalized;
}

export async function runAutomaticGradPlanWorkflow(args: {
  jobId: string;
  payload: PhasePayload;
  deps: AutomaticWorkflowDeps;
}): Promise<{ accessId: string; finalPlan: NormalizedPlan }> {
  const { jobId, payload, deps } = args;

  const prepareInputStep = createStep({
    id: 'prepare_input',
    inputSchema: workflowInputSchema,
    outputSchema: planStateSchema,
    execute: async ({ inputData }) => {
      await deps.onPhaseStarted?.('preparing', 5, 'Normalizing generation payload');
      await deps.onPhaseCompleted?.('preparing', 5, 'Generation payload normalized');
      return { ...inputData, currentPlan: undefined };
    },
  });

  const buildPlanStep = createStep({
    id: 'build_plan',
    inputSchema: planStateSchema,
    outputSchema: finalizedPlanStateSchema,
    execute: async ({ inputData }) => {
      let currentPlan = await executePhase({
        phase: 'major_skeleton',
        startProgress: 12,
        endProgress: 15,
        startMessage: 'Generating major skeleton',
        completeMessage: 'Major skeleton complete',
        payload: inputData.payload,
        deps,
      });

      currentPlan = await executePhase({
        phase: 'major_fill',
        startProgress: 30,
        endProgress: 35,
        startMessage: 'Placing remaining major requirements',
        completeMessage: 'Major requirements placed',
        payload: inputData.payload,
        currentPlan,
        deps,
      });

      currentPlan = await executePhase({
        phase: 'minor_fill',
        startProgress: 45,
        endProgress: 50,
        startMessage: 'Placing remaining minor requirements',
        completeMessage: 'Minor requirements placed',
        payload: inputData.payload,
        currentPlan,
        deps,
      });

      currentPlan = await executePhase({
        phase: 'gen_ed_fill',
        startProgress: 60,
        endProgress: 65,
        startMessage: 'Placing remaining general education requirements',
        completeMessage: 'General education requirements placed',
        payload: inputData.payload,
        currentPlan,
        deps,
      });

      currentPlan = await executePhase({
        phase: 'elective_fill',
        startProgress: 75,
        endProgress: 80,
        startMessage: 'Placing electives and balancing term load',
        completeMessage: 'Elective balancing complete',
        payload: inputData.payload,
        currentPlan,
        deps,
      });

      await deps.onPhaseStarted?.('verify_heuristics', 88, 'Verifying plan heuristics');
      let validation = await deps.validatePlan({
        payload: inputData.payload,
        finalPlan: currentPlan,
      });

      let repairAttempts = 0;
      while (!validation.valid && repairAttempts < 2) {
        const targetPhases = validation.suggestedRepairPhases.length > 0
          ? validation.suggestedRepairPhases
          : ['elective_fill'];
        const repairProgress = Math.min(91, 89 + repairAttempts);
        for (const repairPhase of phaseOrder) {
          if (!targetPhases.includes(repairPhase)) continue;
          currentPlan = await executePhase({
            phase: repairPhase,
            startProgress: repairProgress,
            endProgress: repairProgress,
            startMessage: `Repair pass ${repairAttempts + 1}: running ${repairPhase.replace('_', ' ')}`,
            completeMessage: `Repair pass ${repairAttempts + 1}: ${repairPhase.replace('_', ' ')} complete`,
            payload: inputData.payload,
            currentPlan,
            deps,
          });
        }
        repairAttempts += 1;
        validation = await deps.validatePlan({
          payload: inputData.payload,
          finalPlan: currentPlan,
        });
      }

      if (!validation.valid) {
        throw new WorkflowValidationError(validation, repairAttempts);
      }

      await deps.onPhaseCompleted?.('verify_heuristics', 92, 'Plan heuristics validated');

      return {
        ...inputData,
        currentPlan,
      };
    },
  });

  const persistStep = createStep({
    id: 'persist_final_plan',
    inputSchema: finalizedPlanStateSchema,
    outputSchema: workflowOutputSchema,
    execute: async ({ inputData }) => {
      await deps.onPhaseStarted?.('persisting', 97, 'Persisting final plan');
      validateFinalPlan(inputData.currentPlan);
      const { accessId } = await deps.persistPlan({
        payload: inputData.payload,
        finalPlan: inputData.currentPlan as unknown as Record<string, unknown>,
      });
      await deps.onPhaseCompleted?.('completed', 100, 'Plan persisted successfully');
      return {
        accessId,
        finalPlan: inputData.currentPlan,
      };
    },
  });

  const workflow = createWorkflow({
    id: 'automatic-grad-plan-generation',
    inputSchema: workflowInputSchema,
    outputSchema: workflowOutputSchema,
  })
    .then(prepareInputStep)
    .then(buildPlanStep)
    .then(persistStep)
    .commit();

  const run = await workflow.createRun({
    runId: jobId,
    resourceId: jobId,
  });

  const result = await run.start({
    inputData: {
      jobId,
      payload,
    },
  });

  if (result.status !== 'success' || !result.result) {
    const failureMessage = 'error' in result && result.error instanceof Error
      ? result.error.message
      : 'Workflow execution failed';
    throw new Error(failureMessage);
  }

  const parsed = workflowOutputSchema.safeParse(result.result);
  if (!parsed.success) {
    throw new Error('Workflow output validation failed');
  }

  return parsed.data;
}
