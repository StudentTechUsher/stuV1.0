import { SignJWT } from 'jose';

export const HANDOFF_ISSUER = 'stuplanning-app';
const DEFAULT_HANDOFF_TTL_SECONDS = 60;
const MIN_HANDOFF_TTL_SECONDS = 10;
const MAX_HANDOFF_TTL_SECONDS = 300;

export type LaunchConfig = {
  agentBaseUrl: string;
  handoffSecret: string;
  audience: string;
  ttlSeconds: number;
};

type StudentRow = {
  student_type?: string | null;
  est_grad_date?: string | null;
  est_grad_term?: string | null;
  admission_year?: number | null;
  is_transfer?: boolean | string | null;
  work_status?: string | null;
  career_goals?: string | null;
  class_preferences?: number[] | null;
  selected_programs?: number[] | null;
  selected_interests?: number[] | null;
  gpa?: number | string | null;
};

type ClassPreferenceRow = {
  id: number;
  name: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
};

type UserCourseRaw = {
  subject?: unknown;
  number?: unknown;
  title?: unknown;
  credits?: unknown;
  grade?: unknown;
  term?: unknown;
  status?: unknown;
  origin?: unknown;
};

type UserCoursesRow = {
  courses?: unknown;
  inserted_at?: string | null;
};

type ActivePlanRow = {
  id: number | string;
  plan_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pending_approval?: boolean | null;
  pending_edits?: boolean | null;
  programs_in_plan?: number[] | null;
  plan_details?: unknown;
};

export type AgentBootstrapResponse = {
  user: {
    id: string;
    email: string | null;
  };
  bootstrap: {
    preferences: {
      studentType: string | null;
      estGradDate: string | null;
      estGradTerm: string | null;
      admissionYear: number | null;
      isTransfer: boolean | null;
      workStatus: string | null;
      careerGoals: string | null;
      classPreferenceIds: number[];
      classPreferenceNames: string[];
      selectedProgramIds: number[];
      selectedInterestIds: number[];
    };
    transcriptCourses: Array<{
      code: string;
      subject: string;
      number: string;
      title: string;
      credits: number;
      grade: string | null;
      term: string | null;
      status: 'completed' | 'in-progress' | 'withdrawn';
      origin: string;
    }>;
    transcriptSummary: {
      hasTranscript: boolean;
      courseCount: number;
      completedCount: number;
      inProgressCount: number;
      withdrawnCount: number;
      completedCredits: number;
      totalCredits: number;
      gpa: number | null;
      lastUpdatedAt: string | null;
    };
    priorPlanMeta: {
      hasActivePlan: boolean;
      activePlanId: string | null;
      planName: string | null;
      createdAt: string | null;
      updatedAt: string | null;
      pendingApproval: boolean;
      pendingEdits: boolean;
      programIds: number[];
      termCount: number;
    };
  };
};

export function getLaunchConfig(env: NodeJS.ProcessEnv = process.env): LaunchConfig {
  const agentBaseUrl = env.GRAD_PLANNER_AGENT_URL?.trim();
  const handoffSecret = env.GRAD_PLANNER_HANDOFF_SECRET?.trim();
  const audience = env.GRAD_PLANNER_HANDOFF_AUDIENCE?.trim();

  if (!agentBaseUrl || !handoffSecret || !audience) {
    throw new Error('Grad planner handoff is not configured');
  }

  return {
    agentBaseUrl,
    handoffSecret,
    audience,
    ttlSeconds: parseTtlSeconds(env.GRAD_PLANNER_HANDOFF_TTL_SECONDS),
  };
}

export function parseTtlSeconds(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  const ttl = Number.isFinite(parsed) ? parsed : DEFAULT_HANDOFF_TTL_SECONDS;
  return Math.min(MAX_HANDOFF_TTL_SECONDS, Math.max(MIN_HANDOFF_TTL_SECONDS, ttl));
}

export function buildAgentHandoffUrl(agentBaseUrl: string, token: string): string {
  const handoffUrl = new URL('/auth/handoff', normalizeBaseUrl(agentBaseUrl));
  handoffUrl.searchParams.set('token', token);
  return handoffUrl.toString();
}

export async function signAgentHandoffJwt(args: {
  handoffId: string;
  userId: string;
  audience: string;
  handoffSecret: string;
  ttlSeconds: number;
}): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + args.ttlSeconds;

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(HANDOFF_ISSUER)
    .setAudience(args.audience)
    .setSubject(args.userId)
    .setJti(args.handoffId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expSeconds)
    .sign(new TextEncoder().encode(args.handoffSecret));
}

