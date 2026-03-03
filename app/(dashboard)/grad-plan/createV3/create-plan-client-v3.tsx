'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  AgentTracePanel,
  ContextRail,
  CreateV3Shell,
  GenerationModeCard,
  GenerationProgressCard,
  GuidedStepCard,
  InlineValidationNotice,
  MiniChatPanel,
} from '@/components/grad-plan/v3';
import { clientLogger } from '@/lib/client-logger';
import {
  applyContextEvent,
  createInitialAgentContextSnapshot,
  migrateAgentContextSnapshot,
} from '@/lib/chatbot/grad-plan/v3/reducer';
import type {
  AgentContextSnapshot,
  ContextEvent,
  ContextEventPayloadMap,
  ContextEventType,
  MiniChatMessage,
  ProgramDescriptor,
  SelectedCourseItem,
  TraceEvent,
  TranscriptChoice,
  V3GenerationCommandType,
  V3GenerationJobEvent,
  V3GenerationJobStatus,
  V3GenerationPhase,
  WorkStatus,
} from '@/lib/chatbot/grad-plan/v3/types';
import {
  buildCandidateCourseSelection,
  buildProgramRequirements,
  buildRequirementBuckets,
  type PipelineProgramRow,
  type PipelineTranscriptCourse,
} from '@/lib/grad-plan/v3/dataPipeline';

type StudentProfileLike = Record<string, unknown>;

interface CreatePlanClientV3Props {
  user: User;
  studentProfile: StudentProfileLike;
  v3ClientEnabled: boolean;
  v3DevtoolsEnabled: boolean;
  v3LiveJobsEnabled: boolean;
  v3MiniChatEnabled: boolean;
}

type StepDataPayload = {
  sessionId: string;
  schemaVersion: number;
  programs: ProgramDescriptor[];
  programRows: PipelineProgramRow[];
  requiredCourseOptions: SelectedCourseItem[];
  electiveCourseOptions: SelectedCourseItem[];
  transcriptCourses: PipelineTranscriptCourse[];
  completedCourseCodes: string[];
};

const STEP_TITLES = [
  'Profile',
  'Transcript',
  'Programs',
  'Courses',
  'Distribution',
  'Constraints',
  'Generation',
] as const;

const DISTRIBUTION_PRESETS = {
  fast_track: { min: 16, max: 19, target: 18, includeSecondaryTerms: true },
  balanced: { min: 14, max: 17, target: 15, includeSecondaryTerms: false },
  explore: { min: 12, max: 15, target: 13, includeSecondaryTerms: true },
} as const;

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveStudentType(rawValue: unknown): 'undergraduate' | 'honor' | 'graduate' {
  if (rawValue === 'undergraduate' || rawValue === 'honor' || rawValue === 'graduate') {
    return rawValue;
  }
  if (rawValue === 'honors') {
    return 'honor';
  }
  return 'undergraduate';
}

function getProfileDefaults(studentProfile: StudentProfileLike) {
  const gradDate = typeof studentProfile.est_grad_date === 'string'
    ? new Date(studentProfile.est_grad_date)
    : null;

  return {
    confirmed: false,
    studentType: resolveStudentType(studentProfile.student_type),
    admissionYear: typeof studentProfile.admission_year === 'number'
      ? studentProfile.admission_year
      : null,
    estimatedGraduationTerm: typeof studentProfile.est_grad_sem === 'string'
      ? studentProfile.est_grad_sem
      : null,
    estimatedGraduationYear: gradDate && !Number.isNaN(gradDate.getTime())
      ? gradDate.getUTCFullYear()
      : null,
  } satisfies AgentContextSnapshot['profile'];
}

function buildSessionStorageKey(userId: string): string {
  return `grad-plan-v3-session:${userId}`;
}

function buildConversationStorageKey(userId: string): string {
  return `grad-plan-v3-conversation:${userId}`;
}

function buildJobStorageKey(userId: string, sessionId: string): string {
  return `grad-plan-v3-job:${userId}:${sessionId}`;
}

function getContextEventEndpoint(sessionId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/events`;
}

function getSessionEndpoint(sessionId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}`;
}

function getStepDataEndpoint(sessionId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/step-data`;
}

function getTraceEndpoint(sessionId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/trace`;
}

function getTraceSseEndpoint(sessionId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/trace/events`;
}

function getJobCreateEndpoint(sessionId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/jobs`;
}

