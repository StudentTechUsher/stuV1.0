import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { GetAiPrompt, InsertGeneratedGradPlan } from '@/lib/services/aiDbService';
import type {
  GenerationJobEvent,
  GenerationJobEventType,
  GenerationJobSnapshot,
  GenerationJobStatus,
  GenerationPhase,
} from '@/lib/chatbot/grad-plan/types';
import {
  DEFAULT_ACTIVE_FEEDBACK_PROMPT,
  injectActiveFeedbackPromptValues,
  loadActiveFeedbackExampleStructure,
} from '@/lib/grad-plan/activeFeedbackPrompt';
import { validateAutomaticPlan } from '@/lib/grad-plan/automaticPlanValidator';
import {
  runAutomaticGradPlanWorkflow,
  WorkflowValidationError,
} from '@/lib/mastra/workflows/automaticGradPlanWorkflow';

type JobRow = {
  id: string;
  user_id: string;
  conversation_id: string;
  status: GenerationJobStatus;
  phase: GenerationPhase;
  progress_percent: number;
  input_payload: Record<string, unknown>;
  output_access_id: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  heartbeat_at: string | null;
  attempt: number;
  created_at: string;
  updated_at: string;
};

type JobEventRow = {
  id: number;
  job_id: string;
  ts: string;
  event_type: GenerationJobEventType;
  phase: GenerationPhase | null;
  message: string | null;
  progress_percent: number | null;
  payload_json: Record<string, unknown> | null;
};

const runningJobs = new Set<string>();
const terminalStatuses = new Set<GenerationJobStatus>(['completed', 'failed', 'canceled']);
const retriableErrorPatterns = [
  'timeout',
  'temporarily unavailable',
  'rate limit',
  '429',
  '502',
  '503',
  '504',
  'network',
];

type AutomaticModelPhase =
  | 'major_skeleton'
  | 'major_fill'
  | 'minor_fill'
  | 'gen_ed_fill'
  | 'elective_fill';

