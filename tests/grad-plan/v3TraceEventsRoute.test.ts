import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { TraceEvent } from '@/lib/chatbot/grad-plan/v3/types';

const getVerifiedUserMock = vi.fn();
const getV3SessionMock = vi.fn();
const listV3TraceEventsMock = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  getVerifiedUser: (...args: unknown[]) => getVerifiedUserMock(...args),
}));

vi.mock('@/lib/services/gradPlanV3ContextService', () => ({
  getV3Session: (...args: unknown[]) => getV3SessionMock(...args),
  listV3TraceEvents: (...args: unknown[]) => listV3TraceEventsMock(...args),
}));

import { GET } from '@/app/api/grad-plan/v3/sessions/[sessionId]/trace/events/route';

function traceEvent(sequenceId: number): TraceEvent {
  return {
    id: `trace-${sequenceId}`,
    sessionId: 'session-1',
    sequenceId,
    ts: '2026-02-26T12:00:00.000Z',
    level: 'info',
    scope: 'phase',
    phase: 'major_fill',
    message: 'ok',
    payload: null,
    redacted: true,
  };
}

describe('v3 trace events SSE route', () => {
  beforeEach(() => {
    getVerifiedUserMock.mockReset();
    getV3SessionMock.mockReset();
    listV3TraceEventsMock.mockReset();
  });

  it('resumes from max(query afterId, Last-Event-ID)', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1' });
    getV3SessionMock.mockResolvedValue({ id: 'session-1', status: 'completed' });
    listV3TraceEventsMock.mockResolvedValue([traceEvent(5)]);

    const request = new NextRequest(
      'http://localhost/api/grad-plan/v3/sessions/session-1/trace/events?afterId=2',
      {
        headers: {
          'last-event-id': '4',
        },
      }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.text();
    expect(body).toContain('retry: 2000');
    expect(body).toContain('id: 5');
    expect(body).toContain('"phase":"major_fill"');

    expect(listV3TraceEventsMock).toHaveBeenCalled();
    expect(listV3TraceEventsMock.mock.calls[0]?.[0]).toMatchObject({
      sessionId: 'session-1',
      userId: 'user-1',
      afterId: 4,
    });
  });

  it('returns 401 for unauthenticated users', async () => {
    getVerifiedUserMock.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/grad-plan/v3/sessions/session-1/trace/events');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.success).toBe(false);
  });
});
