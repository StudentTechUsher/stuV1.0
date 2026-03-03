import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
type Filter =
  | { type: 'eq'; field: string; value: unknown }
  | { type: 'in'; field: string; values: unknown[] }
  | { type: 'gt'; field: string; value: number };

type TableName =
  | 'grad_plan_generation_jobs'
  | 'grad_plan_generation_job_events'
  | 'student';

class InMemorySupabase {
  private jobCounter = 0;
  private eventCounter = 0;

  public readonly tables: Record<TableName, Row[]>;

  constructor(initial?: Partial<Record<TableName, Row[]>>) {
    this.tables = {
      grad_plan_generation_jobs: [...(initial?.grad_plan_generation_jobs ?? [])],
      grad_plan_generation_job_events: [...(initial?.grad_plan_generation_job_events ?? [])],
      student: [...(initial?.student ?? [])],
    };

    const maxEventId = this.tables.grad_plan_generation_job_events
      .map(row => Number(row.id ?? 0))
      .filter(Number.isFinite)
      .reduce((max, value) => Math.max(max, value), 0);
    this.eventCounter = maxEventId;
  }

  from(table: string) {
    return new InMemoryQuery(this, table as TableName);
  }

  insertRows(table: TableName, payload: unknown): Row[] {
    const inputRows = Array.isArray(payload) ? payload : [payload];
    const now = new Date().toISOString();
    const insertedRows: Row[] = [];

    for (const rawRow of inputRows) {
      const row = { ...(rawRow as Row) };

      if (table === 'grad_plan_generation_jobs') {
        this.jobCounter += 1;
        if (!row.id) row.id = `job-${this.jobCounter}`;
        if (!row.created_at) row.created_at = now;
        if (!row.updated_at) row.updated_at = now;
        if (!row.status) row.status = 'queued';
        if (!row.phase) row.phase = 'queued';
        if (row.progress_percent === undefined) row.progress_percent = 0;
        if (!('output_access_id' in row)) row.output_access_id = null;
        if (!('error_message' in row)) row.error_message = null;
        if (!('attempt' in row)) row.attempt = 0;
      } else if (table === 'grad_plan_generation_job_events') {
        this.eventCounter += 1;
        if (!row.id) row.id = this.eventCounter;
        if (!row.ts) row.ts = now;
      }

      this.tables[table].push(row);
      insertedRows.push(row);
    }

    return insertedRows;
  }

  updateRows(table: TableName, filters: Filter[], payload: Row): Row[] {
    const rows = this.applyFilters(this.tables[table], filters);
    for (const row of rows) {
      Object.assign(row, payload);
    }
    return rows;
  }

  readRows(table: TableName, filters: Filter[]): Row[] {
    return this.applyFilters(this.tables[table], filters);
  }

  private applyFilters(rows: Row[], filters: Filter[]): Row[] {
    return rows.filter(row => {
      for (const filter of filters) {
        const fieldValue = row[filter.field];
        if (filter.type === 'eq' && fieldValue !== filter.value) return false;
        if (filter.type === 'in' && !filter.values.includes(fieldValue)) return false;
        if (filter.type === 'gt') {
          const numericValue = Number(fieldValue);
          if (!Number.isFinite(numericValue) || numericValue <= filter.value) return false;
        }
      }
      return true;
    });
  }
}

class InMemoryQuery {
  private action: 'select' | 'insert' | 'update' | null = null;
  private selectAfterMutation = false;
  private filters: Filter[] = [];
  private limitCount: number | null = null;
  private orderField: string | null = null;
  private orderAscending = true;
  private expectSingle = false;
  private expectMaybeSingle = false;
  private payload: unknown = null;

  constructor(
    private readonly db: InMemorySupabase,
    private readonly table: TableName
  ) {}

  select(_columns: string) {
    if (this.action === 'insert' || this.action === 'update') {
      this.selectAfterMutation = true;
      return this;
    }
    this.action = 'select';
    return this;
  }

