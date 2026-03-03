import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getVerifiedUserMock = vi.fn();
const createSupabaseServerComponentClientMock = vi.fn();
const supabaseAdminFromMock = vi.fn();
const logInfoMock = vi.fn();
const logWarnMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  getVerifiedUser: (...args: unknown[]) => getVerifiedUserMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerComponentClient: (...args: unknown[]) => createSupabaseServerComponentClientMock(...args),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => supabaseAdminFromMock(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  logInfo: (...args: unknown[]) => logInfoMock(...args),
  logWarn: (...args: unknown[]) => logWarnMock(...args),
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

import { POST } from '@/app/api/grad-plan-agent/launch/route';

type UserScopedOptions = {
  profile?: { id: string; email: string | null } | null;
  student?: {
    id: number;
    student_type: string | null;
    est_grad_date: string | null;
    est_grad_term: string | null;
    admission_year: number | null;
    is_transfer: string | boolean | null;
    work_status: string | null;
    career_goals: string | null;
    class_preferences: number[] | null;
    selected_programs: number[] | null;
    selected_interests: number[] | null;
    gpa: number | null;
  } | null;
  classPreferences?: Array<{ id: number; name: string }>;
  userCourses?: {
    courses: Array<Record<string, unknown>>;
    inserted_at: string | null;
  } | null;
  activePlans?: Array<{
    id: number;
    plan_name: string | null;
    created_at: string | null;
    updated_at: string | null;
    pending_approval: boolean;
    pending_edits: boolean;
    programs_in_plan: number[] | null;
    plan_details: unknown;
  }>;
};

function createMaybeSingleQuery(data: unknown, error: { message: string } | null = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data, error });

  return query;
}

function createClassPreferencesQuery(data: unknown, error: { message: string } | null = null) {
  const query = {
    select: vi.fn(),
    in: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.in.mockResolvedValue({ data, error });

  return query;
}

function createActivePlanQuery(data: unknown, error: { message: string } | null = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data, error });

  return query;
}

