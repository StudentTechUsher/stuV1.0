import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { requestGenerationJobCancel } from '@/lib/services/gradPlanGenerationJobService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractJobId(pathname: string): string {
  const parts = pathname.split('/');
  const marker = parts.indexOf('generation-jobs');
  if (marker < 0) return '';
  return parts[marker + 1] ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const jobId = extractJobId(request.nextUrl.pathname);
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId is required' },
        { status: 400 }
      );
    }

    const job = await requestGenerationJobCancel({
      jobId,
      userId: user.id,
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error canceling generation job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel generation job',
      },
      { status: 500 }
    );
  }
}

