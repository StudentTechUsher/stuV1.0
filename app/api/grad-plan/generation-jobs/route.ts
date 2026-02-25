import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import {
  createOrReuseGenerationJob,
  triggerGenerationJob,
} from '@/lib/services/gradPlanGenerationJobService';
import { runMastraWorkflowSmokeCheck } from '@/lib/mastra/workflows/smokeCheck';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateJobBody = {
  conversationId?: unknown;
  inputPayload?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      await runMastraWorkflowSmokeCheck();
    }

    const body = (await request.json()) as CreateJobBody;
    const conversationId = typeof body.conversationId === 'string'
      ? body.conversationId.trim()
      : '';
    const inputPayload = body.inputPayload;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'conversationId is required' },
        { status: 400 }
      );
    }

    if (!inputPayload || typeof inputPayload !== 'object' || Array.isArray(inputPayload)) {
      return NextResponse.json(
        { success: false, error: 'inputPayload must be an object' },
        { status: 400 }
      );
    }

    const { job, reused } = await createOrReuseGenerationJob({
      userId: user.id,
      conversationId,
      inputPayload: inputPayload as Record<string, unknown>,
    });

    void triggerGenerationJob(job.id).catch(error => {
      console.error('Generation worker trigger failed:', error);
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        reused,
        job,
      },
      { status: reused ? 200 : 202 }
    );
  } catch (error) {
    console.error('Error creating grad plan generation job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create generation job',
      },
      { status: 500 }
    );
  }
}
