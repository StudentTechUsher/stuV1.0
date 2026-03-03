import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { getV3Session } from '@/lib/services/gradPlanV3ContextService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractSessionId(pathname: string): string {
  const parts = pathname.split('/');
  const marker = parts.indexOf('sessions');
  if (marker < 0) return '';
  return parts[marker + 1] ?? '';
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

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error reading v3 session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read session',
      },
      { status: 500 }
    );
  }
}
