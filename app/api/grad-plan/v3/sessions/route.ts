import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { createOrGetV3Session } from '@/lib/services/gradPlanV3ContextService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateSessionBody = {
  conversationId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateSessionBody;
    const conversationId = typeof body.conversationId === 'string' && body.conversationId.trim().length > 0
      ? body.conversationId.trim()
      : '';

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const { session, reused } = await createOrGetV3Session({
      userId: user.id,
      conversationId,
    });

    return NextResponse.json(
      {
        success: true,
        reused,
        session,
      },
      { status: reused ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error creating v3 session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
