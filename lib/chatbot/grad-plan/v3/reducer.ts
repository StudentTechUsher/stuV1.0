import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  type AgentContextSession,
  type AgentContextSnapshot,
  type MiniChatMessage,
  type ContextEventUnion,
  type StoredContextEventUnion,
  type V3GenerationPhase,
} from '@/lib/chatbot/grad-plan/v3/types';

function clampProgress(value: number | undefined, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return Math.max(0, Math.min(100, fallback));
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toStringArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.filter((value): value is string => typeof value === 'string');
}

function toFiniteNumber(value: number | undefined, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
}

function mergeMiniChatMessages(
  current: MiniChatMessage[],
  incoming: MiniChatMessage
): MiniChatMessage[] {
  const existingIndex = current.findIndex((message) => message.id === incoming.id);
  if (existingIndex < 0) {
    return [...current, incoming];
  }
  const next = [...current];
  next[existingIndex] = {
    ...next[existingIndex],
    ...incoming,
  };
  return next;
}

export function createInitialAgentContextSnapshot(
  overrides: Partial<AgentContextSnapshot> = {}
): AgentContextSnapshot {
  const now = new Date().toISOString();

  const base: AgentContextSnapshot = {
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    profile: {
      confirmed: false,
      studentType: null,
      admissionYear: null,
      estimatedGraduationTerm: null,
      estimatedGraduationYear: null,
    },
    transcript: {
      choice: null,
      hasTranscript: false,
      transcriptRecordId: null,
      completedCourseCodes: [],
      lastEvaluatedAt: null,
    },
    programs: {
      selected: [],
    },
    courses: {
      selectedCourses: [],
      requestedElectives: [],
      requirementBuckets: [],
      remainingRequirementCredits: 0,
      requestedElectiveCredits: 0,
      totalCreditsToComplete: 0,
      totalSelectedCredits: 0,
    },
    distribution: {
      strategy: null,
      minCreditsPerTerm: null,
      maxCreditsPerTerm: null,
      targetCreditsPerTerm: null,
      includeSecondaryTerms: false,
    },
    constraints: {
      workStatus: null,
      milestones: [],
      notes: null,
    },
    generation: {
      style: null,
      status: 'idle',
      phase: null,
      progressPercent: 0,
      message: null,
      jobId: null,
      outputAccessId: null,
      errorCode: null,
      errorMessage: null,
      repairLoopCount: 0,
      lastEventAt: null,
    },
    meta: {
      sessionId: null,
      conversationId: null,
      createdAt: now,
      updatedAt: now,
    },
    miniChat: {
      messages: [],
      pendingCommand: null,
    },
  };

  return {
    ...base,
    ...overrides,
    schemaVersion: AGENT_CONTEXT_SCHEMA_VERSION,
    profile: {
      ...base.profile,
      ...(overrides.profile ?? {}),
    },
    transcript: {
      ...base.transcript,
      ...(overrides.transcript ?? {}),
      completedCourseCodes: toStringArray(overrides.transcript?.completedCourseCodes),
    },
    programs: {
      ...base.programs,
      ...(overrides.programs ?? {}),
      selected: overrides.programs?.selected ?? base.programs.selected,
    },
    courses: {
      ...base.courses,
      ...(overrides.courses ?? {}),
      selectedCourses: overrides.courses?.selectedCourses ?? base.courses.selectedCourses,
      requestedElectives: overrides.courses?.requestedElectives ?? base.courses.requestedElectives,
      requirementBuckets: overrides.courses?.requirementBuckets ?? base.courses.requirementBuckets,
      remainingRequirementCredits: toFiniteNumber(
        overrides.courses?.remainingRequirementCredits,
        base.courses.remainingRequirementCredits
      ),
      requestedElectiveCredits: toFiniteNumber(
        overrides.courses?.requestedElectiveCredits,
        base.courses.requestedElectiveCredits
      ),
      totalCreditsToComplete: toFiniteNumber(
        overrides.courses?.totalCreditsToComplete,
        base.courses.totalCreditsToComplete
      ),
      totalSelectedCredits: toFiniteNumber(
        overrides.courses?.totalSelectedCredits,
        base.courses.totalSelectedCredits
      ),
    },
    distribution: {
      ...base.distribution,
      ...(overrides.distribution ?? {}),
    },
    constraints: {
      ...base.constraints,
      ...(overrides.constraints ?? {}),
      milestones: overrides.constraints?.milestones ?? base.constraints.milestones,
    },
    generation: {
      ...base.generation,
      ...(overrides.generation ?? {}),
      progressPercent: clampProgress(
        overrides.generation?.progressPercent,
        base.generation.progressPercent
      ),
    },
    meta: {
      ...base.meta,
      ...(overrides.meta ?? {}),
      createdAt: overrides.meta?.createdAt ?? base.meta.createdAt,
      updatedAt: overrides.meta?.updatedAt ?? base.meta.updatedAt,
    },
    miniChat: {
      ...base.miniChat,
      ...(overrides.miniChat ?? {}),
      messages: overrides.miniChat?.messages ?? base.miniChat.messages,
    },
  };
}

