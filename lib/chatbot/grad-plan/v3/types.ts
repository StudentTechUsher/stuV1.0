export const AGENT_CONTEXT_SCHEMA_VERSION = 1;

export type TranscriptChoice = 'upload_new' | 'use_current' | 'without_transcript';

export type GenerationMode = 'automatic' | 'active_feedback';

export type GenerationStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'pause_requested'
  | 'paused'
  | 'cancel_requested'
  | 'completed'
  | 'failed'
  | 'canceled';

export type V3GenerationPhase =
  | 'queued'
  | 'preparing'
  | 'major_skeleton'
  | 'major_fill'
  | 'minor_fill'
  | 'gen_ed_fill'
  | 'elective_fill'
  | 'verify_heuristics'
  | 'persisting'
  | 'completed'
  | 'failed'
  | 'canceled';

export type ProgramType = 'major' | 'minor' | 'honors' | 'graduate' | 'general_education';

export type WorkStatus = 'not_working' | 'part_time' | 'full_time' | 'variable';

export type DistributionStrategyType = 'fast_track' | 'balanced' | 'explore';

export type V3GenerationCommandType = 'pause' | 'resume' | 'cancel' | 'retry' | 'reply';

export type V3GenerationCommandStatus = 'pending' | 'applied' | 'rejected';

export interface MiniChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  message: string;
  ts: string;
  commandType?: V3GenerationCommandType | null;
  status?: 'pending' | 'applied' | 'failed';
}

export interface ProgramDescriptor {
  programId: number;
  programName: string;
  programType: ProgramType;
}

export interface SelectedCourseItem {
  courseCode: string;
  courseTitle: string;
  credits: number;
  source: 'major' | 'minor' | 'gen_ed' | 'elective';
  requirementBucketKey?: string | null;
}

export interface RequirementBucket {
  bucketKey: string;
  bucketLabel: string;
  requirementType: 'major' | 'minor' | 'gen_ed' | 'elective';
  requiredCredits: number;
  completedCredits: number;
  remainingCredits: number;
  candidateCourseCodes: string[];
}

export interface MilestoneConstraint {
  id: string;
  label: string;
  timing: 'beginning' | 'middle' | 'before_last_year' | 'after_graduation' | 'specific_term';
  term?: string | null;
  year?: number | null;
}

