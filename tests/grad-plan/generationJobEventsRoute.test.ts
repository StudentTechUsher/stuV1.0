import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { GenerationJobEvent, GenerationJobSnapshot } from '@/lib/chatbot/grad-plan/types';

const getVerifiedUserMock = vi.fn();
const getGenerationJobSnapshotMock = vi.fn();
const listGenerationJobEventsMock = vi.fn();
const isTerminalJobStatusMock = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  getVerifiedUser: (...args: unknown[]) => getVerifiedUserMock(...args),
}));

vi.mock('@/lib/services/gradPlanGenerationJobService', () => ({
  getGenerationJobSnapshot: (...args: unknown[]) => getGenerationJobSnapshotMock(...args),
  listGenerationJobEvents: (...args: unknown[]) => listGenerationJobEventsMock(...args),
  isTerminalJobStatus: (...args: unknown[]) => isTerminalJobStatusMock(...args),
}));

import { GET } from '@/app/api/grad-plan/generation-jobs/[jobId]/events/route';

function snapshot(status: GenerationJobSnapshot['status']): GenerationJobSnapshot {
  const now = '2026-02-26T12:00:00Z';
  return {
    id: 'job-1',
    conversationId: 'conv-1',
    status,
    phase: status === 'completed' ? 'completed' : 'preparing',
    progressPercent: status === 'completed' ? 100 : 5,
    outputAccessId: status === 'completed' ? 'access-1' : null,
    errorMessage: null,
    startedAt: now,
    completedAt: status === 'completed' ? now : null,
    heartbeatAt: now,
    attempt: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function event(id: number): GenerationJobEvent {
  return {
    id,
    jobId: 'job-1',
    ts: '2026-02-26T12:00:00Z',
    eventType: id === 5 ? 'phase_completed' : 'job_progress',
    phase: id === 5 ? 'major_fill' : 'preparing',
    message: 'ok',
    progressPercent: 35,
    payloadJson: null,
  };
}

describe('generation job events route', () => {
  beforeEach(() => {
    getVerifiedUserMock.mockReset();
    getGenerationJobSnapshotMock.mockReset();
    listGenerationJobEventsMock.mockReset();
    isTerminalJobStatusMock.mockReset();
    isTerminalJobStatusMock.mockImplementation((status: string) =>
      status === 'completed' || status === 'failed' || status === 'canceled'
    );
  });

  it('resumes from the max of query afterId and Last-Event-ID header', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1' });
    getGenerationJobSnapshotMock.mockResolvedValue(snapshot('completed'));
    listGenerationJobEventsMock.mockResolvedValue([event(5)]);

    const request = new NextRequest(
      'http://localhost/api/grad-plan/generation-jobs/job-1/events?afterId=2',
      {
        headers: {
          'last-event-id': '4',
        },
      }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const body = await response.text();
    expect(body).toContain('retry: 2000');
    expect(body).toContain('id: 5');
    expect(body).toContain('"phase":"major_fill"');

    expect(listGenerationJobEventsMock).toHaveBeenCalled();
    expect(listGenerationJobEventsMock.mock.calls[0]?.[0]).toMatchObject({
      jobId: 'job-1',
      userId: 'user-1',
      afterId: 4,
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    getVerifiedUserMock.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost/api/grad-plan/generation-jobs/job-1/events'
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.success).toBe(false);
  });
});