  insert(payload: unknown) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  gt(field: string, value: number) {
    this.filters.push({ type: 'gt', field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this.execute();
  }

  single() {
    this.expectSingle = true;
    return this.execute();
  }

  maybeSingle() {
    this.expectMaybeSingle = true;
    return this.execute();
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    let rows: Row[] = [];

    if (this.action === 'insert') {
      rows = this.db.insertRows(this.table, this.payload);
    } else if (this.action === 'update') {
      rows = this.db.updateRows(this.table, this.filters, this.payload as Row);
    } else {
      rows = this.db.readRows(this.table, this.filters);
    }

    if (this.orderField) {
      const field = this.orderField;
      const direction = this.orderAscending ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const left = a[field];
        const right = b[field];
        if (left === right) return 0;
        return left! > right! ? direction : -direction;
      });
    }

    if (typeof this.limitCount === 'number') {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.expectSingle) {
      if (rows.length === 0) {
        return { data: null, error: { message: 'No rows' } };
      }
      return { data: rows[0], error: null };
    }

    if (this.expectMaybeSingle) {
      return { data: rows[0] ?? null, error: null };
    }

    if (this.action === 'insert' || this.action === 'update') {
      return {
        data: this.selectAfterMutation ? rows : null,
        error: null,
      };
    }

    return { data: rows, error: null };
  }
}

const runAutomaticGradPlanWorkflowMock = vi.fn();

let mockSupabase: InMemorySupabase;

vi.mock('@/lib/supabaseAdmin', () => ({
  get supabaseAdmin() {
    return mockSupabase as unknown as { from: (table: string) => unknown };
  },
}));

vi.mock('@/lib/services/aiDbService', () => ({
  GetAiPrompt: vi.fn(async () => null),
  InsertGeneratedGradPlan: vi.fn(async () => ({ accessId: 'mock-access' })),
}));

vi.mock('@/lib/mastra/workflows/automaticGradPlanWorkflow', () => ({
  runAutomaticGradPlanWorkflow: (...args: unknown[]) => runAutomaticGradPlanWorkflowMock(...args),
  WorkflowValidationError: class WorkflowValidationError extends Error {
    constructor(
      public readonly result: { issues: unknown[]; suggestedRepairPhases: string[] },
      public readonly attempts: number
    ) {
      super('Validation failed');
      this.name = 'WorkflowValidationError';
    }
  },
}));

import {
  createOrReuseGenerationJob,
  listGenerationJobEvents,
  processGenerationJob,
  runGenerationJobsWorkerCycle,
} from '@/lib/services/gradPlanGenerationJobService';

