import 'server-only';

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { GetAiPrompt, InsertGeneratedGradPlan } from '@/lib/services/aiDbService';
import {
  DEFAULT_ACTIVE_FEEDBACK_PROMPT,
  injectActiveFeedbackPromptValues,
  loadActiveFeedbackExampleStructure,
} from '@/lib/grad-plan/activeFeedbackPrompt';
import {
  validateAutomaticPlan,
  type AutomaticRepairPhase,
  type AutomaticValidationResult,
} from '@/lib/grad-plan/automaticPlanValidator';
import {
  appendV3ContextEvent,
  appendV3TraceEvent,
  getV3Session,
} from '@/lib/services/gradPlanV3ContextService';
import {
  buildV3AutomaticGenerationPayload,
  buildProgramRequirements,
  normalizeTranscriptCourses,
  type PipelineProgramRow,
} from '@/lib/grad-plan/v3/dataPipeline';
import { fetchUserCoursesArray } from '@/lib/services/userCoursesService';
import { selectModelForGenerationPhase } from '@/lib/grad-plan/v3/modelPolicy';
import { runSkillPipeline, type DraftPlan, type RuntimeSkillPhase } from '@/lib/grad-plan/skills';
import {
  captureV3CompletionMetric,
  captureV3PhaseLatency,
  captureV3RepairLoopMetric,
} from '@/lib/observability/gradPlanV3Metrics';
import type {
  AgentContextSnapshot,
  ContextEventType,
  V3GenerationCommand,
  V3GenerationCommandStatus,
  V3GenerationCommandType,
  V3GenerationJobEvent,
  V3GenerationJobEventType,
  V3GenerationJobSnapshot,
  V3GenerationJobStatus,
  V3GenerationPhase,
} from '@/lib/chatbot/grad-plan/v3/types';

const TERMINAL_JOB_STATUSES = new Set<V3GenerationJobStatus>(['completed', 'failed', 'canceled']);
const RUNNABLE_JOB_STATUSES = new Set<V3GenerationJobStatus>(['queued', 'in_progress', 'pause_requested', 'cancel_requested']);

type V3WorkflowPhase =
  | 'preparing'
  | 'major_skeleton'
  | 'major_fill'
  | 'minor_fill'
  | 'gen_ed_fill'
  | 'elective_fill'
  | 'verify_heuristics'
  | 'persisting';

const JOB_PHASE_SEQUENCE: V3WorkflowPhase[] = [
  'preparing',
  'major_skeleton',
  'major_fill',
  'minor_fill',
  'gen_ed_fill',
  'elective_fill',
  'verify_heuristics',
  'persisting',
];

const PROGRESS_BY_PHASE: Record<V3GenerationPhase, number> = {
  queued: 0,
  preparing: 5,
  major_skeleton: 15,
  major_fill: 35,
  minor_fill: 50,
  gen_ed_fill: 65,
  elective_fill: 80,
  verify_heuristics: 92,
  persisting: 97,
  completed: 100,
  failed: 0,
  canceled: 0,
};

const PHASE_START_MESSAGE: Partial<Record<V3GenerationPhase, string>> = {
  preparing: 'Preparing normalized input',
  major_skeleton: 'Building major skeleton terms',
  major_fill: 'Placing outstanding major requirements',
  minor_fill: 'Placing outstanding minor requirements',
  gen_ed_fill: 'Placing outstanding general education requirements',
  elective_fill: 'Placing selected electives and balancing load',
  verify_heuristics: 'Validating heuristics and proposing targeted repairs',
  persisting: 'Persisting validated graduation plan',
};

const PHASE_COMPLETE_MESSAGE: Partial<Record<V3GenerationPhase, string>> = {
  preparing: 'Input prepared',
  major_skeleton: 'Major skeleton complete',
  major_fill: 'Major fill complete',
  minor_fill: 'Minor fill complete',
  gen_ed_fill: 'General education fill complete',
  elective_fill: 'Elective fill complete',
  verify_heuristics: 'Heuristics validation complete',
  persisting: 'Plan persisted',
};

const RETRIABLE_ERROR_PATTERNS = [
  'timeout',
  'temporarily unavailable',
  'rate limit',
  '429',
  '502',
  '503',
  '504',
  'network',
];

const PHASE_REPAIR_ORDER: AutomaticRepairPhase[] = ['major_fill', 'minor_fill', 'gen_ed_fill', 'elective_fill'];

const runningV3Jobs = new Set<string>();

type V3JobRow = {
  id: string;
  user_id: string;
  session_id: string;
  conversation_id: string;
  status: V3GenerationJobStatus;
  phase: V3GenerationPhase;
  progress_percent: number;
  input_payload: Record<string, unknown>;
  draft_plan: Record<string, unknown> | null;
  output_access_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
  attempt: number;
  repair_loop_count: number;
  created_at: string;
  updated_at: string;
};

type V3JobEventRow = {
  id: number;
  job_id: string;
  ts: string;
  event_type: V3GenerationJobEventType;
  phase: V3GenerationPhase | null;
  message: string | null;
  progress_percent: number | null;
  payload_json: Record<string, unknown> | null;
};

type V3CommandRow = {
  id: string;
  job_id: string;
  session_id: string;
  user_id: string;
  command_type: V3GenerationCommandType;
  status: V3GenerationCommandStatus;
  payload_json: Record<string, unknown> | null;
  idempotency_key: string | null;
  requested_at: string;
  applied_at: string | null;
  applied_phase: V3GenerationPhase | null;
  response_message: string | null;
};

class V3WorkflowValidationError extends Error {
  constructor(
    public readonly details: AutomaticValidationResult,
    public readonly attempts: number
  ) {
    super(`Heuristics validation failed after ${attempts} repair attempts`);
    this.name = 'V3WorkflowValidationError';
  }
}