export function migrateAgentContextSnapshot(
  snapshot: Partial<AgentContextSnapshot> | null | undefined
): AgentContextSnapshot {
  if (!snapshot) {
    return createInitialAgentContextSnapshot();
  }

  return createInitialAgentContextSnapshot(snapshot);
}

function resolveGenerationStatusFromPhase(
  phase: V3GenerationPhase,
  explicitStatus: AgentContextSnapshot['generation']['status'] | undefined
): AgentContextSnapshot['generation']['status'] {
  if (explicitStatus) return explicitStatus;

  if (phase === 'completed') return 'completed';
  if (phase === 'failed') return 'failed';
  if (phase === 'canceled') return 'canceled';
  if (phase === 'queued') return 'queued';
  return 'running';
}

export function applyContextEvent(
  current: AgentContextSnapshot,
  event: ContextEventUnion
): AgentContextSnapshot {
  const snapshot = migrateAgentContextSnapshot(current);
  const eventTimestamp = event.createdAt || new Date().toISOString();

  const next: AgentContextSnapshot = {
    ...snapshot,
    meta: {
      ...snapshot.meta,
      updatedAt: eventTimestamp,
    },
  };

  switch (event.type) {
    case 'profile_confirmed': {
      next.profile = {
        ...snapshot.profile,
        ...event.payload,
        confirmed: true,
      };
      break;
    }
    case 'transcript_choice_set': {
      const hasTranscript = event.payload.choice === 'upload_new' || event.payload.choice === 'use_current';
      next.transcript = {
        ...snapshot.transcript,
        choice: event.payload.choice,
        hasTranscript,
        transcriptRecordId: event.payload.transcriptRecordId ?? snapshot.transcript.transcriptRecordId,
        completedCourseCodes: toStringArray(event.payload.completedCourseCodes ?? snapshot.transcript.completedCourseCodes),
        lastEvaluatedAt: event.payload.lastEvaluatedAt ?? snapshot.transcript.lastEvaluatedAt,
      };
      break;
    }
    case 'programs_selected': {
      next.programs = {
        ...snapshot.programs,
        selected: event.payload.selectedPrograms,
      };
      break;
    }
    case 'course_selection_submitted': {
      next.courses = {
        ...snapshot.courses,
        selectedCourses: event.payload.selectedCourses,
        requestedElectives: event.payload.requestedElectives,
        requirementBuckets: event.payload.requirementBuckets,
        remainingRequirementCredits: toFiniteNumber(event.payload.remainingRequirementCredits),
        requestedElectiveCredits: toFiniteNumber(event.payload.requestedElectiveCredits),
        totalCreditsToComplete: toFiniteNumber(event.payload.totalCreditsToComplete),
        totalSelectedCredits: toFiniteNumber(event.payload.totalSelectedCredits),
      };
      break;
    }
    case 'distribution_selected': {
      next.distribution = {
        ...snapshot.distribution,
        ...event.payload,
      };
      break;
    }
    case 'constraints_selected': {
      next.constraints = {
        ...snapshot.constraints,
        ...event.payload,
      };
      break;
    }
    case 'mini_chat_message_added': {
      next.miniChat = {
        ...snapshot.miniChat,
        messages: mergeMiniChatMessages(snapshot.miniChat.messages, {
          id: event.payload.messageId,
          role: event.payload.role,
          message: event.payload.message,
          ts: eventTimestamp,
          commandType: event.payload.commandType ?? null,
          status: event.payload.status,
        }),
      };
      break;
    }
    case 'generation_command_requested': {
      next.miniChat = {
        ...snapshot.miniChat,
        pendingCommand: event.payload.commandType,
      };
      next.generation = {
        ...snapshot.generation,
        status:
          event.payload.commandType === 'pause'
            ? 'pause_requested'
            : event.payload.commandType === 'cancel'
            ? 'cancel_requested'
            : snapshot.generation.status,
        jobId: event.payload.jobId ?? snapshot.generation.jobId,
        lastEventAt: eventTimestamp,
      };
      break;
    }
    case 'generation_command_applied': {
      const nextStatus = event.payload.commandType === 'pause'
        ? event.payload.outcome === 'applied'
          ? 'paused'
          : snapshot.generation.status
        : event.payload.commandType === 'resume'
        ? event.payload.outcome === 'applied'
          ? 'running'
          : snapshot.generation.status
        : event.payload.commandType === 'cancel'
        ? event.payload.outcome === 'applied'
          ? 'canceled'
          : snapshot.generation.status
        : event.payload.commandType === 'retry'
        ? event.payload.outcome === 'applied'
          ? 'queued'
          : snapshot.generation.status
        : snapshot.generation.status;

      next.miniChat = {
        ...snapshot.miniChat,
        pendingCommand:
          snapshot.miniChat.pendingCommand === event.payload.commandType
            ? null
            : snapshot.miniChat.pendingCommand,
      };
      next.generation = {
        ...snapshot.generation,
        status: nextStatus,
        jobId: event.payload.jobId ?? snapshot.generation.jobId,
        message: event.payload.message ?? snapshot.generation.message,
        lastEventAt: eventTimestamp,
      };
      break;
    }
    case 'generation_mode_selected': {
      next.generation = {
        ...snapshot.generation,
        style: event.payload.style,
        status: 'idle',
        phase: null,
        progressPercent: 0,
        message: null,
        jobId: null,
        outputAccessId: null,
        errorCode: null,
        errorMessage: null,
        repairLoopCount: 0,
        lastEventAt: eventTimestamp,
      };
      next.miniChat = {
        ...snapshot.miniChat,
        pendingCommand: null,
      };
      break;
    }
    case 'generation_phase_updated': {
      const status = resolveGenerationStatusFromPhase(event.payload.phase, event.payload.status);
      const phase = event.payload.phase;
      const eventProgress = clampProgress(event.payload.progressPercent, snapshot.generation.progressPercent);
      const progressPercent =
        status === 'failed' || status === 'canceled'
          ? snapshot.generation.progressPercent
          : Math.max(snapshot.generation.progressPercent, eventProgress);

      next.generation = {
        ...snapshot.generation,
        status,
        phase,
        progressPercent,
        message: event.payload.message ?? snapshot.generation.message,
        jobId: event.payload.jobId ?? snapshot.generation.jobId,
        errorCode: status === 'failed' ? snapshot.generation.errorCode : null,
        errorMessage: status === 'failed' ? snapshot.generation.errorMessage : null,
        repairLoopCount: event.payload.repairLoopCount ?? snapshot.generation.repairLoopCount,
        lastEventAt: eventTimestamp,
      };
      break;
    }
    case 'generation_completed': {
      next.generation = {
        ...snapshot.generation,
        status: 'completed',
        phase: 'completed',
        progressPercent: 100,
        message: event.payload.message ?? 'Generation completed',
        outputAccessId: event.payload.outputAccessId,
        jobId: event.payload.jobId ?? snapshot.generation.jobId,
        errorCode: null,
        errorMessage: null,
        lastEventAt: eventTimestamp,
      };
      next.miniChat = {
        ...snapshot.miniChat,
        pendingCommand: null,
      };
      break;
    }
    case 'generation_failed': {
      next.generation = {
        ...snapshot.generation,
        status: 'failed',
        phase: event.payload.phase ?? 'failed',
        message: event.payload.errorMessage,
        errorCode: event.payload.errorCode ?? null,
        errorMessage: event.payload.errorMessage,
        jobId: event.payload.jobId ?? snapshot.generation.jobId,
        lastEventAt: eventTimestamp,
      };
      next.miniChat = {
        ...snapshot.miniChat,
        pendingCommand: null,
      };
      break;
    }
    case 'generation_canceled': {
      next.generation = {
        ...snapshot.generation,
        status: 'canceled',
        phase: event.payload.phase ?? 'canceled',
        message: event.payload.message ?? 'Generation canceled',
        jobId: event.payload.jobId ?? snapshot.generation.jobId,
        lastEventAt: eventTimestamp,
      };
      next.miniChat = {
        ...snapshot.miniChat,
        pendingCommand: null,
      };
      break;
    }
    default: {
      return next;
    }
  }

  return next;
}