function toSnapshot(row: JobRow): GenerationJobSnapshot {
  return {
    id: row.id,
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

function toEvent(row: JobEventRow): GenerationJobEvent {
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

async function appendEvent(args: {
  jobId: string;
  eventType: GenerationJobEventType;
  phase?: GenerationPhase | null;
  message?: string | null;
  progressPercent?: number | null;
  payloadJson?: Record<string, unknown> | null;
}) {
  const { jobId, eventType, phase = null, message = null, progressPercent = null, payloadJson = null } = args;
  await supabaseAdmin.from('grad_plan_generation_job_events').insert({
    job_id: jobId,
    event_type: eventType,
    phase,
    message,
    progress_percent: progressPercent,
    payload_json: payloadJson,
  });
}

export async function createOrReuseGenerationJob(args: {
  userId: string;
  conversationId: string;
  inputPayload: Record<string, unknown>;
}): Promise<{ job: GenerationJobSnapshot; reused: boolean }> {
  const { userId, conversationId, inputPayload } = args;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .in('status', ['queued', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing && existing.length > 0) {
    return {
      job: toSnapshot(existing[0] as JobRow),
      reused: true,
    };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      status: 'queued',
      phase: 'queued',
      progress_percent: 0,
      input_payload: inputPayload,
      attempt: 0,
      heartbeat_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    const isActiveConflict = insertError?.message?.includes('idx_grad_plan_generation_jobs_active_unique');
    if (isActiveConflict) {
      const { data: conflictedJob, error: conflictReadError } = await supabaseAdmin
        .from('grad_plan_generation_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .in('status', ['queued', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conflictReadError) {
        throw new Error(conflictReadError.message);
      }
      if (conflictedJob) {
        return {
          job: toSnapshot(conflictedJob as JobRow),
          reused: true,
        };
      }
    }

    throw new Error(insertError?.message || 'Failed to create generation job');
  }

  await appendEvent({
    jobId: inserted.id,
    eventType: 'job_created',
    phase: 'queued',
    message: 'Generation job created',
    progressPercent: 0,
  });

  return {
    job: toSnapshot(inserted as JobRow),
    reused: false,
  };
}

export async function getGenerationJobSnapshot(args: {
  jobId: string;
  userId?: string;
}): Promise<GenerationJobSnapshot | null> {
  const { jobId, userId } = args;
  let query = supabaseAdmin
    .from('grad_plan_generation_jobs')
    .select('*')
    .eq('id', jobId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return toSnapshot(data as JobRow);
}

export async function listGenerationJobEvents(args: {
  jobId: string;
  userId?: string;
  afterId?: number;
  limit?: number;
}): Promise<GenerationJobEvent[]> {
  const { jobId, userId, afterId = 0, limit = 100 } = args;
  if (userId) {
    const snapshot = await getGenerationJobSnapshot({ jobId, userId });
    if (!snapshot) return [];
  }

  const { data, error } = await supabaseAdmin
    .from('grad_plan_generation_job_events')
    .select('*')
    .eq('job_id', jobId)
    .gt('id', afterId)
    .order('id', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(row => toEvent(row as JobEventRow));
}

export async function requestGenerationJobCancel(args: {
  jobId: string;
  userId: string;
}): Promise<GenerationJobSnapshot | null> {
  const { jobId, userId } = args;
  const snapshot = await getGenerationJobSnapshot({ jobId, userId });
  if (!snapshot) return null;
  if (terminalStatuses.has(snapshot.status)) {
    return snapshot;
  }

  const now = new Date().toISOString();
  const nextStatus: GenerationJobStatus = snapshot.status === 'queued' ? 'canceled' : 'cancel_requested';
  const nextPhase: GenerationPhase = nextStatus === 'canceled' ? 'canceled' : snapshot.phase;

  const { data, error } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .update({
      status: nextStatus,
      phase: nextPhase,
      completed_at: nextStatus === 'canceled' ? now : null,
      heartbeat_at: now,
      updated_at: now,
    })
    .eq('id', jobId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await appendEvent({
    jobId,
    eventType: nextStatus === 'canceled' ? 'job_canceled' : 'job_progress',
    phase: nextPhase,
    message: nextStatus === 'canceled' ? 'Job canceled before execution' : 'Cancellation requested',
    progressPercent: snapshot.progressPercent,
  });

  return data ? toSnapshot(data as JobRow) : null;
}

function isRetriableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return retriableErrorPatterns.some(pattern => message.includes(pattern));
}

async function updateJobProgress(args: {
  jobId: string;
  phase: GenerationPhase;
  status?: GenerationJobStatus;
  progressPercent?: number;
  message?: string;
  eventType?: GenerationJobEventType;
  payloadJson?: Record<string, unknown> | null;
}) {
  const {
    jobId,
    phase,
    status,
    progressPercent,
    message,
    eventType = 'job_progress',
    payloadJson = null,
  } = args;
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    phase,
    heartbeat_at: now,
    updated_at: now,
  };

  if (status) updates.status = status;
  if (typeof progressPercent === 'number') updates.progress_percent = progressPercent;

  const { error } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    throw new Error(error.message);
  }

  await appendEvent({
    jobId,
    eventType,
    phase,
    progressPercent: typeof progressPercent === 'number' ? progressPercent : null,
    message: message ?? null,
    payloadJson,
  });
}

async function getJobInput(jobId: string): Promise<JobRow | null> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as JobRow | null;
}

async function buildPhasePrompt(args: {
  phase: AutomaticModelPhase;
  input: Record<string, unknown>;
}): Promise<string> {
  const basePrompt = await GetAiPrompt('active_feedback_mode');
  const serializedInput = JSON.stringify(args.input, null, 2);
  const exampleStructureJson = await loadActiveFeedbackExampleStructure();
  return injectActiveFeedbackPromptValues({
    basePrompt: basePrompt || DEFAULT_ACTIVE_FEEDBACK_PROMPT,
    phase: args.phase,
    serializedInput,
    exampleStructureJson,
  });
}

function filterProgramsByType(
  programs: unknown[],
  predicate: (programType: string) => boolean
): unknown[] {
  return programs.filter(program => {
    if (!program || typeof program !== 'object') return false;
    const rawType = (program as { programType?: unknown }).programType;
    const type = typeof rawType === 'string' ? rawType.toLowerCase() : '';
    return predicate(type);
  });
}

function buildPhaseInputPayload(args: {
  phase: AutomaticModelPhase;
  payload: Record<string, unknown>;
  draftPlan?: Record<string, unknown>;
}): Record<string, unknown> {
  const { phase, payload, draftPlan } = args;
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
  };

  if (draftPlan) {
    base.draftPlan = draftPlan;
  }

  if (phase === 'major_skeleton' || phase === 'major_fill') {
    base.programs = filterProgramsByType(
      programs,
      programType => programType === 'major' || programType === 'honors' || programType === 'graduate'
    );
    base.phaseScope = 'major';
  } else if (phase === 'minor_fill') {
    base.programs = filterProgramsByType(programs, programType => programType === 'minor');
    base.phaseScope = 'minor';
  } else if (phase === 'gen_ed_fill') {
    base.generalEducation = payload.generalEducation;
    base.phaseScope = 'gen_ed';
  } else if (phase === 'elective_fill') {
    base.userAddedElectives = payload.userAddedElectives;
    base.phaseScope = 'electives';
  }

  return base;
}

async function runPhaseModel(args: {
  phase: AutomaticModelPhase;
  payload: Record<string, unknown>;
  draftPlan?: Record<string, unknown>;
}): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const phaseInput = buildPhaseInputPayload({
    phase: args.phase,
    payload: args.payload,
    draftPlan: args.draftPlan,
  });

  const promptText = await buildPhasePrompt({
    phase: args.phase,
    input: phaseInput,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: promptText }],
      temperature: 1,
      max_completion_tokens: 18_000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI phase generation failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new Error('OpenAI phase generation returned empty content');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`OpenAI phase output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runPhaseWithRetry(args: {
  phase: AutomaticModelPhase;
  payload: Record<string, unknown>;
  draftPlan?: Record<string, unknown>;
}) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await runPhaseModel(args);
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

async function persistFinalPlan(args: {
  userId: string;
  payload: Record<string, unknown>;
  finalPlan: Record<string, unknown>;
}): Promise<{ accessId: string }> {
  const { userId, payload, finalPlan } = args;
  const { data: studentData, error: studentError } = await supabaseAdmin
    .from('student')
    .select('id')
    .eq('profile_id', userId)
    .single();

  if (studentError || !studentData?.id) {
    throw new Error(studentError?.message || 'Could not find student record');
  }

  const selectedPrograms = Array.isArray(payload.selectedPrograms)
    ? payload.selectedPrograms
      .map(value => Number(value))
      .filter(value => !Number.isNaN(value))
    : [];

  const withMetadata = {
    ...(finalPlan || {}),
    created_with_transcript: Boolean(payload.created_with_transcript ?? payload.hasTranscript),
  };

  const { accessId } = await InsertGeneratedGradPlan({
    studentId: studentData.id,
    planData: withMetadata,
    programsInPlan: selectedPrograms,
    isActive: false,
    userId,
  });

  return { accessId };
}

async function failJob(
  jobId: string,
  message: string,
  payloadJson: Record<string, unknown> | null = null
) {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .update({
      status: 'failed',
      phase: 'failed',
      error_message: message,
      completed_at: now,
      heartbeat_at: now,
      updated_at: now,
    })
    .eq('id', jobId);

  await appendEvent({
    jobId,
    eventType: 'job_failed',
    phase: 'failed',
    message,
    progressPercent: null,
    payloadJson,
  });
}

async function claimQueuedGenerationJob(row: JobRow): Promise<JobRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
    .update({
      status: 'in_progress',
      phase: 'preparing',
      progress_percent: 5,
      started_at: row.started_at || now,
      heartbeat_at: now,
      updated_at: now,
      attempt: (row.attempt || 0) + 1,
    })
    .eq('id', row.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as JobRow | null) ?? null;
}

export async function triggerGenerationJob(jobId: string): Promise<void> {
  if (runningJobs.has(jobId)) {
    return;
  }
  runningJobs.add(jobId);
  try {
    await processGenerationJob(jobId);
  } finally {
    runningJobs.delete(jobId);
  }
}

export async function processGenerationJob(jobId: string): Promise<void> {
  const row = await getJobInput(jobId);
  if (!row) return;
  if (terminalStatuses.has(row.status)) return;

  if (row.status === 'cancel_requested') {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('grad_plan_generation_jobs')
      .update({
        status: 'canceled',
        phase: 'canceled',
        completed_at: now,
        heartbeat_at: now,
        updated_at: now,
      })
      .eq('id', jobId);
    await appendEvent({
      jobId,
      eventType: 'job_canceled',
      phase: 'canceled',
      message: 'Generation canceled before execution',
      progressPercent: row.progress_percent,
    });
    return;
  }

  if (row.status !== 'queued') {
    // Another worker is already processing or a terminal transition happened.
    return;
  }

  const claimed = await claimQueuedGenerationJob(row);
  if (!claimed) {
    // Lost claim race to another worker/process.
    return;
  }

  await appendEvent({
    jobId,
    eventType: 'job_started',
    phase: 'preparing',
    message: 'Generation job started',
    progressPercent: 5,
  });

  let persistedAccessId: string | null = null;
  try {
    const workflowResult = await runAutomaticGradPlanWorkflow({
      jobId,
      payload: claimed.input_payload || {},
      deps: {
        onPhaseStarted: async (phase, progressPercent, message) => {
          const latest = await getJobInput(jobId);
          if (latest?.status === 'cancel_requested') {
            throw new Error('Generation canceled by user');
          }
          await updateJobProgress({
            jobId,
            phase,
            status: 'in_progress',
            progressPercent,
            message,
            eventType: 'phase_started',
          });
        },
        onPhaseCompleted: async (phase, progressPercent, message) => {
          await updateJobProgress({
            jobId,
            phase,
            status: 'in_progress',
            progressPercent,
            message,
            eventType: phase === 'completed' ? 'job_progress' : 'phase_completed',
          });
        },
        runPhase: async ({ phase, payload, draftPlan }) => {
          return await runPhaseWithRetry({ phase, payload, draftPlan });
        },
        validatePlan: ({ payload, finalPlan }) => {
          return validateAutomaticPlan({ payload, finalPlan });
        },
        persistPlan: async ({ payload, finalPlan }) => {
          return await persistFinalPlan({
            userId: claimed.user_id,
            payload,
            finalPlan,
          });
        },
      },
    });
    persistedAccessId = workflowResult.accessId;

    const completedAt = new Date().toISOString();
    const { error: completeError } = await supabaseAdmin
      .from('grad_plan_generation_jobs')
      .update({
        status: 'completed',
        phase: 'completed',
        progress_percent: 100,
        output_access_id: workflowResult.accessId,
        completed_at: completedAt,
        heartbeat_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', jobId);

    if (completeError) {
      throw new Error(completeError.message);
    }

    await appendEvent({
      jobId,
      eventType: 'job_completed',
      phase: 'completed',
      message: 'Graduation plan generated successfully',
      progressPercent: 100,
      payloadJson: {
        accessId: workflowResult.accessId,
      },
    });
  } catch (error) {
    if (persistedAccessId) {
      const completedAt = new Date().toISOString();
      await supabaseAdmin
        .from('grad_plan_generation_jobs')
        .update({
          status: 'completed',
          phase: 'completed',
          progress_percent: 100,
          output_access_id: persistedAccessId,
          completed_at: completedAt,
          heartbeat_at: completedAt,
          updated_at: completedAt,
          error_message: null,
        })
        .eq('id', jobId);
      await appendEvent({
        jobId,
        eventType: 'job_completed',
        phase: 'completed',
        message: 'Graduation plan generated successfully',
        progressPercent: 100,
        payloadJson: {
          accessId: persistedAccessId,
        },
      });
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('canceled')) {
      const canceledAt = new Date().toISOString();
      await supabaseAdmin
        .from('grad_plan_generation_jobs')
        .update({
          status: 'canceled',
          phase: 'canceled',
          completed_at: canceledAt,
          heartbeat_at: canceledAt,
          updated_at: canceledAt,
          error_message: null,
        })
        .eq('id', jobId);
      await appendEvent({
        jobId,
        eventType: 'job_canceled',
        phase: 'canceled',
        message: 'Generation canceled',
        progressPercent: null,
      });
      return;
    }

    if (error instanceof WorkflowValidationError) {
      await failJob(jobId, message, {
        code: 'validation_failed',
        attempts: error.attempts,
        issues: error.result.issues,
        suggestedRepairPhases: error.result.suggestedRepairPhases,
      });
      return;
    }

    await failJob(jobId, message);
  }
}

export function isTerminalJobStatus(status: GenerationJobStatus): boolean {
  return terminalStatuses.has(status);
}

export async function runGenerationJobsWorkerCycle(limit = 3): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_generation_jobs')
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
    await triggerGenerationJob(id);
  }

  return processed;
}