export function normalizeBootstrapPayload(args: {
  userId: string;
  profile: ProfileRow | null;
  student: StudentRow | null;
  classPreferences: ClassPreferenceRow[];
  userCourses: UserCoursesRow | null;
  activePlan: ActivePlanRow | null;
}): AgentBootstrapResponse {
  const classPreferenceIds = normalizeNumberArray(args.student?.class_preferences);
  const classPreferenceNameMap = new Map(
    args.classPreferences
      .filter((row) => Number.isFinite(row.id) && typeof row.name === 'string')
      .map((row) => [row.id, row.name.trim()])
  );

  const transcriptCourses = normalizeTranscriptCourses(args.userCourses?.courses);
  const transcriptSummary = summarizeTranscript({
    transcriptCourses,
    gpa: normalizeNullableNumber(args.student?.gpa),
    lastUpdatedAt: args.userCourses?.inserted_at ?? null,
  });

  const priorPlanMeta = normalizePriorPlanMeta(args.activePlan);

  return {
    user: {
      id: args.userId,
      email: args.profile?.email ?? null,
    },
    bootstrap: {
      preferences: {
        studentType: normalizeNullableString(args.student?.student_type),
        estGradDate: normalizeNullableString(args.student?.est_grad_date),
        estGradTerm: normalizeNullableString(args.student?.est_grad_term),
        admissionYear: normalizeNullableNumber(args.student?.admission_year),
        isTransfer: normalizeTransferFlag(args.student?.is_transfer),
        workStatus: normalizeNullableString(args.student?.work_status),
        careerGoals: normalizeNullableString(args.student?.career_goals),
        classPreferenceIds,
        classPreferenceNames: classPreferenceIds
          .map((id) => classPreferenceNameMap.get(id))
          .filter((value): value is string => Boolean(value)),
        selectedProgramIds: normalizeNumberArray(args.student?.selected_programs),
        selectedInterestIds: normalizeNumberArray(args.student?.selected_interests),
      },
      transcriptCourses,
      transcriptSummary,
      priorPlanMeta,
    },
  };
}

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Grad planner handoff is not configured');
  }

  const normalized = trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  return new URL(normalized).toString();
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'number' ? entry : Number.parseInt(String(entry), 10)))
    .filter((entry) => Number.isFinite(entry));
}

function normalizeTransferFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (['1', 'true', 'yes', 'y', 'transfer', 'transferred', 'is_transfer'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'freshman', 'new'].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeTranscriptCourses(rawCourses: unknown): AgentBootstrapResponse['bootstrap']['transcriptCourses'] {
  if (!Array.isArray(rawCourses)) return [];

  return rawCourses
    .filter((course): course is UserCourseRaw => Boolean(course) && typeof course === 'object')
    .map((course) => {
      const subject = normalizeCourseSegment(course.subject);
      const number = normalizeCourseSegment(course.number);
      const code = `${subject}${number}`.trim();
      const normalizedCredits = normalizeNullableNumber(course.credits) ?? 0;
      const grade = normalizeNullableString(course.grade);
      const status = normalizeTranscriptStatus(course.status, grade);

      return {
        code,
        subject,
        number,
        title: normalizeNullableString(course.title) ?? '',
        credits: normalizedCredits,
        grade,
        term: normalizeNullableString(course.term),
        status,
        origin: normalizeNullableString(course.origin) ?? 'parsed',
      };
    });
}

function normalizeCourseSegment(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

function normalizeTranscriptStatus(
  rawStatus: unknown,
  grade: string | null
): 'completed' | 'in-progress' | 'withdrawn' {
  const normalizedStatus = normalizeNullableString(rawStatus)?.toLowerCase();

  if (normalizedStatus === 'withdrawn') return 'withdrawn';
  if (normalizedStatus === 'completed') return 'completed';
  if (normalizedStatus === 'in-progress') return 'in-progress';

  if (grade?.toUpperCase() === 'W') return 'withdrawn';
  if (!grade) return 'in-progress';
  return 'completed';
}

function summarizeTranscript(args: {
  transcriptCourses: AgentBootstrapResponse['bootstrap']['transcriptCourses'];
  gpa: number | null;
  lastUpdatedAt: string | null;
}): AgentBootstrapResponse['bootstrap']['transcriptSummary'] {
  let completedCount = 0;
  let inProgressCount = 0;
  let withdrawnCount = 0;
  let completedCredits = 0;
  let totalCredits = 0;

  for (const course of args.transcriptCourses) {
    totalCredits += course.credits;

    if (course.status === 'completed') {
      completedCount += 1;
      completedCredits += course.credits;
      continue;
    }

    if (course.status === 'withdrawn') {
      withdrawnCount += 1;
      continue;
    }

    inProgressCount += 1;
  }

  return {
    hasTranscript: args.transcriptCourses.length > 0,
    courseCount: args.transcriptCourses.length,
    completedCount,
    inProgressCount,
    withdrawnCount,
    completedCredits,
    totalCredits,
    gpa: args.gpa,
    lastUpdatedAt: normalizeNullableString(args.lastUpdatedAt),
  };
}

function normalizePriorPlanMeta(activePlan: ActivePlanRow | null): AgentBootstrapResponse['bootstrap']['priorPlanMeta'] {
  if (!activePlan) {
    return {
      hasActivePlan: false,
      activePlanId: null,
      planName: null,
      createdAt: null,
      updatedAt: null,
      pendingApproval: false,
      pendingEdits: false,
      programIds: [],
      termCount: 0,
    };
  }

  return {
    hasActivePlan: true,
    activePlanId: String(activePlan.id),
    planName: normalizeNullableString(activePlan.plan_name),
    createdAt: normalizeNullableString(activePlan.created_at),
    updatedAt: normalizeNullableString(activePlan.updated_at),
    pendingApproval: Boolean(activePlan.pending_approval),
    pendingEdits: Boolean(activePlan.pending_edits),
    programIds: normalizeNumberArray(activePlan.programs_in_plan),
    termCount: getTermCount(activePlan.plan_details),
  };
}

function getTermCount(planDetails: unknown): number {
  if (Array.isArray(planDetails)) {
    return countTermEntries(planDetails);
  }

  if (planDetails && typeof planDetails === 'object') {
    const record = planDetails as Record<string, unknown>;

    if (Array.isArray(record.plan)) {
      return countTermEntries(record.plan);
    }

    if (Array.isArray(record.terms)) {
      return record.terms.length;
    }
  }

  return 0;
}

function countTermEntries(items: unknown[]): number {
  return items.filter((item) => Boolean(item) && typeof item === 'object' && 'term' in (item as object)).length;
}