function baseJob(overrides?: Partial<Row>): Row {
  const now = new Date().toISOString();
  return {
    id: 'job-1',
    user_id: 'user-1',
    conversation_id: 'conv-1',
    status: 'queued',
    phase: 'queued',
    progress_percent: 0,
    input_payload: {},
    output_access_id: null,
    error_message: null,
    started_at: null,
    completed_at: null,
    heartbeat_at: now,
    attempt: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('gradPlanGenerationJobService integration', () => {
  beforeEach(() => {
    mockSupabase = new InMemorySupabase();
    runAutomaticGradPlanWorkflowMock.mockReset();
    runAutomaticGradPlanWorkflowMock.mockResolvedValue({
      accessId: 'access-1',
      finalPlan: { plan: [] },
    });
  });

  it('reuses an existing active job for the same user and conversation', async () => {
    mockSupabase = new InMemorySupabase({
      grad_plan_generation_jobs: [baseJob()],
    });

    const result = await createOrReuseGenerationJob({
      userId: 'user-1',
      conversationId: 'conv-1',
      inputPayload: {},
    });

    expect(result.reused).toBe(true);
    expect(result.job.id).toBe('job-1');
    expect(mockSupabase.tables.grad_plan_generation_jobs).toHaveLength(1);
    expect(mockSupabase.tables.grad_plan_generation_job_events).toHaveLength(0);
  });

  it('updates queued job payload when latest selections differ', async () => {
    mockSupabase = new InMemorySupabase({
      grad_plan_generation_jobs: [baseJob()],
    });

    const result = await createOrReuseGenerationJob({
      userId: 'user-1',
      conversationId: 'conv-1',
      inputPayload: { programs: [{ programId: '100' }] },
    });

    expect(result.reused).toBe(true);
    expect(result.job.id).toBe('job-1');
    expect((mockSupabase.tables.grad_plan_generation_jobs[0]?.input_payload as Record<string, unknown>)?.programs).toBeTruthy();
    expect(mockSupabase.tables.grad_plan_generation_job_events).toHaveLength(1);
    expect(mockSupabase.tables.grad_plan_generation_job_events[0].event_type).toBe('job_progress');
  });

  it('creates a new queued job and emits job_created event when no active job exists', async () => {
    const result = await createOrReuseGenerationJob({
      userId: 'user-2',
      conversationId: 'conv-2',
      inputPayload: { foo: 'bar' },
    });

    expect(result.reused).toBe(false);
    expect(result.job.status).toBe('queued');
    expect(mockSupabase.tables.grad_plan_generation_jobs).toHaveLength(1);
    expect(mockSupabase.tables.grad_plan_generation_job_events).toHaveLength(1);
    expect(mockSupabase.tables.grad_plan_generation_job_events[0].event_type).toBe('job_created');
  });

  it('processes a queued job once even when two workers race to claim it', async () => {
    mockSupabase = new InMemorySupabase({
      grad_plan_generation_jobs: [baseJob()],
    });

    runAutomaticGradPlanWorkflowMock.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      return {
        accessId: 'access-race',
        finalPlan: { plan: [] },
      };
    });

    await Promise.all([
      processGenerationJob('job-1'),
      processGenerationJob('job-1'),
    ]);

    expect(runAutomaticGradPlanWorkflowMock).toHaveBeenCalledTimes(1);

    const [job] = mockSupabase.tables.grad_plan_generation_jobs;
    expect(job.status).toBe('completed');
    expect(job.phase).toBe('completed');
    expect(job.output_access_id).toBe('access-race');
  });

  it('returns events in ascending order with afterId filtering', async () => {
    mockSupabase = new InMemorySupabase({
      grad_plan_generation_jobs: [baseJob()],
      grad_plan_generation_job_events: [
        { id: 1, job_id: 'job-1', ts: '2026-01-01T00:00:01Z', event_type: 'job_created' },
        { id: 2, job_id: 'job-1', ts: '2026-01-01T00:00:02Z', event_type: 'job_started' },
        { id: 3, job_id: 'job-1', ts: '2026-01-01T00:00:03Z', event_type: 'job_completed' },
      ],
    });

    const events = await listGenerationJobEvents({
      jobId: 'job-1',
      userId: 'user-1',
      afterId: 1,
      limit: 10,
    });

    expect(events.map(event => event.id)).toEqual([2, 3]);
  });

  it('worker cycle respects limit and only processes claimed queued jobs', async () => {
    mockSupabase = new InMemorySupabase({
      grad_plan_generation_jobs: [
        baseJob({ id: 'job-1', created_at: '2026-01-01T00:00:00Z' }),
        baseJob({ id: 'job-2', created_at: '2026-01-01T00:00:01Z' }),
      ],
    });

    const processed = await runGenerationJobsWorkerCycle(1);

    expect(processed).toBe(1);
    expect(runAutomaticGradPlanWorkflowMock).toHaveBeenCalledTimes(1);

    const job1 = mockSupabase.tables.grad_plan_generation_jobs.find(row => row.id === 'job-1');
    const job2 = mockSupabase.tables.grad_plan_generation_jobs.find(row => row.id === 'job-2');
    expect(job1?.status).toBe('completed');
    expect(job2?.status).toBe('queued');
  });
});