function getJobSnapshotEndpoint(sessionId: string, jobId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/jobs/${jobId}`;
}

function getJobEventsEndpoint(sessionId: string, jobId: string, afterId = 0): string {
  const query = afterId > 0 ? `?afterId=${afterId}` : '';
  return `/api/grad-plan/v3/sessions/${sessionId}/jobs/${jobId}/events${query}`;
}

function getJobCommandsEndpoint(sessionId: string, jobId: string): string {
  return `/api/grad-plan/v3/sessions/${sessionId}/jobs/${jobId}/commands`;
}

function uniqueTraceEvents(events: TraceEvent[]): TraceEvent[] {
  const seen = new Set<string>();
  const deduped: TraceEvent[] = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    deduped.push(event);
  }
  return deduped.sort((a, b) => {
    const aId = typeof a.sequenceId === 'number' ? a.sequenceId : 0;
    const bId = typeof b.sequenceId === 'number' ? b.sequenceId : 0;
    return aId - bId;
  });
}

function dedupeCourses(courses: SelectedCourseItem[]): SelectedCourseItem[] {
  const seen = new Set<string>();
  const deduped: SelectedCourseItem[] = [];
  for (const course of courses) {
    if (seen.has(course.courseCode)) continue;
    seen.add(course.courseCode);
    deduped.push(course);
  }
  return deduped;
}

function mapGenerationStatusToJobStatus(status: AgentContextSnapshot['generation']['status']): V3GenerationJobStatus | 'idle' {
  if (status === 'idle') return 'idle';
  if (status === 'queued') return 'queued';
  if (status === 'running') return 'in_progress';
  if (status === 'pause_requested') return 'pause_requested';
  if (status === 'paused') return 'paused';
  if (status === 'cancel_requested') return 'cancel_requested';
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'canceled';
}

function nextStepFromSnapshot(snapshot: AgentContextSnapshot): number {
  if (!snapshot.profile.confirmed) return 1;
  if (!snapshot.transcript.choice) return 2;
  if (snapshot.programs.selected.length === 0) return 3;
  if (snapshot.courses.totalCreditsToComplete <= 0) return 4;
  if (!snapshot.distribution.strategy) return 5;
  if (!snapshot.constraints.workStatus) return 6;
  return 7;
}

function buildSyntheticContextEvent<TType extends ContextEventType>(args: {
  sessionId: string;
  type: TType;
  payload: ContextEventPayloadMap[TType];
  actor?: ContextEvent['actor'];
}): ContextEvent<TType> {
  return {
    id: createId('local'),
    sessionId: args.sessionId,
    schemaVersion: 1,
    type: args.type,
    payload: args.payload,
    actor: args.actor ?? 'agent',
    createdAt: new Date().toISOString(),
  };
}

function mapPhaseToProgress(phase: V3GenerationPhase | null, fallback: number): number {
  const map: Record<V3GenerationPhase, number> = {
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
    failed: fallback,
    canceled: fallback,
  };

  if (!phase) return fallback;
  return map[phase] ?? fallback;
}

export default function CreatePlanClientV3({
  user,
  studentProfile,
  v3ClientEnabled,
  v3DevtoolsEnabled,
  v3LiveJobsEnabled,
  v3MiniChatEnabled,
}: Readonly<CreatePlanClientV3Props>) {
  const router = useRouter();

  const traceEventSourceRef = useRef<EventSource | null>(null);
  const jobEventSourceRef = useRef<EventSource | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const lastJobEventIdRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AgentContextSnapshot>(() =>
    createInitialAgentContextSnapshot({
      profile: getProfileDefaults(studentProfile),
    })
  );
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [generationConnected, setGenerationConnected] = useState(true);
  const [stepData, setStepData] = useState<StepDataPayload | null>(null);
  const [isStepDataLoading, setIsStepDataLoading] = useState(false);

  const [transcriptChoice, setTranscriptChoice] = useState<TranscriptChoice | null>(null);
  const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>([]);
  const [selectedRequiredCourseCodes, setSelectedRequiredCourseCodes] = useState<string[]>([]);
  const [selectedElectiveCourseCodes, setSelectedElectiveCourseCodes] = useState<string[]>([]);
  const [distributionStrategy, setDistributionStrategy] = useState<keyof typeof DISTRIBUTION_PRESETS | null>('balanced');
  const [workStatus, setWorkStatus] = useState<WorkStatus>('part_time');
  const [constraintNotes, setConstraintNotes] = useState('');
  const [includeInternshipMilestone, setIncludeInternshipMilestone] = useState(true);
  const [generationMode, setGenerationMode] = useState<'automatic' | 'active_feedback' | null>('automatic');
  const [traceLevelFilter, setTraceLevelFilter] = useState<'all' | 'debug' | 'info' | 'warn' | 'error'>('all');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const applySnapshot = useCallback((nextSnapshot: Partial<AgentContextSnapshot> | null | undefined) => {
    if (!nextSnapshot) return;
    const migrated = migrateAgentContextSnapshot(nextSnapshot);
    setSnapshot(migrated);
    setActiveStep(nextStepFromSnapshot(migrated));
  }, []);

  const hydrateFromSnapshot = useCallback((nextSnapshot: AgentContextSnapshot) => {
    setTranscriptChoice(nextSnapshot.transcript.choice);
    setSelectedProgramIds(nextSnapshot.programs.selected.map((program) => program.programId));
    setSelectedRequiredCourseCodes(nextSnapshot.courses.selectedCourses.map((course) => course.courseCode));
    setSelectedElectiveCourseCodes(nextSnapshot.courses.requestedElectives.map((course) => course.courseCode));
    setGenerationMode(nextSnapshot.generation.style);

    if (nextSnapshot.distribution.strategy) {
      setDistributionStrategy(nextSnapshot.distribution.strategy);
    }

    if (nextSnapshot.constraints.workStatus) {
      setWorkStatus(nextSnapshot.constraints.workStatus);
    }

    setConstraintNotes(nextSnapshot.constraints.notes ?? '');
    setIncludeInternshipMilestone(nextSnapshot.constraints.milestones.some((milestone) => milestone.id === 'internship'));

    if (nextSnapshot.generation.jobId) {
      setActiveJobId(nextSnapshot.generation.jobId);
    }
  }, []);

  const appendLocalMiniChatMessage = useCallback((message: MiniChatMessage) => {
    if (!sessionId) return;

    setSnapshot((current) =>
      applyContextEvent(
        current,
        buildSyntheticContextEvent({
          sessionId,
          type: 'mini_chat_message_added',
          payload: {
            messageId: message.id,
            role: message.role,
            message: message.message,
            commandType: message.commandType,
            status: message.status,
          },
          actor: message.role === 'user' ? 'user' : 'system',
        })
      )
    );
  }, [sessionId]);

  const appendContextEvent = useCallback(
    async <TType extends ContextEventType>(
      type: TType,
      payload: ContextEventPayloadMap[TType],
      actor: ContextEvent['actor'] = 'user',
      options: { idempotencyKey?: string; localFallback?: boolean } = {}
    ): Promise<boolean> => {
      if (!sessionId) {
        return false;
      }

      const event: ContextEvent<TType> = {
        id: createId('ctxevt'),
        sessionId,
        schemaVersion: snapshot.schemaVersion,
        type,
        payload,
        actor,
        createdAt: new Date().toISOString(),
        idempotencyKey: options.idempotencyKey,
      };

      setIsSaving(true);
      setErrorMessage(null);

      try {
        const response = await fetch(getContextEventEndpoint(sessionId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            eventType: event.type,
            payload: event.payload,
            eventId: event.id,
            actor: event.actor,
            createdAt: event.createdAt,
            idempotencyKey: event.idempotencyKey,
          }),
        });

        const json = await response.json() as {
          success?: boolean;
          error?: string;
          session?: { snapshot: AgentContextSnapshot };
        };

        if (!response.ok || !json.success || !json.session) {
          throw new Error(json.error || 'Failed to save context event');
        }

        applySnapshot(json.session.snapshot);
        return true;
      } catch (error) {
        if (options.localFallback !== false) {
          setSnapshot((current) =>
            applyContextEvent(current, event as unknown as Parameters<typeof applyContextEvent>[1])
          );
        }

        const message = error instanceof Error ? error.message : 'Failed to save context event';
        setErrorMessage(message);
        clientLogger.error('Failed to append context event', error, {
          action: 'create_v3_append_context_event',
          eventType: type,
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [applySnapshot, sessionId, snapshot.schemaVersion]
  );

  const loadStepData = useCallback(async (targetSessionId: string) => {
    setIsStepDataLoading(true);
    try {
      const response = await fetch(getStepDataEndpoint(targetSessionId), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const payload = await response.json() as {
        success?: boolean;
        error?: string;
        stepData?: StepDataPayload;
      };

      if (!response.ok || !payload.success || !payload.stepData) {
        throw new Error(payload.error || 'Failed to load v3 step data');
      }

      setStepData(payload.stepData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load v3 step data';
      setErrorMessage(message);
      clientLogger.error('Failed to load v3 step data', error, {
        action: 'create_v3_step_data',
      });
    } finally {
      setIsStepDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!v3ClientEnabled) {
      router.replace('/grad-plan/createV2');
    }
  }, [router, v3ClientEnabled]);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      if (!v3ClientEnabled) return;

      setIsSessionLoading(true);
      setErrorMessage(null);

      const sessionStorageKey = buildSessionStorageKey(user.id);
      const conversationStorageKey = buildConversationStorageKey(user.id);
      const storedSessionId = localStorage.getItem(sessionStorageKey);
      let conversationId = localStorage.getItem(conversationStorageKey);

      if (!conversationId) {
        conversationId = createId('conv');
        localStorage.setItem(conversationStorageKey, conversationId);
      }

      const loadExistingSession = async () => {
        if (!storedSessionId) return false;

        const response = await fetch(getSessionEndpoint(storedSessionId), {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          return false;
        }

        const payload = await response.json() as {
          success?: boolean;
          session?: { id: string; snapshot: AgentContextSnapshot };
        };

        if (!payload.success || !payload.session) {
          return false;
        }

        if (!isMounted) return true;
        setSessionId(payload.session.id);
        applySnapshot(payload.session.snapshot);
        hydrateFromSnapshot(migrateAgentContextSnapshot(payload.session.snapshot));
        await loadStepData(payload.session.id);
        return true;
      };

      try {
        const existingLoaded = await loadExistingSession();
        if (existingLoaded) {
          setIsSessionLoading(false);
          return;
        }

        const response = await fetch('/api/grad-plan/v3/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ conversationId }),
        });

        const payload = await response.json() as {
          success?: boolean;
          error?: string;
          session?: { id: string; snapshot: AgentContextSnapshot };
        };

        if (!response.ok || !payload.success || !payload.session) {
          throw new Error(payload.error || 'Failed to initialize v3 session');
        }

        if (!isMounted) return;
        setSessionId(payload.session.id);
        localStorage.setItem(sessionStorageKey, payload.session.id);
        applySnapshot(payload.session.snapshot);
        hydrateFromSnapshot(migrateAgentContextSnapshot(payload.session.snapshot));
        await loadStepData(payload.session.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize session';
        setErrorMessage(message);
        clientLogger.error('Failed to initialize createV3 session', error, {
          action: 'create_v3_session_init',
        });
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      }
    };

    void initializeSession();

    return () => {
      isMounted = false;
    };
  }, [applySnapshot, hydrateFromSnapshot, loadStepData, user.id, v3ClientEnabled]);

  const fetchTraceSnapshot = useCallback(async () => {
    if (!sessionId || !v3DevtoolsEnabled) {
      return;
    }

    try {
      const response = await fetch(getTraceEndpoint(sessionId), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json() as {
        success?: boolean;
        traceEvents?: TraceEvent[];
      };

      if (!payload.success || !Array.isArray(payload.traceEvents)) {
        return;
      }

      setTraceEvents(uniqueTraceEvents(payload.traceEvents));
    } catch {
      clientLogger.warn('Unable to fetch v3 trace snapshot', {
        action: 'create_v3_trace_snapshot',
      });
    }
  }, [sessionId, v3DevtoolsEnabled]);

  useEffect(() => {
    void fetchTraceSnapshot();
  }, [fetchTraceSnapshot]);

  useEffect(() => {
    if (!sessionId || !v3DevtoolsEnabled) {
      if (traceEventSourceRef.current) {
        traceEventSourceRef.current.close();
        traceEventSourceRef.current = null;
      }
      return;
    }

    const eventSource = new EventSource(getTraceSseEndpoint(sessionId));
    traceEventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setGenerationConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (!event.data) return;
      try {
        const parsed = JSON.parse(event.data) as TraceEvent;
        setTraceEvents((current) => uniqueTraceEvents([...current, parsed]));
      } catch {
        // ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      setGenerationConnected(false);
    };

    return () => {
      eventSource.close();
      traceEventSourceRef.current = null;
    };
  }, [sessionId, v3DevtoolsEnabled]);

  const selectedPrograms = useMemo(() => {
    const catalogPrograms = stepData?.programs ?? [];
    return catalogPrograms.filter((program) => selectedProgramIds.includes(program.programId));
  }, [selectedProgramIds, stepData?.programs]);

  const transcriptCompletedCodes = useMemo(() => {
    if (!stepData) return [];
    if (transcriptChoice === 'without_transcript') return [];
    return stepData.completedCourseCodes;
  }, [stepData, transcriptChoice]);

  const availableRequiredCourses = useMemo(() => {
    if (!stepData || selectedPrograms.length === 0) {
      return stepData?.requiredCourseOptions ?? [];
    }

    const requirements = buildProgramRequirements(selectedPrograms, stepData.programRows);
    const completedSet = new Set(transcriptCompletedCodes.map((code) => code.toUpperCase()));

    return dedupeCourses(
      requirements
        .flatMap((program) => program.requirements)
        .flatMap((requirement) => requirement.selectedCourses)
        .filter((course) => !completedSet.has(course.courseCode.toUpperCase()))
    );
  }, [selectedPrograms, stepData, transcriptCompletedCodes]);

  const availableElectiveCourses = useMemo(() => {
    const base = stepData?.electiveCourseOptions ?? [];
    if (base.length > 0) return base;

    const requiredCodes = new Set(availableRequiredCourses.map((course) => course.courseCode));
    return (stepData?.requiredCourseOptions ?? [])
      .filter((course) => !requiredCodes.has(course.courseCode))
      .map((course) => ({
        ...course,
        source: 'elective' as const,
        requirementBucketKey: null,
      }))
      .slice(0, 200);
  }, [availableRequiredCourses, stepData]);

  const selectedRequiredCourses = useMemo(
    () => availableRequiredCourses.filter((course) => selectedRequiredCourseCodes.includes(course.courseCode)),
    [availableRequiredCourses, selectedRequiredCourseCodes]
  );

  const selectedElectiveCourses = useMemo(
    () => availableElectiveCourses.filter((course) => selectedElectiveCourseCodes.includes(course.courseCode)),
    [availableElectiveCourses, selectedElectiveCourseCodes]
  );

  const applyJobEvent = useCallback((event: V3GenerationJobEvent) => {
    if (!sessionId) return;

    const phase = event.phase;

    if (event.eventType === 'phase_started' || event.eventType === 'phase_completed' || event.eventType === 'job_progress' || event.eventType === 'job_started' || event.eventType === 'job_resumed') {
      setSnapshot((current) =>
        applyContextEvent(
          current,
          buildSyntheticContextEvent({
            sessionId,
            type: 'generation_phase_updated',
            payload: {
              phase: phase ?? current.generation.phase ?? 'queued',
              status: 'running',
              progressPercent: typeof event.progressPercent === 'number'
                ? event.progressPercent
                : mapPhaseToProgress(phase ?? current.generation.phase, current.generation.progressPercent),
              message: event.message,
              jobId: event.jobId,
            },
          })
        )
      );

      if (event.message) {
        appendLocalMiniChatMessage({
          id: createId('chat'),
          role: 'system',
          message: event.message,
          ts: event.ts,
        });
      }

      return;
    }

    if (event.eventType === 'command_applied') {
      const commandType = typeof event.payloadJson?.commandType === 'string'
        ? event.payloadJson.commandType as V3GenerationCommandType
        : null;
      const outcome = event.payloadJson?.outcome === 'rejected' ? 'rejected' : 'applied';

      setSnapshot((current) => {
        let next = applyContextEvent(
          current,
          buildSyntheticContextEvent({
            sessionId,
            type: 'generation_command_applied',
            payload: {
              commandId: typeof event.payloadJson?.commandId === 'string' ? event.payloadJson.commandId : createId('cmd'),
              commandType: commandType ?? 'reply',
              outcome,
              message: event.message,
              jobId: event.jobId,
              payload: event.payloadJson,
            },
            actor: 'system',
          })
        );

        if (commandType === 'reply') {
          const pendingReply = [...next.miniChat.messages]
            .reverse()
            .find((message) => message.commandType === 'reply' && message.status === 'pending');
          if (pendingReply) {
            next = applyContextEvent(
              next,
              buildSyntheticContextEvent({
                sessionId,
                type: 'mini_chat_message_added',
                payload: {
                  messageId: pendingReply.id,
                  role: pendingReply.role,
                  message: pendingReply.message,
                  commandType: 'reply',
                  status: outcome === 'applied' ? 'applied' : 'failed',
                },
                actor: 'system',
              })
            );
          }
        }

        return next;
      });
      return;
    }

    if (event.eventType === 'job_failed') {
      const errorCode = typeof event.payloadJson?.errorCode === 'string'
        ? event.payloadJson.errorCode
        : 'generation_failed';

      setSnapshot((current) =>
        applyContextEvent(
          current,
          buildSyntheticContextEvent({
            sessionId,
            type: 'generation_failed',
            payload: {
              errorMessage: event.message ?? 'Generation failed',
              errorCode,
              phase: phase ?? 'failed',
              jobId: event.jobId,
              details: event.payloadJson,
            },
          })
        )
      );

      appendLocalMiniChatMessage({
        id: createId('chat'),
        role: 'system',
        message: event.message ?? 'Generation failed.',
        ts: event.ts,
      });
      return;
    }

    if (event.eventType === 'job_canceled') {
      setSnapshot((current) =>
        applyContextEvent(
          current,
          buildSyntheticContextEvent({
            sessionId,
            type: 'generation_canceled',
            payload: {
              message: event.message ?? 'Generation canceled',
              phase: 'canceled',
              jobId: event.jobId,
            },
          })
        )
      );

      appendLocalMiniChatMessage({
        id: createId('chat'),
        role: 'system',
        message: event.message ?? 'Generation canceled.',
        ts: event.ts,
      });
      return;
    }

    if (event.eventType === 'job_completed') {
      const accessId = typeof event.payloadJson?.accessId === 'string'
        ? event.payloadJson.accessId
        : null;

      if (accessId) {
        setSnapshot((current) =>
          applyContextEvent(
            current,
            buildSyntheticContextEvent({
              sessionId,
              type: 'generation_completed',
              payload: {
                outputAccessId: accessId,
                jobId: event.jobId,
                message: event.message ?? 'Generation completed',
              },
            })
          )
        );
      }

      appendLocalMiniChatMessage({
        id: createId('chat'),
        role: 'agent',
        message: event.message ?? 'Generation completed.',
        ts: event.ts,
      });
    }
  }, [appendLocalMiniChatMessage, sessionId]);

  const closeJobEventSource = useCallback(() => {
    if (jobEventSourceRef.current) {
      jobEventSourceRef.current.close();
      jobEventSourceRef.current = null;
    }
  }, []);

  const connectJobEventStream = useCallback((targetSessionId: string, jobId: string) => {
    closeJobEventSource();

    const eventSource = new EventSource(getJobEventsEndpoint(targetSessionId, jobId, lastJobEventIdRef.current));
    jobEventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setGenerationConnected(true);
    };

    eventSource.onmessage = (event) => {
      if (!event.data) return;
      if (event.lastEventId) {
        const parsedLastEventId = Number.parseInt(event.lastEventId, 10);
        if (Number.isFinite(parsedLastEventId) && parsedLastEventId > 0) {
          lastJobEventIdRef.current = parsedLastEventId;
        }
      }

      try {
        const parsed = JSON.parse(event.data) as V3GenerationJobEvent;
        lastJobEventIdRef.current = Math.max(lastJobEventIdRef.current, parsed.id ?? 0);
        applyJobEvent(parsed);
      } catch {
        // ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      setGenerationConnected(false);
      eventSource.close();
      jobEventSourceRef.current = null;

      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current <= 10) {
        const timeout = Math.min(5000, reconnectAttemptsRef.current * 500);
        window.setTimeout(() => {
          connectJobEventStream(targetSessionId, jobId);
        }, timeout);
      }
    };
  }, [applyJobEvent, closeJobEventSource]);

  const startJobIfRecoverable = useCallback(async (targetSessionId: string, candidateJobId: string) => {
    if (!candidateJobId) return;

    try {
      const response = await fetch(getJobSnapshotEndpoint(targetSessionId, candidateJobId), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json() as {
        success?: boolean;
        job?: {
          id: string;
          status: V3GenerationJobStatus;
          phase: V3GenerationPhase;
          progressPercent: number;
          outputAccessId: string | null;
        };
      };

      if (!payload.success || !payload.job) {
        return;
      }

      const job = payload.job;
      activeJobIdRef.current = job.id;
      setActiveJobId(job.id);
      const accessId = job.outputAccessId;

      if (accessId && job.status === 'completed') {
        setSnapshot((current) =>
          applyContextEvent(
            current,
            buildSyntheticContextEvent({
              sessionId: targetSessionId,
              type: 'generation_completed',
              payload: {
                outputAccessId: accessId,
                jobId: job.id,
              },
            })
          )
        );
        return;
      }

      if (job.status === 'queued' || job.status === 'in_progress' || job.status === 'pause_requested' || job.status === 'cancel_requested' || job.status === 'paused') {
        setSnapshot((current) =>
          applyContextEvent(
            current,
            buildSyntheticContextEvent({
              sessionId: targetSessionId,
              type: 'generation_phase_updated',
              payload: {
                phase: job.phase,
                status: job.status === 'paused'
                  ? 'paused'
                  : job.status === 'pause_requested'
                  ? 'pause_requested'
                  : job.status === 'cancel_requested'
                  ? 'cancel_requested'
                  : job.status === 'queued'
                  ? 'queued'
                  : 'running',
                progressPercent: job.progressPercent,
                message: `Generation ${job.status}`,
                jobId: job.id,
              },
            })
          )
        );

        connectJobEventStream(targetSessionId, job.id);
      }
    } catch (error) {
      clientLogger.warn('Failed to recover active v3 generation job', {
        action: 'create_v3_recover_job',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [connectJobEventStream]);

  useEffect(() => {
    if (!sessionId || !v3LiveJobsEnabled) return;

    const storageKey = buildJobStorageKey(user.id, sessionId);
    const storedJobId = localStorage.getItem(storageKey);
    const candidate = storedJobId || snapshot.generation.jobId;

    if (candidate) {
      void startJobIfRecoverable(sessionId, candidate);
    }
  }, [sessionId, snapshot.generation.jobId, startJobIfRecoverable, user.id, v3LiveJobsEnabled]);

  useEffect(() => {
    return () => {
      closeJobEventSource();
      if (traceEventSourceRef.current) {
        traceEventSourceRef.current.close();
      }
    };
  }, [closeJobEventSource]);

  useEffect(() => {
    if (snapshot.generation.status === 'completed' && snapshot.generation.outputAccessId) {
      router.push(`/grad-plan/${snapshot.generation.outputAccessId}`);
    }
  }, [router, snapshot.generation.outputAccessId, snapshot.generation.status]);

  const handleConfirmProfile = useCallback(async () => {
    const estimatedGraduationYear = typeof studentProfile.est_grad_date === 'string'
      ? new Date(studentProfile.est_grad_date).getUTCFullYear()
      : null;

    const profile = {
      confirmed: true,
      studentType: resolveStudentType(studentProfile.student_type),
      admissionYear: typeof studentProfile.admission_year === 'number' ? studentProfile.admission_year : null,
      estimatedGraduationTerm: typeof studentProfile.est_grad_sem === 'string' ? studentProfile.est_grad_sem : null,
      estimatedGraduationYear:
        typeof estimatedGraduationYear === 'number' && Number.isFinite(estimatedGraduationYear)
          ? estimatedGraduationYear
          : null,
    } as AgentContextSnapshot['profile'];

    const saved = await appendContextEvent('profile_confirmed', profile, 'user', {
      idempotencyKey: 'profile-confirmed',
    });

    if (saved) {
      setActiveStep(2);
    }
  }, [appendContextEvent, studentProfile]);

  const handleSubmitTranscriptChoice = useCallback(async () => {
    if (!transcriptChoice) {
      return;
    }

    const completedCourseCodes = transcriptChoice === 'without_transcript'
      ? []
      : transcriptCompletedCodes;

    const saved = await appendContextEvent('transcript_choice_set', {
      choice: transcriptChoice,
      transcriptRecordId: transcriptChoice === 'without_transcript' ? null : 'transcript-v3-active',
      completedCourseCodes,
      lastEvaluatedAt: new Date().toISOString(),
    });

    if (saved) {
      setActiveStep(3);
    }
  }, [appendContextEvent, transcriptChoice, transcriptCompletedCodes]);

  const handleSubmitPrograms = useCallback(async () => {
    if (!stepData) return;

    const selectedProgramsPayload = stepData.programs.filter((program) =>
      selectedProgramIds.includes(program.programId)
    );

    const saved = await appendContextEvent('programs_selected', {
      selectedPrograms: selectedProgramsPayload,
    });

    if (saved) {
      setActiveStep(4);
    }
  }, [appendContextEvent, selectedProgramIds, stepData]);

  const handleSubmitCourseSelection = useCallback(async () => {
    if (!stepData) return;

    const selectedProgramsPayload = stepData.programs.filter((program) =>
      selectedProgramIds.includes(program.programId)
    );

    const programRequirements = buildProgramRequirements(selectedProgramsPayload, stepData.programRows);
    const requirementBuckets = buildRequirementBuckets({
      programRequirements,
      completedCourseCodes: transcriptCompletedCodes,
    });

    const requestedElectives = availableElectiveCourses.filter((course) =>
      selectedElectiveCourseCodes.includes(course.courseCode)
    );

    const candidateSelection = buildCandidateCourseSelection({
      programRequirements,
      completedCourseCodes: transcriptCompletedCodes,
      requestedElectives,
    });

    const selectedCourses = availableRequiredCourses.filter((course) =>
      selectedRequiredCourseCodes.includes(course.courseCode)
    );

    const mergedSelectedCourses = dedupeCourses([
      ...selectedCourses,
      ...candidateSelection.selectedCourses,
    ]);

    const saved = await appendContextEvent('course_selection_submitted', {
      selectedCourses: mergedSelectedCourses,
      requestedElectives: candidateSelection.requestedElectives,
      requirementBuckets,
      remainingRequirementCredits: requirementBuckets.reduce((sum, bucket) => sum + bucket.remainingCredits, 0),
      requestedElectiveCredits: candidateSelection.requestedElectiveCredits,
      totalCreditsToComplete:
        requirementBuckets.reduce((sum, bucket) => sum + bucket.remainingCredits, 0) +
        candidateSelection.requestedElectiveCredits,
      totalSelectedCredits: mergedSelectedCourses.reduce((sum, course) => sum + course.credits, 0) +
        candidateSelection.requestedElectiveCredits,
    });

    if (saved) {
      setActiveStep(5);
    }
  }, [
    appendContextEvent,
    availableElectiveCourses,
    availableRequiredCourses,
    selectedElectiveCourseCodes,
    selectedProgramIds,
    selectedRequiredCourseCodes,
    stepData,
    transcriptCompletedCodes,
  ]);

  const handleSubmitDistribution = useCallback(async () => {
    if (!distributionStrategy) {
      return;
    }

    const preset = DISTRIBUTION_PRESETS[distributionStrategy];
    const saved = await appendContextEvent('distribution_selected', {
      strategy: distributionStrategy,
      minCreditsPerTerm: preset.min,
      maxCreditsPerTerm: preset.max,
      targetCreditsPerTerm: preset.target,
      includeSecondaryTerms: preset.includeSecondaryTerms,
    });

    if (saved) {
      setActiveStep(6);
    }
  }, [appendContextEvent, distributionStrategy]);

  const handleSubmitConstraints = useCallback(async () => {
    const milestones: AgentContextSnapshot['constraints']['milestones'] = includeInternshipMilestone
      ? [
        {
          id: 'internship',
          label: 'Internship target',
          timing: 'specific_term',
          term: 'Summer',
          year: new Date().getUTCFullYear() + 1,
        },
      ]
      : [];

    const saved = await appendContextEvent('constraints_selected', {
      workStatus,
      milestones,
      notes: constraintNotes || null,
    });

    if (saved) {
      setActiveStep(7);
    }
  }, [appendContextEvent, constraintNotes, includeInternshipMilestone, workStatus]);

  const handleSendCommand = useCallback(async (commandType: 'pause' | 'resume' | 'cancel' | 'retry') => {
    if (!sessionId || !activeJobId) return;

    setSnapshot((current) =>
      applyContextEvent(
        current,
        buildSyntheticContextEvent({
          sessionId,
          type: 'generation_command_requested',
          payload: {
            commandId: createId('cmd-local'),
            commandType,
            jobId: activeJobId,
            payload: null,
          },
          actor: 'user',
        })
      )
    );

    try {
      const response = await fetch(getJobCommandsEndpoint(sessionId, activeJobId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          commandType,
          payload: null,
          idempotencyKey: createId(`cmd-${commandType}`),
        }),
      });

      const payload = await response.json() as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit command');
      }

      if (commandType === 'resume' || commandType === 'retry') {
        connectJobEventStream(sessionId, activeJobId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit command');
    }
  }, [activeJobId, connectJobEventStream, sessionId]);

  const handleSubmitReply = useCallback(async (message: string) => {
    if (!sessionId || !activeJobId) return;

    const pendingMessageId = createId('chat-reply');
    appendLocalMiniChatMessage({
      id: pendingMessageId,
      role: 'user',
      message,
      ts: new Date().toISOString(),
      commandType: 'reply',
      status: 'pending',
    });

    setSnapshot((current) =>
      applyContextEvent(
        current,
        buildSyntheticContextEvent({
          sessionId,
          type: 'generation_command_requested',
          payload: {
            commandId: createId('cmd-local-reply'),
            commandType: 'reply',
            jobId: activeJobId,
            payload: { message },
          },
          actor: 'user',
        })
      )
    );

    try {
      const response = await fetch(getJobCommandsEndpoint(sessionId, activeJobId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          commandType: 'reply',
          payload: { message },
          idempotencyKey: pendingMessageId,
        }),
      });

      const payload = await response.json() as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit reply');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit reply');
      setSnapshot((current) =>
        applyContextEvent(
          current,
          buildSyntheticContextEvent({
            sessionId,
            type: 'mini_chat_message_added',
            payload: {
              messageId: pendingMessageId,
              role: 'system',
              message: 'Reply submission failed. Try again.',
              commandType: 'reply',
              status: 'failed',
            },
            actor: 'system',
          })
        )
      );
    }
  }, [activeJobId, appendLocalMiniChatMessage, sessionId]);

  const handleStartGeneration = useCallback(async () => {
    if (!generationMode || !sessionId) {
      return;
    }

    const selected = await appendContextEvent('generation_mode_selected', {
      style: generationMode,
    });

    if (!selected) {
      return;
    }

    if (generationMode === 'active_feedback') {
      setErrorMessage('Active feedback is coming soon for createV3. Please use automatic generation for now.');
      return;
    }

    if (!v3LiveJobsEnabled) {
      setErrorMessage('Automatic generation is disabled for createV3 in this environment.');
      return;
    }

    try {
      const response = await fetch(getJobCreateEndpoint(sessionId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json() as {
        success?: boolean;
        error?: string;
        jobId?: string;
      };

      if (!response.ok || !payload.success || !payload.jobId) {
        throw new Error(payload.error || 'Failed to start generation');
      }

      const jobId = payload.jobId;
      activeJobIdRef.current = jobId;
      setActiveJobId(jobId);

      localStorage.setItem(buildJobStorageKey(user.id, sessionId), jobId);
      lastJobEventIdRef.current = 0;

      setSnapshot((current) =>
        applyContextEvent(
          current,
          buildSyntheticContextEvent({
            sessionId,
            type: 'generation_phase_updated',
            payload: {
              phase: 'queued',
              status: 'queued',
              progressPercent: 0,
              message: 'Generation job queued',
              jobId,
            },
          })
        )
      );

      connectJobEventStream(sessionId, jobId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start generation');
      clientLogger.error('Failed to start v3 generation job', error, {
        action: 'create_v3_start_generation',
      });
    }
  }, [appendContextEvent, connectJobEventStream, generationMode, sessionId, user.id, v3LiveJobsEnabled]);

  const stepNotice = useMemo(() => {
    if (errorMessage) {
      return {
        tone: 'error' as const,
        title: 'Something needs attention',
        message: errorMessage,
      };
    }

    if (isSaving) {
      return {
        tone: 'info' as const,
        title: 'Saving',
        message: 'Persisting your decision to the server event ledger.',
      };
    }

    if (isStepDataLoading) {
      return {
        tone: 'info' as const,
        title: 'Loading',
        message: 'Fetching live program, transcript, and course option data.',
      };
    }

    return undefined;
  }, [errorMessage, isSaving, isStepDataLoading]);

  const contextSections = useMemo(() => {
    return [
      {
        id: 'profile',
        title: 'Profile',
        status: snapshot.profile.confirmed ? 'complete' as const : 'missing' as const,
        summary: snapshot.profile.confirmed
          ? `${snapshot.profile.studentType ?? 'student'} · class of ${snapshot.profile.estimatedGraduationYear ?? 'TBD'}`
          : 'Needs confirmation',
        onEdit: () => setActiveStep(1),
      },
      {
        id: 'transcript',
        title: 'Transcript',
        status: snapshot.transcript.choice ? 'complete' as const : 'missing' as const,
        summary: snapshot.transcript.choice
          ? `Choice: ${snapshot.transcript.choice} · completed: ${snapshot.transcript.completedCourseCodes.length}`
          : 'Upload new, use current, or continue without transcript',
        onEdit: () => setActiveStep(2),
      },
      {
        id: 'programs',
        title: 'Programs',
        status: snapshot.programs.selected.length > 0 ? 'complete' as const : 'in_progress' as const,
        summary: snapshot.programs.selected.length > 0
          ? snapshot.programs.selected.map((program) => program.programName).join(', ')
          : 'Select at least one program',
        onEdit: () => setActiveStep(3),
      },
      {
        id: 'courses',
        title: 'Course Plan Scope',
        status: snapshot.courses.totalCreditsToComplete > 0 ? 'complete' as const : 'in_progress' as const,
        summary: `${snapshot.courses.totalCreditsToComplete} credits remaining to complete`,
        onEdit: () => setActiveStep(4),
      },
      {
        id: 'distribution',
        title: 'Credit Distribution',
        status: snapshot.distribution.strategy ? 'complete' as const : 'missing' as const,
        summary: snapshot.distribution.strategy
          ? `${snapshot.distribution.strategy} · ${snapshot.distribution.minCreditsPerTerm ?? '-'}-${snapshot.distribution.maxCreditsPerTerm ?? '-'} credits`
          : 'Choose term envelope strategy',
        onEdit: () => setActiveStep(5),
      },
      {
        id: 'constraints',
        title: 'Constraints',
        status: snapshot.constraints.workStatus ? 'complete' as const : 'missing' as const,
        summary: snapshot.constraints.workStatus
          ? `${snapshot.constraints.workStatus.replace('_', ' ')}${snapshot.constraints.milestones.length ? ' · milestone set' : ''}`
          : 'Workload and milestone constraints missing',
        onEdit: () => setActiveStep(6),
      },
      {
        id: 'generation',
        title: 'Generation',
        status: snapshot.generation.style ? 'in_progress' as const : 'missing' as const,
        summary: snapshot.generation.style
          ? `${snapshot.generation.style} · ${snapshot.generation.status}`
          : 'Choose automatic generation',
        onEdit: () => setActiveStep(7),
      },
    ];
  }, [snapshot]);

  const renderStepContent = () => {
    if (activeStep === 1) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">
            Confirm your profile details so the agent can reason with a stable baseline.
          </p>
          <div className="rounded-xl border bg-zinc-50 p-3 text-sm text-zinc-700">
            <p><span className="font-semibold">Student Type:</span> {resolveStudentType(studentProfile.student_type)}</p>
            <p><span className="font-semibold">Admission Year:</span> {typeof studentProfile.admission_year === 'number' ? studentProfile.admission_year : 'Unknown'}</p>
            <p><span className="font-semibold">Estimated Graduation:</span> {typeof studentProfile.est_grad_sem === 'string' ? studentProfile.est_grad_sem : 'TBD'}</p>
          </div>
        </div>
      );
    }

    if (activeStep === 2) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">Choose how transcript data should be used.</p>
          <div className="grid gap-2 md:grid-cols-3">
            {[
              { value: 'upload_new' as const, label: 'Upload Transcript' },
              { value: 'use_current' as const, label: 'Use Current Transcript' },
              { value: 'without_transcript' as const, label: 'Continue Without Transcript' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${transcriptChoice === option.value
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                onClick={() => setTranscriptChoice(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Completed transcript courses available: {stepData?.completedCourseCodes.length ?? 0}
          </p>
        </div>
      );
    }

    if (activeStep === 3) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">Select the programs to include in your graduation plan.</p>
          <div className="grid gap-2 md:grid-cols-2">
            {(stepData?.programs ?? []).map((program) => {
              const selected = selectedProgramIds.includes(program.programId);
              return (
                <button
                  key={program.programId}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${selected
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  onClick={() => {
                    setSelectedProgramIds((current) => {
                      if (current.includes(program.programId)) {
                        return current.filter((id) => id !== program.programId);
                      }
                      return [...current, program.programId];
                    });
                  }}
                >
                  <p className="font-semibold text-zinc-900">{program.programName}</p>
                  <p className="text-xs text-zinc-600">{program.programType}</p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeStep === 4) {
      return (
        <div className="space-y-4">
          <InlineValidationNotice
            tone="info"
            title="Remaining-credit basis"
            message="Total credits to complete uses remaining requirement credits plus requested elective credits."
          />
          <p className="text-xs text-zinc-500">
            Transcript-completed courses are excluded from required selection lists.
          </p>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-900">Requirements to prioritize</p>
            <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
              {availableRequiredCourses.map((course) => {
                const selected = selectedRequiredCourseCodes.includes(course.courseCode);
                return (
                  <button
                    key={course.courseCode}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${selected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    onClick={() => {
                      setSelectedRequiredCourseCodes((current) => {
                        if (current.includes(course.courseCode)) {
                          return current.filter((code) => code !== course.courseCode);
                        }
                        return [...current, course.courseCode];
                      });
                    }}
                  >
                    <p className="font-semibold text-zinc-900">{course.courseCode}</p>
                    <p className="text-xs text-zinc-600">{course.courseTitle} · {course.credits} cr</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-900">Requested electives</p>
            <div className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2">
              {availableElectiveCourses.map((course) => {
                const selected = selectedElectiveCourseCodes.includes(course.courseCode);
                return (
                  <button
                    key={course.courseCode}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${selected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    onClick={() => {
                      setSelectedElectiveCourseCodes((current) => {
                        if (current.includes(course.courseCode)) {
                          return current.filter((code) => code !== course.courseCode);
                        }
                        return [...current, course.courseCode];
                      });
                    }}
                  >
                    <p className="font-semibold text-zinc-900">{course.courseCode}</p>
                    <p className="text-xs text-zinc-600">{course.courseTitle} · {course.credits} cr</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === 5) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">
            Choose your term credit envelope using remaining credits to complete.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {(Object.keys(DISTRIBUTION_PRESETS) as Array<keyof typeof DISTRIBUTION_PRESETS>).map((key) => {
              const preset = DISTRIBUTION_PRESETS[key];
              const selected = distributionStrategy === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`rounded-xl border px-3 py-2 text-left transition ${selected
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  onClick={() => setDistributionStrategy(key)}
                >
                  <p className="text-sm font-semibold capitalize text-zinc-900">{key.replace('_', ' ')}</p>
                  <p className="text-xs text-zinc-600">{preset.min}-{preset.max} credits</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            Remaining credits in context: <span className="font-semibold text-zinc-800">{snapshot.courses.totalCreditsToComplete}</span>
          </p>
        </div>
      );
    }

    if (activeStep === 6) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-zinc-700">Set workload constraints and milestone preferences.</p>
          <div className="flex flex-wrap gap-2">
            {(['not_working', 'part_time', 'full_time', 'variable'] as WorkStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs transition ${workStatus === status
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                onClick={() => setWorkStatus(status)}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={includeInternshipMilestone}
              onChange={(event) => setIncludeInternshipMilestone(event.target.checked)}
            />
            Include internship milestone
          </label>
          <textarea
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={constraintNotes}
            onChange={(event) => setConstraintNotes(event.target.value)}
            placeholder="Add optional notes for term constraints"
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <GenerationModeCard
          value={generationMode}
          onChange={setGenerationMode}
          disabled={isSaving}
          activeFeedbackEnabled={false}
        />
        <p className="text-xs text-zinc-500">
          Automatic runs full durable 7a-7f progression with real backend phase updates. Active feedback is coming soon.
        </p>
      </div>
    );
  };

  const currentStepTitle = STEP_TITLES[activeStep - 1] ?? STEP_TITLES[0];

  const primaryAction = () => {
    if (activeStep === 1) return handleConfirmProfile();
    if (activeStep === 2) return handleSubmitTranscriptChoice();
    if (activeStep === 3) return handleSubmitPrograms();
    if (activeStep === 4) return handleSubmitCourseSelection();
    if (activeStep === 5) return handleSubmitDistribution();
    if (activeStep === 6) return handleSubmitConstraints();
    return handleStartGeneration();
  };

  const primaryDisabled =
    isSessionLoading ||
    isSaving ||
    isStepDataLoading ||
    (activeStep === 2 && !transcriptChoice) ||
    (activeStep === 3 && selectedProgramIds.length === 0) ||
    (activeStep === 5 && !distributionStrategy) ||
    (activeStep === 7 && !generationMode);

  const stepDescriptionByStep: Record<number, string> = {
    1: 'Confirm profile details before agent planning begins.',
    2: 'Choose transcript mode: upload, use current, or continue without transcript.',
    3: 'Select degree programs to include in plan generation.',
    4: 'Pick requirement and elective course targets based on remaining requirements.',
    5: 'Choose your credit distribution strategy using remaining credits.',
    6: 'Set milestone and workload constraints for scheduling heuristics.',
    7: 'Pick generation mode for the durable workflow.',
  };

  return (
    <CreateV3Shell
      title="Grad Plan Create V3"
      subtitle="Guided cards, canonical context, durable generation jobs, and transparent agent controls."
      progressCard={
        <GenerationProgressCard
          phase={snapshot.generation.phase ?? 'queued'}
          percent={snapshot.generation.progressPercent}
          connected={generationConnected}
          message={snapshot.generation.message ?? 'Awaiting generation start'}
        />
      }
      main={
        <GuidedStepCard
          stepNumber={activeStep}
          totalSteps={7}
          title={currentStepTitle}
          description={stepDescriptionByStep[activeStep] ?? stepDescriptionByStep[1]}
          notice={stepNotice}
          primaryAction={{
            label: activeStep === 7 ? 'Start Generation' : 'Continue',
            onClick: () => {
              void primaryAction();
            },
            disabled: primaryDisabled,
            loading: isSaving,
          }}
          secondaryAction={activeStep > 1 ? {
            label: 'Back',
            onClick: () => setActiveStep((current) => Math.max(1, current - 1)),
            disabled: isSaving,
          } : undefined}
          helperText="All decisions are persisted to a server event ledger and projected into one canonical snapshot."
        >
          {isSessionLoading ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500">
              Initializing v3 session...
            </div>
          ) : (
            renderStepContent()
          )}
        </GuidedStepCard>
      }
      contextRail={<ContextRail sections={contextSections} />}
      miniChatPanel={v3MiniChatEnabled ? (
        <MiniChatPanel
          messages={snapshot.miniChat.messages}
          pendingCommand={snapshot.miniChat.pendingCommand}
          jobStatus={mapGenerationStatusToJobStatus(snapshot.generation.status)}
          disabled={!activeJobId || !v3LiveJobsEnabled}
          onCommand={(command) => {
            void handleSendCommand(command);
          }}
          onSubmitReply={(message) => {
            void handleSubmitReply(message);
          }}
        />
      ) : undefined}
      tracePanel={v3DevtoolsEnabled ? (
        <AgentTracePanel
          events={traceEvents}
          levelFilter={traceLevelFilter}
          onLevelFilterChange={setTraceLevelFilter}
        />
      ) : undefined}
    />
  );
}
