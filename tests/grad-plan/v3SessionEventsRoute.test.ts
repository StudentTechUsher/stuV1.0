import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getVerifiedUserMock = vi.fn();
const appendV3ContextEventMock = vi.fn();
const listV3ContextEventsMock = vi.fn();

vi.mock('@/lib/supabase/auth', () => ({
  getVerifiedUser: (...args: unknown[]) => getVerifiedUserMock(...args),
}));

vi.mock('@/lib/services/gradPlanV3ContextService', () => ({
  appendV3ContextEvent: (...args: unknown[]) => appendV3ContextEventMock(...args),
  listV3ContextEvents: (...args: unknown[]) => listV3ContextEventsMock(...args),
}));

import { GET, POST } from '@/app/api/grad-plan/v3/sessions/[sessionId]/events/route';

describe('v3 session events route', () => {
  beforeEach(() => {
    getVerifiedUserMock.mockReset();
    appendV3ContextEventMock.mockReset();
    listV3ContextEventsMock.mockReset();
  });

  it('creates context events for authenticated users', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1' });
    appendV3ContextEventMock.mockResolvedValue({
      reused: false,
      session: { id: 'session-1' },
      event: { id: 'event-1', sequenceId: 1 },
    });

    const request = new NextRequest('http://localhost/api/grad-plan/v3/sessions/session-1/events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'profile_confirmed',
        payload: {
          confirmed: true,
          studentType: 'undergraduate',
          admissionYear: 2024,
          estimatedGraduationTerm: 'Spring',
          estimatedGraduationYear: 2028,
        },
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(appendV3ContextEventMock).toHaveBeenCalled();
  });

  it('returns 400 for invalid event types', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1' });

    const request = new NextRequest('http://localhost/api/grad-plan/v3/sessions/session-1/events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'invalid',
        payload: {},
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('lists events for authenticated users', async () => {
    getVerifiedUserMock.mockResolvedValue({ id: 'user-1' });
    listV3ContextEventsMock.mockResolvedValue([
      {
        sequenceId: 1,
        id: 'event-1',
        type: 'profile_confirmed',
      },
    ]);

    const request = new NextRequest('http://localhost/api/grad-plan/v3/sessions/session-1/events?afterId=0&limit=50');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.events)).toBe(true);
  });
});
