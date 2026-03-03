import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import {
  appendV3ContextEvent,
  listV3ContextEvents,
} from '@/lib/services/gradPlanV3ContextService';
import {
  isContextEventType,
  type ContextEventPayloadMap,
  type ContextEventType,
} from '@/lib/chatbot/grad-plan/v3/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AppendEventBody = {
  eventType?: unknown;
  payload?: unknown;
  eventId?: unknown;
  actor?: unknown;
  createdAt?: unknown;
  idempotencyKey?: unknown;
};

function extractSessionId(pathname: string): string {
  const parts = pathname.split('/');
  const marker = parts.indexOf('sessions');
  if (marker < 0) return '';
  return parts[marker + 1] ?? '';
}

function parseAfterId(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseLimit(raw: string | null): number {
  if (!raw) return 200;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 200;
  return Math.min(parsed, 500);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = extractSessionId(request.nextUrl.pathname);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const events = await listV3ContextEvents({
      userId: user.id,
      sessionId,
      afterId: parseAfterId(request.nextUrl.searchParams.get('afterId')),
      limit: parseLimit(request.nextUrl.searchParams.get('limit')),
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('Error reading v3 context events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read context events',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = extractSessionId(request.nextUrl.pathname);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const body = (await request.json()) as AppendEventBody;
    const eventType = body.eventType;
    if (!isContextEventType(eventType)) {
      return NextResponse.json({ success: false, error: 'eventType is invalid' }, { status: 400 });
    }

    if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
      return NextResponse.json({ success: false, error: 'payload must be an object' }, { status: 400 });
    }

    const actor = body.actor === 'agent' || body.actor === 'system' ? body.actor : 'user';
    const eventId = typeof body.eventId === 'string' ? body.eventId : undefined;
    const createdAt = typeof body.createdAt === 'string' ? body.createdAt : undefined;
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined;

    const result = await appendV3ContextEvent({
      userId: user.id,
      sessionId,
      eventType,
      payload: body.payload as ContextEventPayloadMap[ContextEventType],
      eventId,
      actor,
      createdAt,
      idempotencyKey,
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reused: result.reused,
      session: result.session,
      event: result.event,
    });
  } catch (error) {
    console.error('Error appending v3 context event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to append context event',
      },
      { status: 500 }
    );
  }
}
