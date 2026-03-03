import { NextRequest, NextResponse, after } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import {
  requestV3GenerationCommand,
  triggerV3GenerationJob,
} from '@/lib/services/gradPlanV3GenerationJobService';
import { isV3GenerationCommandType } from '@/lib/chatbot/grad-plan/v3/types';

type CommandBody = {
  commandType?: unknown;
  payload?: unknown;
  idempotencyKey?: unknown;
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractIds(pathname: string): { sessionId: string; jobId: string } {
  const parts = pathname.split('/');
  const sessionsMarker = parts.indexOf('sessions');
  const jobsMarker = parts.indexOf('jobs');

  return {
    sessionId: sessionsMarker >= 0 ? parts[sessionsMarker + 1] ?? '' : '',
    jobId: jobsMarker >= 0 ? parts[jobsMarker + 1] ?? '' : '',
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, jobId } = extractIds(request.nextUrl.pathname);
    if (!sessionId || !jobId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and jobId are required' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CommandBody;
    if (!isV3GenerationCommandType(body.commandType)) {
      return NextResponse.json(
        { success: false, error: 'commandType is invalid' },
        { status: 400 }
      );
    }

    const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : null;

    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
    if (!idempotencyKey) {
      return NextResponse.json(
        { success: false, error: 'idempotencyKey is required' },
        { status: 400 }
      );
    }

    const result = await requestV3GenerationCommand({
      userId: user.id,
      sessionId,
      jobId,
      commandType: body.commandType,
      payloadJson: payload,
      idempotencyKey,
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    if (body.commandType === 'resume' || body.commandType === 'retry') {
      after(async () => {
        try {
          await triggerV3GenerationJob(jobId);
        } catch (error) {
          console.error('Failed to trigger v3 job after command:', error);
        }
      });
    }

    return NextResponse.json({
      success: true,
      reused: result.reused,
      job: result.job,
      command: result.command,
    });
  } catch (error) {
    console.error('Error requesting v3 generation command:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request command',
      },
      { status: 500 }
    );
  }
}