function createUserScopedClient(options: UserScopedOptions = {}) {
  const {
    profile = { id: 'user-1', email: 'student@example.edu' },
    student = {
      id: 12,
      student_type: 'undergraduate',
      est_grad_date: '2028-05-15',
      est_grad_term: 'Spring',
      admission_year: 2024,
      is_transfer: 'transfer',
      work_status: 'part_time',
      career_goals: 'Data science',
      class_preferences: [11, 22],
      selected_programs: [1, 2],
      selected_interests: [5],
      gpa: 3.7,
    },
    classPreferences = [
      { id: 11, name: 'Morning classes' },
      { id: 22, name: 'In-person' },
    ],
    userCourses = {
      courses: [
        {
          subject: 'CS',
          number: '142',
          title: 'Intro to Programming',
          credits: 3,
          grade: 'A',
          term: 'Fall 2024',
          status: 'completed',
          origin: 'parsed',
        },
      ],
      inserted_at: '2026-03-01T00:00:00.000Z',
    },
    activePlans = [
      {
        id: 900,
        plan_name: 'Active Plan',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-15T00:00:00.000Z',
        pending_approval: false,
        pending_edits: false,
        programs_in_plan: [1, 2],
        plan_details: { plan: [{ term: 'Fall 2026' }, { term: 'Winter 2027' }] },
      },
    ],
  } = options;

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return createMaybeSingleQuery(profile);
      }

      if (table === 'student') {
        return createMaybeSingleQuery(student);
      }

      if (table === 'user_courses') {
        return createMaybeSingleQuery(userCourses);
      }

      if (table === 'class_preferences') {
        return createClassPreferencesQuery(classPreferences);
      }

      if (table === 'grad_plan') {
        return createActivePlanQuery(activePlans);
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

type AdminBehavior = {
  expiredIds?: string[];
  insertId?: string;
  cleanupSelectError?: string | null;
  cleanupDeleteError?: string | null;
  insertError?: string | null;
};

function createSupabaseAdminFrom(behavior: AdminBehavior, capture: {
  deletedIds: string[];
  insertPayload: Record<string, unknown> | null;
}) {
  const {
    expiredIds = [],
    insertId = 'handoff-1',
    cleanupSelectError = null,
    cleanupDeleteError = null,
    insertError = null,
  } = behavior;

  return vi.fn((table: string) => {
    if (table !== 'agent_handoffs') {
      throw new Error(`Unexpected admin table: ${table}`);
    }

    const query = {
      select: vi.fn(),
      is: vi.fn(),
      lt: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      delete: vi.fn(),
      in: vi.fn(),
      insert: vi.fn(),
      single: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockImplementation(async () => {
      if (cleanupSelectError) {
        return { data: null, error: { message: cleanupSelectError } };
      }
      return {
        data: expiredIds.map((id) => ({ id })),
        error: null,
      };
    });

    query.delete.mockReturnValue(query);
    query.in.mockImplementation(async (_column: string, ids: string[]) => {
      capture.deletedIds = ids;
      if (cleanupDeleteError) {
        return { error: { message: cleanupDeleteError } };
      }
      return { error: null };
    });

    query.insert.mockImplementation((payload: Record<string, unknown>) => {
      capture.insertPayload = payload;
      return query;
    });

    query.single.mockImplementation(async () => {
      if (insertError) {
        return { data: null, error: { message: insertError } };
      }

      return {
        data: {
          id: insertId,
          expires_at: '2026-03-02T00:01:00.000Z',
        },
        error: null,
      };
    });

    return query;
  });
}

function launchRequest() {
  return new NextRequest('http://localhost/api/grad-plan-agent/launch', { method: 'POST' });
}

describe('grad plan agent launch route', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GRAD_PLANNER_AGENT_URL: 'https://degree-auditing.stuplanning.com',
      GRAD_PLANNER_HANDOFF_SECRET: 'test-handoff-secret-value',
      GRAD_PLANNER_HANDOFF_AUDIENCE: 'grad-planner-agent',
      GRAD_PLANNER_HANDOFF_TTL_SECONDS: '60',
    };

    getVerifiedUserMock.mockReset();
    createSupabaseServerComponentClientMock.mockReset();
    supabaseAdminFromMock.mockReset();
    logInfoMock.mockReset();
    logWarnMock.mockReset();
    logErrorMock.mockReset();
  });

  it('returns 401 for unauthenticated launch attempts', async () => {
    getVerifiedUserMock.mockResolvedValue(null);

    const response = await POST(launchRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns 500 when handoff env config is missing', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1', email: 'student@example.edu' });
    delete process.env.GRAD_PLANNER_HANDOFF_SECRET;

    const response = await POST(launchRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Grad planner handoff is not configured',
    });
  });

  it('creates a handoff and responds with 303 redirect containing a valid JWT', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1', email: 'student@example.edu' });
    createSupabaseServerComponentClientMock.mockResolvedValue(createUserScopedClient());

    const capture = { deletedIds: [] as string[], insertPayload: null as Record<string, unknown> | null };
    supabaseAdminFromMock.mockImplementation(createSupabaseAdminFrom({ insertId: 'handoff-abc' }, capture));

    const response = await POST(launchRequest());

    expect(response.status).toBe(303);

    const location = response.headers.get('location');
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location as string);
    expect(redirectUrl.origin).toBe('https://degree-auditing.stuplanning.com');
    expect(redirectUrl.pathname).toBe('/auth/handoff');

    const token = redirectUrl.searchParams.get('token');
    expect(token).toBeTruthy();

    const verification = await jwtVerify(
      token as string,
      new TextEncoder().encode(process.env.GRAD_PLANNER_HANDOFF_SECRET),
      {
        issuer: 'stuplanning-app',
        audience: process.env.GRAD_PLANNER_HANDOFF_AUDIENCE,
      }
    );

    expect(verification.payload.sub).toBe('user-1');
    expect(verification.payload.jti).toBe('handoff-abc');
    expect(typeof verification.payload.iat).toBe('number');
    expect(typeof verification.payload.exp).toBe('number');
    expect((verification.payload.exp as number) - (verification.payload.iat as number)).toBe(60);

    expect(capture.insertPayload).toBeTruthy();
    expect(capture.insertPayload?.user_id).toBe('user-1');
    expect(capture.insertPayload?.used_at).toBeNull();

    const bootstrapPayload = capture.insertPayload?.bootstrap_payload as Record<string, unknown>;
    expect(bootstrapPayload.user).toMatchObject({ id: 'user-1', email: 'student@example.edu' });
    expect(bootstrapPayload.bootstrap).toBeTruthy();
    expect((bootstrapPayload.bootstrap as Record<string, unknown>).preferences).toBeTruthy();
    expect((bootstrapPayload.bootstrap as Record<string, unknown>).transcriptCourses).toBeTruthy();
    expect((bootstrapPayload.bootstrap as Record<string, unknown>).transcriptSummary).toBeTruthy();
    expect((bootstrapPayload.bootstrap as Record<string, unknown>).priorPlanMeta).toBeTruthy();
  });

  it('creates nullable-safe bootstrap payload when transcript and active plan are missing', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1', email: 'student@example.edu' });
    createSupabaseServerComponentClientMock.mockResolvedValue(
      createUserScopedClient({
        student: {
          id: 12,
          student_type: null,
          est_grad_date: null,
          est_grad_term: null,
          admission_year: null,
          is_transfer: null,
          work_status: null,
          career_goals: null,
          class_preferences: null,
          selected_programs: null,
          selected_interests: null,
          gpa: null,
        },
        classPreferences: [],
        userCourses: null,
        activePlans: [],
      })
    );

    const capture = { deletedIds: [] as string[], insertPayload: null as Record<string, unknown> | null };
    supabaseAdminFromMock.mockImplementation(createSupabaseAdminFrom({}, capture));

    const response = await POST(launchRequest());

    expect(response.status).toBe(303);
    const payload = capture.insertPayload?.bootstrap_payload as {
      bootstrap: {
        transcriptSummary: { hasTranscript: boolean; courseCount: number };
        priorPlanMeta: { hasActivePlan: boolean; activePlanId: string | null };
      };
    };

    expect(payload.bootstrap.transcriptSummary.hasTranscript).toBe(false);
    expect(payload.bootstrap.transcriptSummary.courseCount).toBe(0);
    expect(payload.bootstrap.priorPlanMeta.hasActivePlan).toBe(false);
    expect(payload.bootstrap.priorPlanMeta.activePlanId).toBeNull();
  });

  it('prunes expired handoff rows in bounded cleanup before insert', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1', email: 'student@example.edu' });
    createSupabaseServerComponentClientMock.mockResolvedValue(createUserScopedClient());

    const capture = { deletedIds: [] as string[], insertPayload: null as Record<string, unknown> | null };
    supabaseAdminFromMock.mockImplementation(
      createSupabaseAdminFrom({ expiredIds: ['old-1', 'old-2', 'old-3'] }, capture)
    );

    const response = await POST(launchRequest());

    expect(response.status).toBe(303);
    expect(capture.deletedIds).toEqual(['old-1', 'old-2', 'old-3']);
  });
});