export interface AgentContextSnapshot {
  schemaVersion: number;
  profile: {
    confirmed: boolean;
    studentType: 'undergraduate' | 'honor' | 'graduate' | null;
    admissionYear: number | null;
    estimatedGraduationTerm: string | null;
    estimatedGraduationYear: number | null;
  };
  transcript: {
    choice: TranscriptChoice | null;
    hasTranscript: boolean;
    transcriptRecordId: string | null;
    completedCourseCodes: string[];
    lastEvaluatedAt: string | null;
  };
  programs: {
    selected: ProgramDescriptor[];
  };
  courses: {
    selectedCourses: SelectedCourseItem[];
    requestedElectives: SelectedCourseItem[];
    requirementBuckets: RequirementBucket[];
    remainingRequirementCredits: number;
    requestedElectiveCredits: number;
    totalCreditsToComplete: number;
    totalSelectedCredits: number;
  };
  distribution: {
    strategy: DistributionStrategyType | null;
    minCreditsPerTerm: number | null;
    maxCreditsPerTerm: number | null;
    targetCreditsPerTerm: number | null;
    includeSecondaryTerms: boolean;
  };
  constraints: {
    workStatus: WorkStatus | null;
    milestones: MilestoneConstraint[];
    notes: string | null;
  };
  generation: {
    style: GenerationMode | null;
    status: GenerationStatus;
    phase: V3GenerationPhase | null;
    progressPercent: number;
    message: string | null;
    jobId: string | null;
    outputAccessId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    repairLoopCount: number;
    lastEventAt: string | null;
  };
  meta: {
    sessionId: string | null;
    conversationId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  miniChat: {
    messages: MiniChatMessage[];
    pendingCommand: V3GenerationCommandType | null;
  };
}

export type ContextEventType =
  | 'profile_confirmed'
  | 'transcript_choice_set'
  | 'programs_selected'
  | 'course_selection_submitted'
  | 'distribution_selected'
  | 'constraints_selected'
  | 'mini_chat_message_added'
  | 'generation_command_requested'
  | 'generation_command_applied'
  | 'generation_mode_selected'
  | 'generation_phase_updated'
  | 'generation_completed'
  | 'generation_failed'
  | 'generation_canceled';

export interface ContextEventPayloadMap {
  profile_confirmed: AgentContextSnapshot['profile'];
  transcript_choice_set: {
    choice: TranscriptChoice;
    transcriptRecordId?: string | null;
    completedCourseCodes?: string[];
    lastEvaluatedAt?: string | null;
  };
  programs_selected: {
    selectedPrograms: ProgramDescriptor[];
  };
  course_selection_submitted: {
    selectedCourses: SelectedCourseItem[];
    requestedElectives: SelectedCourseItem[];
    requirementBuckets: RequirementBucket[];
    remainingRequirementCredits: number;
    requestedElectiveCredits: number;
    totalCreditsToComplete: number;
    totalSelectedCredits: number;
  };
  distribution_selected: AgentContextSnapshot['distribution'];
  constraints_selected: AgentContextSnapshot['constraints'];
  mini_chat_message_added: {
    messageId: string;
    role: MiniChatMessage['role'];
    message: string;
    commandType?: V3GenerationCommandType | null;
    status?: MiniChatMessage['status'];
  };
  generation_command_requested: {
    commandId: string;
    commandType: V3GenerationCommandType;
    jobId?: string | null;
    payload?: Record<string, unknown> | null;
  };
  generation_command_applied: {
    commandId: string;
    commandType: V3GenerationCommandType;
    jobId?: string | null;
    outcome: 'applied' | 'rejected';
    message?: string | null;
    payload?: Record<string, unknown> | null;
  };
  generation_mode_selected: {
    style: GenerationMode;
  };
  generation_phase_updated: {
    status?: GenerationStatus;
    phase: V3GenerationPhase;
    progressPercent?: number;
    message?: string | null;
    jobId?: string | null;
    repairLoopCount?: number;
    details?: Record<string, unknown> | null;
  };
  generation_completed: {
    outputAccessId: string;
    jobId?: string | null;
    message?: string | null;
  };
  generation_failed: {
    errorMessage: string;
    errorCode?: string | null;
    phase?: V3GenerationPhase | null;
    jobId?: string | null;
    details?: Record<string, unknown> | null;
  };
  generation_canceled: {
    message?: string | null;
    phase?: V3GenerationPhase | null;
    jobId?: string | null;
  };
}

export interface ContextEvent<TType extends ContextEventType = ContextEventType> {
  id: string;
  sessionId: string;
  schemaVersion: number;
  type: TType;
  payload: ContextEventPayloadMap[TType];
  actor: 'user' | 'agent' | 'system';
  createdAt: string;
  idempotencyKey?: string | null;
}

export interface StoredContextEvent<TType extends ContextEventType = ContextEventType>
  extends ContextEvent<TType> {
  sequenceId: number;
}

export type ContextEventUnion = {
  [TType in ContextEventType]: ContextEvent<TType>;
}[ContextEventType];

export type StoredContextEventUnion = {
  [TType in ContextEventType]: StoredContextEvent<TType>;
}[ContextEventType];

export type TraceEventLevel = 'debug' | 'info' | 'warn' | 'error';

export type TraceEventScope =
  | 'ui_action'
  | 'context_event'
  | 'phase'
  | 'skill'
  | 'model'
  | 'validation'
  | 'repair'
  | 'system';

export interface TraceEvent {
  id: string;
  sessionId: string;
  sequenceId?: number;
  ts: string;
  level: TraceEventLevel;
  scope: TraceEventScope;
  phase: V3GenerationPhase | null;
  message: string;
  payload: Record<string, unknown> | null;
  redacted: boolean;
}

export interface AgentContextSession {
  id: string;
  userId: string;
  conversationId: string;
  status: 'active' | 'completed' | 'failed' | 'canceled';
  snapshot: AgentContextSnapshot;
  createdAt: string;
  updatedAt: string;
  lastEventId: number;
}

export function isContextEventType(value: unknown): value is ContextEventType {
  if (typeof value !== 'string') return false;
  return [
    'profile_confirmed',
    'transcript_choice_set',
    'programs_selected',
    'course_selection_submitted',
    'distribution_selected',
    'constraints_selected',
    'mini_chat_message_added',
    'generation_command_requested',
    'generation_command_applied',
    'generation_mode_selected',
    'generation_phase_updated',
    'generation_completed',
    'generation_failed',
    'generation_canceled',
  ].includes(value);
}

export type V3GenerationJobStatus =
  | 'queued'
  | 'in_progress'
  | 'pause_requested'
  | 'paused'
  | 'cancel_requested'
  | 'canceled'
  | 'completed'
  | 'failed';

export type V3GenerationJobEventType =
  | 'job_created'
  | 'job_started'
  | 'phase_started'
  | 'phase_completed'
  | 'job_progress'
  | 'command_requested'
  | 'command_applied'
  | 'job_paused'
  | 'job_resumed'
  | 'job_canceled'
  | 'job_completed'
  | 'job_failed';

export interface V3GenerationJobSnapshot {
  id: string;
  sessionId: string;
  conversationId: string;
  status: V3GenerationJobStatus;
  phase: V3GenerationPhase;
  progressPercent: number;
  outputAccessId: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  heartbeatAt: string | null;
  attempt: number;
  createdAt: string;
  updatedAt: string;
}

export interface V3GenerationJobEvent {
  id: number;
  jobId: string;
  ts: string;
  eventType: V3GenerationJobEventType;
  phase: V3GenerationPhase | null;
  message: string | null;
  progressPercent: number | null;
  payloadJson?: Record<string, unknown> | null;
}

export interface V3GenerationCommand {
  id: string;
  jobId: string;
  commandType: V3GenerationCommandType;
  status: V3GenerationCommandStatus;
  payloadJson: Record<string, unknown> | null;
  requestedAt: string;
  appliedAt: string | null;
}

export function isV3GenerationCommandType(value: unknown): value is V3GenerationCommandType {
  if (typeof value !== 'string') return false;
  return ['pause', 'resume', 'cancel', 'retry', 'reply'].includes(value);
}