function toJobSnapshot(row: V3JobRow): V3GenerationJobSnapshot {
  return {
    id: row.id,
    sessionId: row.session_id,
    conversationId: row.conversation_id,
    status: row.status,
    phase: row.phase,
    progressPercent: row.progress_percent,
    outputAccessId: row.output_access_id,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    heartbeatAt: row.heartbeat_at,
    attempt: row.attempt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toJobEvent(row: V3JobEventRow): V3GenerationJobEvent {
  return {
    id: row.id,
    jobId: row.job_id,
    ts: row.ts,
    eventType: row.event_type,
    phase: row.phase,
    message: row.message,
    progressPercent: row.progress_percent,
    payloadJson: row.payload_json,
  };
}

function toCommand(row: V3CommandRow): V3GenerationCommand {
  return {
    id: row.id,
    jobId: row.job_id,
    commandType: row.command_type,
    status: row.status,
    payloadJson: row.payload_json,
    requestedAt: row.requested_at,
    appliedAt: row.applied_at,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function isRetriableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return RETRIABLE_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function parseCredits(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeCourseCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function createTermId(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${slug || 'term'}-${index + 1}`;
}

function inferCourseSource(fulfills: string[], fallback: unknown): 'major' | 'minor' | 'gen_ed' | 'elective' {
  if (fallback === 'major' || fallback === 'minor' || fallback === 'gen_ed' || fallback === 'elective') {
    return fallback;
  }
  const normalized = fulfills.map((value) => value.toLowerCase());
  if (normalized.some((value) => value.includes('minor'))) return 'minor';
  if (normalized.some((value) => value.includes('gen') || value.includes('education'))) return 'gen_ed';
  if (normalized.some((value) => value.includes('elective'))) return 'elective';
  return 'major';
}

function normalizeCourseObject(course: Record<string, unknown>): DraftPlan['terms'][number]['plannedCourses'][number] | null {
  const code = normalizeCourseCode(
    course.courseCode ??
    course.code ??
    (typeof course.subject === 'string' && typeof course.number === 'string'
      ? `${course.subject}${course.number}`
      : null)
  );
  if (!code) return null;

  const fulfills = Array.isArray(course.fulfills)
    ? course.fulfills.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    courseCode: code,
    credits: parseCredits(course.credits),
    source: inferCourseSource(fulfills, course.source),
    title: typeof course.courseTitle === 'string'
      ? course.courseTitle
      : typeof course.title === 'string'
      ? course.title
      : code,
    fulfills,
    raw: course,
  } as DraftPlan['terms'][number]['plannedCourses'][number];
}

function normalizeDraftTerms(rawTerms: unknown[]): DraftPlan['terms'] {
  const terms: DraftPlan['terms'] = [];

  for (let index = 0; index < rawTerms.length; index += 1) {
    const rawTerm = rawTerms[index];
    if (!rawTerm || typeof rawTerm !== 'object') continue;
    const term = rawTerm as Record<string, unknown>;
    const termLabel =
      typeof term.termLabel === 'string'
        ? term.termLabel
        : typeof term.label === 'string'
        ? term.label
        : typeof term.term === 'string'
        ? term.term
        : null;

    if (!termLabel) continue;

    const rawCourses = Array.isArray(term.plannedCourses)
      ? term.plannedCourses
      : Array.isArray(term.courses)
      ? term.courses
      : [];

    const plannedCourses = rawCourses
      .map((rawCourse) => {
        if (!rawCourse || typeof rawCourse !== 'object') return null;
        return normalizeCourseObject(rawCourse as Record<string, unknown>);
      })
      .filter((course): course is DraftPlan['terms'][number]['plannedCourses'][number] => Boolean(course));

    terms.push({
      termId: typeof term.termId === 'string' ? term.termId : createTermId(termLabel, terms.length),
      termLabel,
      plannedCourses,
      metadata: term.metadata && typeof term.metadata === 'object'
        ? term.metadata as Record<string, unknown>
        : undefined,
    });
  }

  return terms;
}

function normalizeDraftPlan(raw: unknown): DraftPlan {
  if (!raw) {
    throw new Error('Phase output is empty');
  }

  if (Array.isArray(raw)) {
    const terms = normalizeDraftTerms(raw);
    if (terms.length > 0) {
      return { terms };
    }
  }

  if (typeof raw === 'object') {
    const cast = raw as Record<string, unknown>;

    if (Array.isArray(cast.terms)) {
      const terms = normalizeDraftTerms(cast.terms);
      if (terms.length > 0) {
        return {
          terms,
          metadata: cast.metadata && typeof cast.metadata === 'object'
            ? cast.metadata as Record<string, unknown>
            : undefined,
        };
      }
    }

    if (Array.isArray(cast.plan)) {
      const terms = normalizeDraftTerms(cast.plan);
      if (terms.length > 0) {
        return {
          terms,
          metadata: cast.plan_metadata && typeof cast.plan_metadata === 'object'
            ? cast.plan_metadata as Record<string, unknown>
            : undefined,
        };
      }
    }
  }

  throw new Error('Unable to normalize phase output into draft plan');
}

function toDraftPlanStorage(plan: DraftPlan): Record<string, unknown> {
  return {
    terms: plan.terms.map((term) => ({
      termId: term.termId,
      termLabel: term.termLabel,
      plannedCourses: term.plannedCourses.map((course) => ({
        courseCode: course.courseCode,
        courseTitle: course.title,
        credits: course.credits,
        source: course.source,
        fulfills: course.fulfills,
        ...(course.raw ?? {}),
      })),
      metadata: term.metadata,
    })),
    metadata: plan.metadata ?? null,
  };
}

function fromDraftPlanStorage(raw: Record<string, unknown> | null): DraftPlan | null {
  if (!raw) return null;
  try {
    return normalizeDraftPlan(raw);
  } catch {
    return null;
  }
}

function toValidatorPlan(plan: DraftPlan) {
  return {
    plan: plan.terms.map((term) => ({
      term: term.termLabel,
      courses: term.plannedCourses.map((course) => {
        const raw = course.raw && typeof course.raw === 'object' ? course.raw : {};
        return {
          code: course.courseCode,
          title: course.title,
          credits: course.credits,
          source: course.source,
          fulfills: course.fulfills,
          ...raw,
        };
      }),
      credits_planned: term.plannedCourses.reduce((sum, course) => sum + course.credits, 0),
      metadata: term.metadata,
    })),
    plan_metadata: plan.metadata ?? null,
  };
}

function extractAssistantText(response: Record<string, unknown>): string {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  if (choices.length === 0) {
    throw new Error('Model response missing choices');
  }
  const first = choices[0] as Record<string, unknown>;
  const message = first.message as Record<string, unknown> | undefined;
  const content = message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }
  throw new Error('Model response content was empty');
}

function parseJsonContent(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
      return JSON.parse(fencedMatch[1]);
    }
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex >= 0 && endIndex > startIndex) {
      return JSON.parse(text.slice(startIndex, endIndex + 1));
    }
    const startArr = text.indexOf('[');
    const endArr = text.lastIndexOf(']');
    if (startArr >= 0 && endArr > startArr) {
      return JSON.parse(text.slice(startArr, endArr + 1));
    }
    throw new Error('Model output was not valid JSON');
  }
}

function selectProgramsByType(programs: unknown[], predicate: (type: string) => boolean): unknown[] {
  return programs.filter((program) => {
    if (!program || typeof program !== 'object') return false;
    const programType = (program as { programType?: unknown }).programType;
    const normalized = typeof programType === 'string' ? programType.toLowerCase() : '';
    return predicate(normalized);
  });
}

function buildPhasePayload(args: {
  phase: V3WorkflowPhase;
  payload: Record<string, unknown>;
  draftPlan: DraftPlan | null;
  queuedReplies: string[];
}): Record<string, unknown> {
  const { phase, payload, draftPlan, queuedReplies } = args;

  const programs = Array.isArray(payload.programs) ? payload.programs : [];
  const base: Record<string, unknown> = {
    takenCourses: payload.takenCourses,
    suggestedDistribution: payload.suggestedDistribution,
    workStatus: payload.workStatus,
    milestones: payload.milestones,
    hasTranscript: payload.hasTranscript,
    created_with_transcript: payload.created_with_transcript,
    genEdDistribution: payload.genEdDistribution,
    planStartTerm: payload.planStartTerm,
    planStartYear: payload.planStartYear,
    requirementBuckets: payload.requirementBuckets,
    selectedCourses: payload.selectedCourses,
    totalCreditsToComplete: payload.totalCreditsToComplete,
    remainingCreditsToComplete: payload.remainingCreditsToComplete,
  };

  const allInstructions = [
    ...(Array.isArray(payload.userInstructions)
      ? payload.userInstructions.filter((value): value is string => typeof value === 'string')
      : []),
    ...queuedReplies,
  ];

  if (allInstructions.length > 0) {
    base.userInstructions = Array.from(new Set(allInstructions));
  }

  if (draftPlan) {
    base.draftPlan = toValidatorPlan(draftPlan);
  }

  if (phase === 'major_skeleton' || phase === 'major_fill') {
    base.programs = selectProgramsByType(
      programs,
      (programType) => programType === 'major' || programType === 'honors' || programType === 'graduate'
    );
    base.phaseScope = 'major';
  } else if (phase === 'minor_fill') {
    base.programs = selectProgramsByType(programs, (programType) => programType === 'minor');
    base.phaseScope = 'minor';
  } else if (phase === 'gen_ed_fill') {
    base.generalEducation = payload.generalEducation;
    base.phaseScope = 'gen_ed';
  } else if (phase === 'elective_fill') {
    base.userAddedElectives = payload.userAddedElectives;
    base.phaseScope = 'elective';
  } else if (phase === 'verify_heuristics') {
    base.phaseScope = 'verify';
  }

  return base;
}

function buildSkeletonMetadata(plan: DraftPlan, payload: Record<string, unknown>): DraftPlan {
  const suggestedDistribution = Array.isArray(payload.suggestedDistribution)
    ? payload.suggestedDistribution.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'))
    : [];

  const distributionMap = new Map<string, Record<string, unknown>>();
  for (const term of suggestedDistribution) {
    const label = typeof term.term === 'string' ? term.term : null;
    const year = typeof term.year === 'number' ? term.year : null;
    if (!label) continue;
    const key = year && !label.match(/\d{4}/) ? `${label} ${year}`.toLowerCase() : label.toLowerCase();
    distributionMap.set(key, term);
  }

  const transcriptState = payload.hasTranscript ? 'included' : 'excluded';
  const genEdStrategy = typeof payload.genEdDistribution === 'string' ? payload.genEdDistribution : 'balanced';

  return {
    terms: plan.terms.map((term) => {
      const distribution = distributionMap.get(term.termLabel.toLowerCase());
      return {
        ...term,
        metadata: {
          ...(term.metadata ?? {}),
          termType: distribution && typeof distribution.termType === 'string' ? distribution.termType : 'primary',
          creditDistribution: {
            min: distribution && typeof distribution.minCredits === 'number' ? distribution.minCredits : null,
            max: distribution && typeof distribution.maxCredits === 'number' ? distribution.maxCredits : null,
            target: distribution && typeof distribution.suggestedCredits === 'number' ? distribution.suggestedCredits : null,
          },
          transcriptState,
          genEdStrategy,
        },
      };
    }),
    metadata: {
      ...(plan.metadata ?? {}),
      transcriptState,
      genEdStrategy,
      planStartTerm: payload.planStartTerm,
      planStartYear: payload.planStartYear,
    },
  };
}

async function buildPromptForPhase(args: {
  phase: V3WorkflowPhase;
  input: Record<string, unknown>;
}): Promise<string> {
  const basePrompt = await GetAiPrompt('active_feedback_mode');
  const exampleStructureJson = await loadActiveFeedbackExampleStructure();
  return injectActiveFeedbackPromptValues({
    basePrompt: basePrompt || DEFAULT_ACTIVE_FEEDBACK_PROMPT,
    phase: args.phase,
    serializedInput: JSON.stringify(args.input, null, 2),
    exampleStructureJson,
  });
}

async function runModelPhase(args: {
  phase: V3WorkflowPhase;
  phaseInput: Record<string, unknown>;
  sessionId: string;
  userId: string;
}): Promise<DraftPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const promptText = await buildPromptForPhase({
    phase: args.phase,
    input: args.phaseInput,
  });

  const route = selectModelForGenerationPhase(args.phase);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: route.model,
      messages: [{ role: 'user', content: promptText }],
      max_completion_tokens: route.maxOutputTokens,
      temperature: route.routeClass === 'high_context' ? 1 : 0.6,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI phase request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const text = extractAssistantText(payload);
  const output = parseJsonContent(text);

  const usage = payload.usage as Record<string, unknown> | undefined;
  await appendV3TraceEvent({
    sessionId: args.sessionId,
    userId: args.userId,
    eventType: 'model',
    phase: args.phase,
    level: 'info',
    message: `Model call complete (${route.model})`,
    payload: {
      phase: args.phase,
      model: route.model,
      routeClass: route.routeClass,
      reason: route.reason,
      usage: {
        inputTokens:
          typeof usage?.prompt_tokens === 'number'
            ? usage.prompt_tokens
            : typeof usage?.input_tokens === 'number'
            ? usage.input_tokens
            : null,
        outputTokens:
          typeof usage?.completion_tokens === 'number'
            ? usage.completion_tokens
            : typeof usage?.output_tokens === 'number'
            ? usage.output_tokens
            : null,
      },
    },
  });

  return normalizeDraftPlan(output);
}

async function runModelPhaseWithRetry(args: {
  phase: V3WorkflowPhase;
  phaseInput: Record<string, unknown>;
  sessionId: string;
  userId: string;
}): Promise<DraftPlan> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await runModelPhase(args);
    } catch (error) {
      lastError = error;
      if (attempt === 0 && isRetriableError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function getJobRow(args: { jobId: string; userId?: string }): Promise<V3JobRow | null> {
  let query = supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .select('*')
    .eq('id', args.jobId);

  if (args.userId) {
    query = query.eq('user_id', args.userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as V3JobRow | null;
}

async function appendJobEvent(args: {
  jobId: string;
  eventType: V3GenerationJobEventType;
  phase?: V3GenerationPhase | null;
  message?: string | null;
  progressPercent?: number | null;
  payloadJson?: Record<string, unknown> | null;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('grad_plan_v3_generation_job_events')
    .insert({
      job_id: args.jobId,
      event_type: args.eventType,
      phase: args.phase ?? null,
      message: args.message ?? null,
      progress_percent: args.progressPercent ?? null,
      payload_json: args.payloadJson ?? null,
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function patchJobRow(args: {
  jobId: string;
  updates: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .update(args.updates)
    .eq('id', args.jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function appendGenerationContextEvent(args: {
  userId: string;
  sessionId: string;
  eventType: ContextEventType;
  payload: Record<string, unknown>;
  actor?: 'user' | 'agent' | 'system';
  idempotencyKey?: string;
}): Promise<void> {
  await appendV3ContextEvent({
    userId: args.userId,
    sessionId: args.sessionId,
    eventType: args.eventType,
    payload: args.payload,
    actor: args.actor ?? 'agent',
    idempotencyKey: args.idempotencyKey,
  });
}

async function setPhaseProgress(args: {
  job: V3JobRow;
  phase: V3GenerationPhase;
  status?: V3GenerationJobStatus;
  eventType?: V3GenerationJobEventType;
  message?: string;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  const progressPercent = PROGRESS_BY_PHASE[args.phase] ?? args.job.progress_percent;
  const timestamp = nowIso();

  await patchJobRow({
    jobId: args.job.id,
    updates: {
      phase: args.phase,
      progress_percent: progressPercent,
      status: args.status ?? args.job.status,
      heartbeat_at: timestamp,
      updated_at: timestamp,
      ...(args.phase === 'completed' || args.phase === 'failed' || args.phase === 'canceled'
        ? { completed_at: timestamp }
        : {}),
    },
  });

  await appendJobEvent({
    jobId: args.job.id,
    eventType: args.eventType ?? 'job_progress',
    phase: args.phase,
    progressPercent,
    message: args.message ?? null,
    payloadJson: args.details ?? null,
  });

  if (args.phase === 'completed') return;

  const generationStatus =
    args.phase === 'queued'
      ? 'queued'
      : args.phase === 'failed'
      ? 'failed'
      : args.phase === 'canceled'
      ? 'canceled'
      : args.status === 'paused'
      ? 'paused'
      : args.status === 'pause_requested'
      ? 'pause_requested'
      : args.status === 'cancel_requested'
      ? 'cancel_requested'
      : 'running';

  await appendGenerationContextEvent({
    userId: args.job.user_id,
    sessionId: args.job.session_id,
    eventType: 'generation_phase_updated',
    payload: {
      phase: args.phase,
      status: generationStatus,
      progressPercent,
      message: args.message ?? null,
      jobId: args.job.id,
      details: args.details ?? null,
    },
    actor: 'agent',
    idempotencyKey: `job:${args.job.id}:phase:${args.phase}:at:${progressPercent}:${Date.now()}`,
  });
}

async function markCommandApplied(args: {
  command: V3CommandRow;
  phase: V3GenerationPhase;
  outcome: 'applied' | 'rejected';
  message: string;
  job: V3JobRow;
}): Promise<void> {
  const appliedAt = nowIso();
  await supabaseAdmin
    .from('grad_plan_v3_generation_commands')
    .update({
      status: args.outcome === 'applied' ? 'applied' : 'rejected',
      applied_at: appliedAt,
      applied_phase: args.phase,
      response_message: args.message,
    })
    .eq('id', args.command.id);

  await appendJobEvent({
    jobId: args.job.id,
    eventType: 'command_applied',
    phase: args.phase,
    message: args.message,
    progressPercent: args.job.progress_percent,
    payloadJson: {
      commandId: args.command.id,
      commandType: args.command.command_type,
      outcome: args.outcome,
    },
  });

  await appendGenerationContextEvent({
    userId: args.job.user_id,
    sessionId: args.job.session_id,
    eventType: 'generation_command_applied',
    payload: {
      commandId: args.command.id,
      commandType: args.command.command_type,
      jobId: args.job.id,
      outcome: args.outcome,
      message: args.message,
      payload: args.command.payload_json,
    },
    actor: 'system',
    idempotencyKey: `job:${args.job.id}:cmd:${args.command.id}:applied`,
  });
}

async function listPendingCommands(jobId: string): Promise<V3CommandRow[]> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_generation_commands')
    .select('*')
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as V3CommandRow[];
}

function nextPhaseAfter(current: V3GenerationPhase): V3WorkflowPhase {
  const currentPhase = JOB_PHASE_SEQUENCE.includes(current as V3WorkflowPhase)
    ? (current as V3WorkflowPhase)
    : null;
  const index = currentPhase ? JOB_PHASE_SEQUENCE.indexOf(currentPhase) : -1;
  if (index < 0) return 'preparing';
  if (index >= JOB_PHASE_SEQUENCE.length - 1) return 'persisting';
  return JOB_PHASE_SEQUENCE[index + 1];
}

async function applyPendingCommandsAtBoundary(args: {
  job: V3JobRow;
  boundaryPhase: V3GenerationPhase;
  queuedReplies: string[];
}): Promise<{ action: 'continue' | 'paused' | 'canceled'; queuedReplies: string[] }> {
  const pending = await listPendingCommands(args.job.id);
  if (pending.length === 0) {
    return {
      action: 'continue',
      queuedReplies: args.queuedReplies,
    };
  }

  const queuedReplies = [...args.queuedReplies];

  for (const command of pending) {
    const type = command.command_type;

    if (type === 'reply') {
      const message = typeof command.payload_json?.message === 'string'
        ? command.payload_json.message
        : typeof command.payload_json?.text === 'string'
        ? command.payload_json.text
        : null;

      if (message && message.trim().length > 0) {
        queuedReplies.push(message.trim());
      }

      await markCommandApplied({
        command,
        phase: args.boundaryPhase,
        outcome: 'applied',
        message: message ? 'Reply queued for next phase boundary' : 'Empty reply ignored',
        job: args.job,
      });
      continue;
    }

    if (type === 'cancel') {
      const canceledAt = nowIso();
      await patchJobRow({
        jobId: args.job.id,
        updates: {
          status: 'canceled',
          phase: 'canceled',
          completed_at: canceledAt,
          heartbeat_at: canceledAt,
          updated_at: canceledAt,
        },
      });

      await appendJobEvent({
        jobId: args.job.id,
        eventType: 'job_canceled',
        phase: 'canceled',
        message: 'Generation canceled by command',
        progressPercent: args.job.progress_percent,
      });

      await markCommandApplied({
        command,
        phase: 'canceled',
        outcome: 'applied',
        message: 'Generation canceled',
        job: args.job,
      });

      await appendGenerationContextEvent({
        userId: args.job.user_id,
        sessionId: args.job.session_id,
        eventType: 'generation_canceled',
        payload: {
          message: 'Generation canceled',
          phase: 'canceled',
          jobId: args.job.id,
        },
        actor: 'system',
        idempotencyKey: `job:${args.job.id}:canceled`,
      });

      return {
        action: 'canceled',
        queuedReplies,
      };
    }

    if (type === 'pause') {
      const pausedAt = nowIso();
      await patchJobRow({
        jobId: args.job.id,
        updates: {
          status: 'paused',
          heartbeat_at: pausedAt,
          updated_at: pausedAt,
          phase: args.boundaryPhase,
        },
      });

      await appendJobEvent({
        jobId: args.job.id,
        eventType: 'job_paused',
        phase: args.boundaryPhase,
        message: 'Generation paused at safe boundary',
        progressPercent: args.job.progress_percent,
      });

      await markCommandApplied({
        command,
        phase: args.boundaryPhase,
        outcome: 'applied',
        message: 'Generation paused at safe boundary',
        job: args.job,
      });

      await appendGenerationContextEvent({
        userId: args.job.user_id,
        sessionId: args.job.session_id,
        eventType: 'generation_phase_updated',
        payload: {
          phase: args.boundaryPhase,
          status: 'paused',
          progressPercent: args.job.progress_percent,
          message: 'Generation paused',
          jobId: args.job.id,
        },
        actor: 'system',
        idempotencyKey: `job:${args.job.id}:paused:${args.boundaryPhase}:${Date.now()}`,
      });

      return {
        action: 'paused',
        queuedReplies,
      };
    }

    await markCommandApplied({
      command,
      phase: args.boundaryPhase,
      outcome: 'rejected',
      message: `Command ${type} is not valid while job is running`,
      job: args.job,
    });
  }

  return {
    action: 'continue',
    queuedReplies,
  };
}

async function runSkillTrace(args: {
  userId: string;
  sessionId: string;
  phase: RuntimeSkillPhase;
  draftPlan: DraftPlan | null;
  snapshot: AgentContextSnapshot;
}) {
  const pipeline = await runSkillPipeline({
    snapshot: args.snapshot,
    draftPlan: args.draftPlan,
    phase: args.phase,
  });

  for (const trace of pipeline.trace) {
    await appendV3TraceEvent({
      sessionId: args.sessionId,
      userId: args.userId,
      eventType: trace.scope,
      phase: trace.phase,
      level: trace.level,
      message: trace.message,
      payload: trace.payload,
      traceId: trace.id,
    });
  }

  return pipeline;
}

async function persistFinalPlan(args: {
  userId: string;
  payload: Record<string, unknown>;
  draftPlan: DraftPlan;
}): Promise<{ accessId: string }> {
  const selectedPrograms = Array.isArray(args.payload.selectedPrograms)
    ? args.payload.selectedPrograms
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
    : [];

  const planData = {
    ...toValidatorPlan(args.draftPlan),
    created_with_transcript: Boolean(args.payload.created_with_transcript ?? args.payload.hasTranscript),
  };

  const { accessId } = await InsertGeneratedGradPlan({
    profileId: args.userId,
    planData,
    programsInPlan: selectedPrograms,
    isActive: false,
  });

  return { accessId };
}

async function buildV3InputPayloadFromSession(args: {
  userId: string;
  sessionId: string;
  snapshot: AgentContextSnapshot;
}): Promise<Record<string, unknown>> {
  const supabase = supabaseAdmin;

  const selectedProgramIds = args.snapshot.programs.selected.map((program) => String(program.programId));
  const hasSelectedPrograms = selectedProgramIds.length > 0;

  const { data: selectedProgramsRows, error: selectedProgramsError } = hasSelectedPrograms
    ? await supabase
      .from('program')
      .select('id,name,program_type,is_general_ed,requirements,minimum_credits,target_total_credits')
      .in('id', selectedProgramIds)
    : { data: [], error: null };

  if (selectedProgramsError) {
    throw new Error(selectedProgramsError.message);
  }

  const profileQuery = await supabase
    .from('profiles')
    .select('university_id')
    .eq('id', args.userId)
    .maybeSingle();

  if (profileQuery.error) {
    throw new Error(profileQuery.error.message);
  }

  const universityId = profileQuery.data?.university_id as number | null | undefined;

  const studentQuery = await supabase
    .from('student')
    .select('admission_year,is_transfer')
    .eq('profile_id', args.userId)
    .maybeSingle();

  if (studentQuery.error) {
    throw new Error(studentQuery.error.message);
  }

  let genEdRows: Array<Record<string, unknown>> = [];
  if (universityId) {
    const genEdQuery = await supabase
      .from('program')
      .select('id,name,program_type,is_general_ed,requirements,minimum_credits,target_total_credits,applicable_start_year,applicable_end_year,applies_to_transfers,applies_to_freshmen,priority')
      .eq('university_id', universityId)
      .eq('is_general_ed', true)
      .order('priority', { ascending: false, nullsFirst: false });

    if (genEdQuery.error) {
      throw new Error(genEdQuery.error.message);
    }

    const admissionYear = studentQuery.data?.admission_year as number | null | undefined;
    const isTransfer = studentQuery.data?.is_transfer as boolean | null | undefined;

    genEdRows = (genEdQuery.data ?? []).filter((program) => {
      const startYear = typeof program.applicable_start_year === 'number' ? program.applicable_start_year : null;
      const endYear = typeof program.applicable_end_year === 'number' ? program.applicable_end_year : null;
      if (admissionYear && startYear && admissionYear < startYear) return false;
      if (admissionYear && endYear && admissionYear > endYear) return false;
      if (isTransfer === true && program.applies_to_transfers === false) return false;
      if (isTransfer === false && program.applies_to_freshmen === false) return false;
      return true;
    });
  }

  const transcriptCoursesRaw = await fetchUserCoursesArray(supabase, args.userId);
  const transcriptNormalization = normalizeTranscriptCourses(
    transcriptCoursesRaw.map((course) => ({
      code: `${course.subject}${course.number}`,
      title: course.title,
      credits: course.credits ?? 0,
      term: course.term,
      grade: course.grade ?? '',
      status: course.status ?? 'Completed',
      source: course.origin ?? 'Institutional',
      fulfills: Array.isArray(course.fulfillsRequirements)
        ? course.fulfillsRequirements
          .map((entry) => entry.requirementId)
          .filter((value): value is string => typeof value === 'string')
        : [],
    }))
  );

  const selectedProgramRows = [
    ...((selectedProgramsRows ?? []) as PipelineProgramRow[]),
    ...((genEdRows ?? []) as PipelineProgramRow[]),
  ];

  const payload = buildV3AutomaticGenerationPayload({
    snapshot: {
      ...args.snapshot,
      transcript: {
        ...args.snapshot.transcript,
        completedCourseCodes:
          args.snapshot.transcript.completedCourseCodes.length > 0
            ? args.snapshot.transcript.completedCourseCodes
            : transcriptNormalization.completedCourseCodes,
      },
    },
    selectedProgramRows,
    transcriptCourses: transcriptNormalization.transcriptCourses,
  });

  const selectedRequirements = buildProgramRequirements(args.snapshot.programs.selected, selectedProgramRows);

  return {
    ...payload,
    selectedCourses: args.snapshot.courses.selectedCourses,
    requestedElectives: args.snapshot.courses.requestedElectives,
    totalCreditsToComplete: args.snapshot.courses.totalCreditsToComplete,
    remainingCreditsToComplete: args.snapshot.courses.remainingRequirementCredits,
    requestedElectiveCredits: args.snapshot.courses.requestedElectiveCredits,
    selectedRequirements: selectedRequirements.map((entry) => ({
      descriptor: entry.descriptor,
      requirements: entry.requirements,
    })),
  };
}

async function markJobFailed(args: {
  job: V3JobRow;
  message: string;
  errorCode?: string | null;
  details?: Record<string, unknown> | null;
}) {
  const failedAt = nowIso();
  await patchJobRow({
    jobId: args.job.id,
    updates: {
      status: 'failed',
      phase: 'failed',
      error_message: args.message,
      error_code: args.errorCode ?? null,
      completed_at: failedAt,
      heartbeat_at: failedAt,
      updated_at: failedAt,
    },
  });

  await appendJobEvent({
    jobId: args.job.id,
    eventType: 'job_failed',
    phase: 'failed',
    message: args.message,
    payloadJson: args.details ?? null,
  });

  await appendGenerationContextEvent({
    userId: args.job.user_id,
    sessionId: args.job.session_id,
    eventType: 'generation_failed',
    payload: {
      errorMessage: args.message,
      errorCode: args.errorCode ?? null,
      phase: 'failed',
      jobId: args.job.id,
      details: args.details ?? null,
    },
    actor: 'agent',
    idempotencyKey: `job:${args.job.id}:failed:${Date.now()}`,
  });
}

async function failCommand(args: {
  job: V3JobRow;
  command: V3CommandRow;
  message: string;
}) {
  await markCommandApplied({
    command: args.command,
    phase: args.job.phase,
    outcome: 'rejected',
    message: args.message,
    job: args.job,
  });
}

async function claimQueuedJob(row: V3JobRow): Promise<V3JobRow | null> {
  const timestamp = nowIso();
  const nextAttempt = (row.attempt || 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .update({
      status: 'in_progress',
      started_at: row.started_at ?? timestamp,
      heartbeat_at: timestamp,
      updated_at: timestamp,
      attempt: nextAttempt,
      phase: row.phase,
    })
    .eq('id', row.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as V3JobRow | null;
}

async function runPhaseAndUpdate(args: {
  job: V3JobRow;
  snapshot: AgentContextSnapshot;
  payload: Record<string, unknown>;
  phase: V3WorkflowPhase;
  draftPlan: DraftPlan | null;
  queuedReplies: string[];
}): Promise<DraftPlan | null> {
  const startTime = Date.now();
  await setPhaseProgress({
    job: args.job,
    phase: args.phase,
    status: 'in_progress',
    eventType: 'phase_started',
    message: PHASE_START_MESSAGE[args.phase] ?? undefined,
  });

  if (args.phase === 'preparing') {
    await runSkillTrace({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      phase: 'any',
      draftPlan: args.draftPlan,
      snapshot: args.snapshot,
    });

    await setPhaseProgress({
      job: args.job,
      phase: 'preparing',
      status: 'in_progress',
      eventType: 'phase_completed',
      message: PHASE_COMPLETE_MESSAGE.preparing ?? undefined,
    });

    await appendV3TraceEvent({
      sessionId: args.job.session_id,
      userId: args.job.user_id,
      eventType: 'phase',
      phase: 'preparing',
      level: 'info',
      message: 'Preparing phase completed',
      payload: {
        durationMs: Date.now() - startTime,
      },
    });

    void captureV3PhaseLatency({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      phase: 'preparing',
      durationMs: Date.now() - startTime,
      status: 'ok',
    }).catch(() => undefined);

    return args.draftPlan;
  }

  if (args.phase === 'verify_heuristics') {
    if (!args.draftPlan) {
      throw new Error('Draft plan is required before verify_heuristics');
    }

    const skillPipeline = await runSkillTrace({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      phase: 'verify_heuristics',
      draftPlan: args.draftPlan,
      snapshot: args.snapshot,
    });

    const validatorResult = validateAutomaticPlan({
      payload: args.payload,
      finalPlan: toValidatorPlan(args.draftPlan),
    });

    const mergedRepairs = Array.from(
      new Set([
        ...validatorResult.suggestedRepairPhases,
        ...skillPipeline.suggestedRepairs
          .map((repair) => repair.phase)
          .filter((phase): phase is AutomaticRepairPhase => PHASE_REPAIR_ORDER.includes(phase as AutomaticRepairPhase)),
      ])
    );

    if (!validatorResult.valid) {
      const details = {
        issues: validatorResult.issues,
        suggestedRepairPhases: mergedRepairs,
      };

      await appendV3TraceEvent({
        sessionId: args.job.session_id,
        userId: args.job.user_id,
        eventType: 'validation',
        phase: 'verify_heuristics',
        level: 'warn',
        message: 'Heuristics validation found violations',
        payload: details,
      });

      throw new V3WorkflowValidationError(
        {
          ...validatorResult,
          suggestedRepairPhases: mergedRepairs.length > 0 ? mergedRepairs : validatorResult.suggestedRepairPhases,
        },
        0
      );
    }

    await setPhaseProgress({
      job: args.job,
      phase: 'verify_heuristics',
      status: 'in_progress',
      eventType: 'phase_completed',
      message: PHASE_COMPLETE_MESSAGE.verify_heuristics ?? undefined,
    });

    await appendV3TraceEvent({
      sessionId: args.job.session_id,
      userId: args.job.user_id,
      eventType: 'validation',
      phase: 'verify_heuristics',
      level: 'info',
      message: 'Heuristics validation passed',
      payload: {
        durationMs: Date.now() - startTime,
      },
    });

    void captureV3PhaseLatency({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      phase: 'verify_heuristics',
      durationMs: Date.now() - startTime,
      status: 'ok',
    }).catch(() => undefined);

    return args.draftPlan;
  }

  if (args.phase === 'persisting') {
    if (!args.draftPlan) {
      throw new Error('Draft plan is required before persistence');
    }

    const persisted = await persistFinalPlan({
      userId: args.job.user_id,
      payload: args.payload,
      draftPlan: args.draftPlan,
    });

    const finishedAt = nowIso();
    await patchJobRow({
      jobId: args.job.id,
      updates: {
        status: 'completed',
        phase: 'completed',
        progress_percent: 100,
        output_access_id: persisted.accessId,
        completed_at: finishedAt,
        heartbeat_at: finishedAt,
        updated_at: finishedAt,
        error_code: null,
        error_message: null,
      },
    });

    await appendJobEvent({
      jobId: args.job.id,
      eventType: 'job_completed',
      phase: 'completed',
      message: 'Generation completed successfully',
      progressPercent: 100,
      payloadJson: {
        accessId: persisted.accessId,
      },
    });

    await appendGenerationContextEvent({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      eventType: 'generation_completed',
      payload: {
        outputAccessId: persisted.accessId,
        jobId: args.job.id,
        message: 'Generation completed',
      },
      actor: 'agent',
      idempotencyKey: `job:${args.job.id}:completed`,
    });

    await appendV3TraceEvent({
      sessionId: args.job.session_id,
      userId: args.job.user_id,
      eventType: 'phase',
      phase: 'completed',
      level: 'info',
      message: 'Generation workflow completed',
      payload: {
        accessId: persisted.accessId,
        durationMs: Date.now() - startTime,
      },
    });

    void captureV3PhaseLatency({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      phase: 'persisting',
      durationMs: Date.now() - startTime,
      status: 'ok',
    }).catch(() => undefined);

    void captureV3CompletionMetric({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      success: true,
    }).catch(() => undefined);

    return args.draftPlan;
  }

  const phaseInput = buildPhasePayload({
    phase: args.phase,
    payload: args.payload,
    draftPlan: args.draftPlan,
    queuedReplies: args.queuedReplies,
  });

  const nextDraftPlan = await runModelPhaseWithRetry({
    phase: args.phase,
    phaseInput,
    sessionId: args.job.session_id,
    userId: args.job.user_id,
  });

  const finalizedDraftPlan = args.phase === 'major_skeleton'
    ? buildSkeletonMetadata(nextDraftPlan, args.payload)
    : nextDraftPlan;

  await runSkillTrace({
    userId: args.job.user_id,
    sessionId: args.job.session_id,
    phase: args.phase,
    draftPlan: finalizedDraftPlan,
    snapshot: args.snapshot,
  });

  await patchJobRow({
    jobId: args.job.id,
    updates: {
      draft_plan: toDraftPlanStorage(finalizedDraftPlan),
      phase: args.phase,
      heartbeat_at: nowIso(),
      updated_at: nowIso(),
    },
  });

  await setPhaseProgress({
    job: args.job,
    phase: args.phase,
    status: 'in_progress',
    eventType: 'phase_completed',
    message: PHASE_COMPLETE_MESSAGE[args.phase] ?? undefined,
  });

  await appendV3TraceEvent({
    sessionId: args.job.session_id,
    userId: args.job.user_id,
    eventType: 'phase',
    phase: args.phase,
    level: 'info',
    message: `Phase completed: ${args.phase}`,
    payload: {
      durationMs: Date.now() - startTime,
      termCount: finalizedDraftPlan.terms.length,
      plannedCourseCount: finalizedDraftPlan.terms.reduce((sum, term) => sum + term.plannedCourses.length, 0),
    },
  });

  void captureV3PhaseLatency({
    userId: args.job.user_id,
    sessionId: args.job.session_id,
    phase: args.phase,
    durationMs: Date.now() - startTime,
    status: 'ok',
  }).catch(() => undefined);

  return finalizedDraftPlan;
}

async function applyRepairLoops(args: {
  job: V3JobRow;
  snapshot: AgentContextSnapshot;
  payload: Record<string, unknown>;
  draftPlan: DraftPlan;
}): Promise<DraftPlan> {
  let draftPlan = args.draftPlan;
  let attempts = 0;

  while (attempts < 2) {
    const validation = validateAutomaticPlan({
      payload: args.payload,
      finalPlan: toValidatorPlan(draftPlan),
    });

    if (validation.valid) {
      if (attempts > 0) {
        await patchJobRow({
          jobId: args.job.id,
          updates: {
            repair_loop_count: attempts,
            updated_at: nowIso(),
            heartbeat_at: nowIso(),
            draft_plan: toDraftPlanStorage(draftPlan),
          },
        });
      }
      return draftPlan;
    }

    const skillPipeline = await runSkillTrace({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      phase: 'repair',
      draftPlan,
      snapshot: args.snapshot,
    });

    const repairTargets = Array.from(
      new Set([
        ...validation.suggestedRepairPhases,
        ...skillPipeline.suggestedRepairs
          .map((repair) => repair.phase)
          .filter((phase): phase is AutomaticRepairPhase => PHASE_REPAIR_ORDER.includes(phase as AutomaticRepairPhase)),
      ])
    );

    const orderedRepairs = PHASE_REPAIR_ORDER.filter((phase) => repairTargets.includes(phase));
    if (orderedRepairs.length === 0) {
      throw new V3WorkflowValidationError(validation, attempts + 1);
    }

    for (const repairPhase of orderedRepairs) {
      draftPlan = (await runPhaseAndUpdate({
        job: args.job,
        snapshot: args.snapshot,
        payload: args.payload,
        phase: repairPhase,
        draftPlan,
        queuedReplies: [],
      })) ?? draftPlan;
    }

    attempts += 1;

    await patchJobRow({
      jobId: args.job.id,
      updates: {
        repair_loop_count: attempts,
        updated_at: nowIso(),
        heartbeat_at: nowIso(),
      },
    });

    await appendV3TraceEvent({
      sessionId: args.job.session_id,
      userId: args.job.user_id,
      eventType: 'repair',
      phase: 'verify_heuristics',
      level: 'warn',
      message: `Repair loop ${attempts} executed`,
      payload: {
        targetPhases: orderedRepairs,
      },
    });

    void captureV3RepairLoopMetric({
      userId: args.job.user_id,
      sessionId: args.job.session_id,
      repairLoopCount: attempts,
    }).catch(() => undefined);
  }

  const finalValidation = validateAutomaticPlan({
    payload: args.payload,
    finalPlan: toValidatorPlan(draftPlan),
  });

  if (!finalValidation.valid) {
    throw new V3WorkflowValidationError(finalValidation, attempts);
  }

  return draftPlan;
}

async function processJobRun(jobId: string): Promise<void> {
  const initial = await getJobRow({ jobId });
  if (!initial) {
    return;
  }

  if (TERMINAL_JOB_STATUSES.has(initial.status)) {
    return;
  }

  if (!RUNNABLE_JOB_STATUSES.has(initial.status)) {
    return;
  }

  const claimed = await claimQueuedJob(initial);
  if (!claimed) {
    return;
  }

  const session = await getV3Session({
    userId: claimed.user_id,
    sessionId: claimed.session_id,
  });

  if (!session) {
    await markJobFailed({
      job: claimed,
      message: 'Associated v3 session was not found',
      errorCode: 'session_not_found',
    });
    return;
  }

  let snapshot = session.snapshot;
  let payload = claimed.input_payload;
  if (!payload || Object.keys(payload).length === 0) {
    payload = await buildV3InputPayloadFromSession({
      userId: claimed.user_id,
      sessionId: claimed.session_id,
      snapshot,
    });

    await patchJobRow({
      jobId: claimed.id,
      updates: {
        input_payload: payload,
        updated_at: nowIso(),
      },
    });
  }

  await appendJobEvent({
    jobId: claimed.id,
    eventType: claimed.started_at ? 'job_resumed' : 'job_started',
    phase: claimed.phase,
    message: claimed.started_at ? 'Generation job resumed' : 'Generation job started',
    progressPercent: claimed.progress_percent,
  });

  let draftPlan = fromDraftPlanStorage(claimed.draft_plan);
  let queuedReplies: string[] = [];

  try {
    const startPhase = claimed.phase === 'queued' ? 'preparing' : nextPhaseAfter(claimed.phase);
    let phaseIndex = JOB_PHASE_SEQUENCE.indexOf(startPhase);
    if (phaseIndex < 0) {
      phaseIndex = 0;
    }

    for (let i = phaseIndex; i < JOB_PHASE_SEQUENCE.length; i += 1) {
      const phase = JOB_PHASE_SEQUENCE[i];

      const latestBeforeBoundary = await getJobRow({ jobId: claimed.id });
      if (!latestBeforeBoundary) {
        return;
      }

      if (latestBeforeBoundary.status === 'cancel_requested') {
        const boundaryOutcome = await applyPendingCommandsAtBoundary({
          job: latestBeforeBoundary,
          boundaryPhase: latestBeforeBoundary.phase,
          queuedReplies,
        });
        if (boundaryOutcome.action === 'canceled') {
          return;
        }
      }

      const boundaryResult = await applyPendingCommandsAtBoundary({
        job: latestBeforeBoundary,
        boundaryPhase: latestBeforeBoundary.phase,
        queuedReplies,
      });

      queuedReplies = boundaryResult.queuedReplies;

      if (boundaryResult.action === 'paused') {
        return;
      }

      if (boundaryResult.action === 'canceled') {
        return;
      }

      if (phase === 'verify_heuristics') {
        if (!draftPlan) {
          throw new Error('Draft plan is required for verify_heuristics');
        }

        await setPhaseProgress({
          job: claimed,
          phase,
          status: 'in_progress',
          eventType: 'phase_started',
          message: PHASE_START_MESSAGE[phase] ?? undefined,
        });

        draftPlan = await applyRepairLoops({
          job: claimed,
          snapshot,
          payload,
          draftPlan,
        });

        await setPhaseProgress({
          job: claimed,
          phase: 'verify_heuristics',
          status: 'in_progress',
          eventType: 'phase_completed',
          message: PHASE_COMPLETE_MESSAGE.verify_heuristics ?? undefined,
        });
        continue;
      }

      const updatedDraft = await runPhaseAndUpdate({
        job: claimed,
        snapshot,
        payload,
        phase,
        draftPlan,
        queuedReplies,
      });

      if (phase !== 'persisting') {
        draftPlan = updatedDraft;
      }

      // Replies are consumed at the next model-phase boundary.
      if (phase === 'major_skeleton' || phase === 'major_fill' || phase === 'minor_fill' || phase === 'gen_ed_fill' || phase === 'elective_fill') {
        queuedReplies = [];
      }

      const refreshedSession = await getV3Session({
        userId: claimed.user_id,
        sessionId: claimed.session_id,
      });
      if (refreshedSession) {
        snapshot = refreshedSession.snapshot;
      }

      const latestAfterPhase = await getJobRow({ jobId: claimed.id });
      if (!latestAfterPhase || TERMINAL_JOB_STATUSES.has(latestAfterPhase.status)) {
        return;
      }
    }
  } catch (error) {
    if (error instanceof V3WorkflowValidationError) {
      await markJobFailed({
        job: claimed,
        message: error.message,
        errorCode: 'heuristics_validation_failed',
        details: {
          attempts: error.attempts,
          issues: error.details.issues,
          suggestedRepairPhases: error.details.suggestedRepairPhases,
        },
      });
      void captureV3CompletionMetric({
        userId: claimed.user_id,
        sessionId: claimed.session_id,
        success: false,
        failureCode: 'heuristics_validation_failed',
      }).catch(() => undefined);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('canceled')) {
      const canceledAt = nowIso();
      await patchJobRow({
        jobId: claimed.id,
        updates: {
          status: 'canceled',
          phase: 'canceled',
          completed_at: canceledAt,
          heartbeat_at: canceledAt,
          updated_at: canceledAt,
        },
      });

      await appendJobEvent({
        jobId: claimed.id,
        eventType: 'job_canceled',
        phase: 'canceled',
        message: 'Generation canceled',
      });

      await appendGenerationContextEvent({
        userId: claimed.user_id,
        sessionId: claimed.session_id,
        eventType: 'generation_canceled',
        payload: {
          message: 'Generation canceled',
          phase: 'canceled',
          jobId: claimed.id,
        },
        actor: 'system',
      });
      void captureV3CompletionMetric({
        userId: claimed.user_id,
        sessionId: claimed.session_id,
        success: false,
        failureCode: 'canceled',
      }).catch(() => undefined);
      return;
    }

    await markJobFailed({
      job: claimed,
      message,
      errorCode: 'workflow_runtime_error',
    });
    void captureV3CompletionMetric({
      userId: claimed.user_id,
      sessionId: claimed.session_id,
      success: false,
      failureCode: 'workflow_runtime_error',
    }).catch(() => undefined);
  }
}

export async function createOrReuseV3GenerationJob(args: {
  userId: string;
  sessionId: string;
  inputPayload?: Record<string, unknown>;
}): Promise<{ job: V3GenerationJobSnapshot; reused: boolean }> {
  const session = await getV3Session({
    userId: args.userId,
    sessionId: args.sessionId,
  });

  if (!session) {
    throw new Error('Session not found');
  }

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .select('*')
    .eq('user_id', args.userId)
    .eq('session_id', args.sessionId)
    .in('status', ['queued', 'in_progress', 'pause_requested', 'paused', 'cancel_requested'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0] as V3JobRow;
    if (existing.status === 'queued' && args.inputPayload && Object.keys(args.inputPayload).length > 0) {
      await patchJobRow({
        jobId: existing.id,
        updates: {
          input_payload: args.inputPayload,
          updated_at: nowIso(),
          heartbeat_at: nowIso(),
          error_message: null,
          error_code: null,
        },
      });
    }

    return {
      job: toJobSnapshot(existing),
      reused: true,
    };
  }

  const inputPayload = args.inputPayload && Object.keys(args.inputPayload).length > 0
    ? args.inputPayload
    : await buildV3InputPayloadFromSession({
      userId: args.userId,
      sessionId: args.sessionId,
      snapshot: session.snapshot,
    });

  const now = nowIso();
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .insert({
      user_id: args.userId,
      session_id: args.sessionId,
      conversation_id: session.conversationId,
      status: 'queued',
      phase: 'queued',
      progress_percent: 0,
      input_payload: inputPayload,
      heartbeat_at: now,
      updated_at: now,
      created_at: now,
      attempt: 0,
      repair_loop_count: 0,
    })
    .select('*')
    .single();

  if (error || !data) {
    const conflict = error?.message?.includes('idx_grad_plan_v3_generation_jobs_active_unique');
    if (conflict) {
      const { data: conflicted, error: conflictError } = await supabaseAdmin
        .from('grad_plan_v3_generation_jobs')
        .select('*')
        .eq('user_id', args.userId)
        .eq('session_id', args.sessionId)
        .in('status', ['queued', 'in_progress', 'pause_requested', 'paused', 'cancel_requested'])
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (conflictError) {
        throw new Error(conflictError.message);
      }

      if (conflicted) {
        return {
          job: toJobSnapshot(conflicted as V3JobRow),
          reused: true,
        };
      }
    }

    throw new Error(error?.message || 'Failed to create v3 generation job');
  }

  const created = data as V3JobRow;

  await appendJobEvent({
    jobId: created.id,
    eventType: 'job_created',
    phase: 'queued',
    message: 'V3 generation job created',
    progressPercent: 0,
  });

  await appendGenerationContextEvent({
    userId: args.userId,
    sessionId: args.sessionId,
    eventType: 'generation_phase_updated',
    payload: {
      phase: 'queued',
      status: 'queued',
      progressPercent: 0,
      message: 'Generation job queued',
      jobId: created.id,
    },
    actor: 'agent',
    idempotencyKey: `job:${created.id}:queued`,
  });

  return {
    job: toJobSnapshot(created),
    reused: false,
  };
}

export async function getV3GenerationJobSnapshot(args: {
  jobId: string;
  userId?: string;
  sessionId?: string;
}): Promise<V3GenerationJobSnapshot | null> {
  let query = supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .select('*')
    .eq('id', args.jobId);

  if (args.userId) {
    query = query.eq('user_id', args.userId);
  }

  if (args.sessionId) {
    query = query.eq('session_id', args.sessionId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return toJobSnapshot(data as V3JobRow);
}

export async function listV3GenerationJobEvents(args: {
  jobId: string;
  userId?: string;
  afterId?: number;
  limit?: number;
}): Promise<V3GenerationJobEvent[]> {
  if (args.userId) {
    const snapshot = await getV3GenerationJobSnapshot({
      jobId: args.jobId,
      userId: args.userId,
    });
    if (!snapshot) {
      return [];
    }
  }

  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_generation_job_events')
    .select('*')
    .eq('job_id', args.jobId)
    .gt('id', args.afterId ?? 0)
    .order('id', { ascending: true })
    .limit(args.limit ?? 200);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toJobEvent(row as V3JobEventRow));
}

export async function requestV3GenerationCommand(args: {
  userId: string;
  sessionId: string;
  jobId: string;
  commandType: V3GenerationCommandType;
  payloadJson?: Record<string, unknown> | null;
  idempotencyKey?: string;
}): Promise<{ job: V3GenerationJobSnapshot; command: V3GenerationCommand; reused: boolean } | null> {
  const row = await getJobRow({ jobId: args.jobId, userId: args.userId });
  if (!row || row.session_id !== args.sessionId) {
    return null;
  }

  const safeIdempotencyKey = args.idempotencyKey?.trim() || null;
  if (safeIdempotencyKey) {
    const { data: existingByIdempotency, error: idempotencyError } = await supabaseAdmin
      .from('grad_plan_v3_generation_commands')
      .select('*')
      .eq('job_id', args.jobId)
      .eq('idempotency_key', safeIdempotencyKey)
      .maybeSingle();

    if (idempotencyError) {
      throw new Error(idempotencyError.message);
    }

    if (existingByIdempotency) {
      return {
        job: toJobSnapshot(row),
        command: toCommand(existingByIdempotency as V3CommandRow),
        reused: true,
      };
    }
  }

  const commandId = randomUUID();
  const requestedAt = nowIso();

  const { data: commandData, error: commandError } = await supabaseAdmin
    .from('grad_plan_v3_generation_commands')
    .insert({
      id: commandId,
      job_id: args.jobId,
      session_id: args.sessionId,
      user_id: args.userId,
      command_type: args.commandType,
      status: 'pending',
      payload_json: args.payloadJson ?? null,
      idempotency_key: safeIdempotencyKey,
      requested_at: requestedAt,
    })
    .select('*')
    .single();

  if (commandError || !commandData) {
    throw new Error(commandError?.message || 'Failed to request generation command');
  }

  await appendJobEvent({
    jobId: row.id,
    eventType: 'command_requested',
    phase: row.phase,
    message: `Command requested: ${args.commandType}`,
    progressPercent: row.progress_percent,
    payloadJson: {
      commandId,
      commandType: args.commandType,
    },
  });

  await appendGenerationContextEvent({
    userId: args.userId,
    sessionId: args.sessionId,
    eventType: 'generation_command_requested',
    payload: {
      commandId,
      commandType: args.commandType,
      jobId: row.id,
      payload: args.payloadJson ?? null,
    },
    actor: 'user',
    idempotencyKey: `job:${row.id}:cmd:${commandId}:requested`,
  });

  if (args.commandType === 'reply') {
    const message = typeof args.payloadJson?.message === 'string'
      ? args.payloadJson.message
      : typeof args.payloadJson?.text === 'string'
      ? args.payloadJson.text
      : '';

    await appendGenerationContextEvent({
      userId: args.userId,
      sessionId: args.sessionId,
      eventType: 'mini_chat_message_added',
      payload: {
        messageId: `chat-${commandId}`,
        role: 'user',
        message,
        commandType: 'reply',
        status: 'pending',
      },
      actor: 'user',
      idempotencyKey: `job:${row.id}:cmd:${commandId}:message`,
    });
  }

  let nextRow = row;

  if (args.commandType === 'pause' && row.status === 'in_progress') {
    await patchJobRow({
      jobId: row.id,
      updates: {
        status: 'pause_requested',
        heartbeat_at: nowIso(),
        updated_at: nowIso(),
      },
    });
  } else if (args.commandType === 'resume' && row.status === 'paused') {
    await patchJobRow({
      jobId: row.id,
      updates: {
        status: 'queued',
        heartbeat_at: nowIso(),
        updated_at: nowIso(),
      },
    });

    const appliedRow = commandData as V3CommandRow;
    await markCommandApplied({
      command: {
        ...appliedRow,
        status: 'pending',
      },
      phase: row.phase,
      outcome: 'applied',
      message: 'Generation resumed and re-queued',
      job: row,
    });

    await appendJobEvent({
      jobId: row.id,
      eventType: 'job_resumed',
      phase: row.phase,
      message: 'Generation resumed',
      progressPercent: row.progress_percent,
    });

    await appendGenerationContextEvent({
      userId: args.userId,
      sessionId: args.sessionId,
      eventType: 'generation_phase_updated',
      payload: {
        phase: row.phase,
        status: 'running',
        progressPercent: row.progress_percent,
        message: 'Generation resumed',
        jobId: row.id,
      },
      actor: 'system',
    });
  } else if (args.commandType === 'cancel' && row.status === 'queued') {
    const canceledAt = nowIso();
    await patchJobRow({
      jobId: row.id,
      updates: {
        status: 'canceled',
        phase: 'canceled',
        completed_at: canceledAt,
        heartbeat_at: canceledAt,
        updated_at: canceledAt,
      },
    });

    const appliedRow = commandData as V3CommandRow;
    await markCommandApplied({
      command: {
        ...appliedRow,
        status: 'pending',
      },
      phase: 'canceled',
      outcome: 'applied',
      message: 'Generation canceled before execution',
      job: row,
    });

    await appendJobEvent({
      jobId: row.id,
      eventType: 'job_canceled',
      phase: 'canceled',
      message: 'Generation canceled before execution',
      progressPercent: row.progress_percent,
    });

    await appendGenerationContextEvent({
      userId: args.userId,
      sessionId: args.sessionId,
      eventType: 'generation_canceled',
      payload: {
        message: 'Generation canceled before execution',
        phase: 'canceled',
        jobId: row.id,
      },
      actor: 'system',
    });
  } else if (args.commandType === 'cancel' && row.status === 'in_progress') {
    await patchJobRow({
      jobId: row.id,
      updates: {
        status: 'cancel_requested',
        heartbeat_at: nowIso(),
        updated_at: nowIso(),
      },
    });
  } else if (args.commandType === 'retry' && (row.status === 'failed' || row.status === 'canceled')) {
    await patchJobRow({
      jobId: row.id,
      updates: {
        status: 'queued',
        phase: 'queued',
        progress_percent: 0,
        error_code: null,
        error_message: null,
        output_access_id: null,
        completed_at: null,
        updated_at: nowIso(),
        heartbeat_at: nowIso(),
      },
    });

    const appliedRow = commandData as V3CommandRow;
    await markCommandApplied({
      command: {
        ...appliedRow,
        status: 'pending',
      },
      phase: 'queued',
      outcome: 'applied',
      message: 'Retry accepted and job re-queued',
      job: row,
    });

    await appendGenerationContextEvent({
      userId: args.userId,
      sessionId: args.sessionId,
      eventType: 'generation_phase_updated',
      payload: {
        phase: 'queued',
        status: 'queued',
        progressPercent: 0,
        message: 'Generation retry queued',
        jobId: row.id,
      },
      actor: 'system',
    });
  } else if (args.commandType !== 'reply') {
    await failCommand({
      job: row,
      command: commandData as V3CommandRow,
      message: `Cannot ${args.commandType} while job status is ${row.status}`,
    });
  }

  const refreshed = await getJobRow({ jobId: row.id, userId: args.userId });
  if (refreshed) {
    nextRow = refreshed;
  }

  return {
    job: toJobSnapshot(nextRow),
    command: toCommand(commandData as V3CommandRow),
    reused: false,
  };
}

export async function triggerV3GenerationJob(jobId: string): Promise<void> {
  if (runningV3Jobs.has(jobId)) {
    return;
  }

  runningV3Jobs.add(jobId);
  try {
    await processJobRun(jobId);
  } finally {
    runningV3Jobs.delete(jobId);
  }
}

export async function runV3GenerationJobsWorkerCycle(limit = 3): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_generation_jobs')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let processed = 0;
  for (const row of data ?? []) {
    const id = (row as { id?: string }).id;
    if (!id) continue;
    processed += 1;
    await triggerV3GenerationJob(id);
  }

  return processed;
}

export function isTerminalV3GenerationStatus(status: V3GenerationJobStatus): boolean {
  return TERMINAL_JOB_STATUSES.has(status);
}
