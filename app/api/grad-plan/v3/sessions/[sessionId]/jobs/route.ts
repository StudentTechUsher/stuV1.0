import { NextRequest, NextResponse, after } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { isGradPlanV3LiveJobsEnabled } from '@/lib/config/featureFlags';
import {
  createOrReuseV3GenerationJob,
  triggerV3GenerationJob,
} from '@/lib/services/gradPlanV3GenerationJobService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateJobBody = {
  inputPayload?: unknown;
};

function extractSessionId(pathname: string): string {
  const parts = pathname.split('/');
  const marker = parts.indexOf('sessions');
  if (marker < 0) return '';
  return parts[marker + 1] ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isGradPlanV3LiveJobsEnabled()) {
      return NextResponse.json(
        { success: false, error: 'V3 live jobs are disabled' },
        { status: 403 }
      );
    }

    const sessionId = extractSessionId(request.nextUrl.pathname);
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateJobBody;
    const inputPayload =
      body.inputPayload && typeof body.inputPayload === 'object' && !Array.isArray(body.inputPayload)
        ? (body.inputPayload as Record<string, unknown>)
        : undefined;

    const { job, reused } = await createOrReuseV3GenerationJob({
      userId: user.id,
      sessionId,
      inputPayload,
    });

    after(async () => {
      try {
        await triggerV3GenerationJob(job.id);
      } catch (error) {
        console.error('Failed to trigger v3 generation job:', error);
      }
    });

    return NextResponse.json(
      {
        success: true,
        reused,
        jobId: job.id,
        job,
      },
      { status: reused ? 200 : 202 }
    );
  } catch (error) {
    console.error('Error creating v3 generation job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create v3 generation job',
      },
      { status: 500 }
    );
  }
}
