import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { getV3Session, listV3TraceEvents } from '@/lib/services/gradPlanV3ContextService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  if (!raw) return 500;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 500;
  return Math.min(parsed, 1000);
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

    const session = await getV3Session({ userId: user.id, sessionId });
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const traceEvents = await listV3TraceEvents({
      userId: user.id,
      sessionId,
      afterId: parseAfterId(request.nextUrl.searchParams.get('afterId')),
      limit: parseLimit(request.nextUrl.searchParams.get('limit')),
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        updatedAt: session.updatedAt,
      },
      traceEvents,
    });
  } catch (error) {
    console.error('Error reading v3 trace events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read trace events',
      },
      { status: 500 }
    );
  }
}
