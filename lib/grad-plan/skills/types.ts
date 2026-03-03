import type {
  AgentContextSnapshot,
  TraceEvent,
  V3GenerationPhase,
} from '@/lib/chatbot/grad-plan/v3/types';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export interface DraftPlanCourse {
  courseCode: string;
  credits: number;
  source: 'major' | 'minor' | 'gen_ed' | 'elective';
  title?: string;
  fulfills?: string[];
  raw?: Record<string, unknown>;
}

export interface DraftPlanTerm {
  termId: string;
  termLabel: string;
  plannedCourses: DraftPlanCourse[];
  metadata?: {
    minCredits?: number;
    maxCredits?: number;
    targetCredits?: number;
    termType?: string;
    [key: string]: unknown;
  };
}

export interface DraftPlan {
  terms: DraftPlanTerm[];
  metadata?: Record<string, unknown>;
}

export type RuntimeSkillPhase = V3GenerationPhase | 'repair' | 'any';

export interface RuntimeSkillInput {
  snapshot: AgentContextSnapshot;
  draftPlan: DraftPlan | null;
  phase: RuntimeSkillPhase;
}

export type RuntimeSkillCheckStatus = 'pass' | 'warn' | 'fail';

export interface RuntimeSkillCheck {
  id: string;
  status: RuntimeSkillCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface RuntimeSkillRepairHint {
  phase: V3GenerationPhase;
  reason: string;
  priority: number;
}

export interface RuntimeSkillResult {
  skillName: string;
  updates: DeepPartial<AgentContextSnapshot>;
  checks: RuntimeSkillCheck[];
  suggestedRepairs: RuntimeSkillRepairHint[];
  trace: TraceEvent[];
}

export interface RuntimeSkill {
  name: string;
  supportsPhase: (phase: RuntimeSkillPhase) => boolean;
  run: (input: RuntimeSkillInput) => Promise<RuntimeSkillResult> | RuntimeSkillResult;
}

export interface RuntimeSkillPipelineResult {
  results: RuntimeSkillResult[];
  mergedUpdates: DeepPartial<AgentContextSnapshot>;
  checks: RuntimeSkillCheck[];
  suggestedRepairs: RuntimeSkillRepairHint[];
  trace: TraceEvent[];
}