function eventSortValue(event: ContextEventUnion | StoredContextEventUnion): number {
  if ('sequenceId' in event && typeof event.sequenceId === 'number') {
    return event.sequenceId;
  }
  return Date.parse(event.createdAt) || 0;
}

export function reduceContextEvents(
  events: Array<ContextEventUnion | StoredContextEventUnion>,
  initialState?: Partial<AgentContextSnapshot>
): AgentContextSnapshot {
  const initialSnapshot = migrateAgentContextSnapshot(initialState);
  const seenEventIds = new Set<string>();
  const seenIdempotencyKeys = new Set<string>();

  const ordered = [...events].sort((a, b) => eventSortValue(a) - eventSortValue(b));

  let nextState = initialSnapshot;
  for (const event of ordered) {
    if (seenEventIds.has(event.id)) {
      continue;
    }
    if (event.idempotencyKey && seenIdempotencyKeys.has(event.idempotencyKey)) {
      continue;
    }

    seenEventIds.add(event.id);
    if (event.idempotencyKey) {
      seenIdempotencyKeys.add(event.idempotencyKey);
    }

    nextState = applyContextEvent(nextState, event as ContextEventUnion);
  }

  return nextState;
}

export function deriveV3SessionStatus(snapshot: AgentContextSnapshot): AgentContextSession['status'] {
  if (snapshot.generation.status === 'completed') return 'completed';
  if (snapshot.generation.status === 'failed') return 'failed';
  if (snapshot.generation.status === 'canceled') return 'canceled';
  return 'active';
}
