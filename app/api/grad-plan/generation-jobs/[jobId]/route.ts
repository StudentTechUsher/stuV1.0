import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { getGenerationJobSnapshot } from '@/lib/services/gradPlanGenerationJobService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractJobId(pathname: string): string {
  const parts = pathname.split('/');
  const marker = parts.indexOf('generation-jobs');
  if (marker < 0) return '';
  return parts[marker + 1] ?? '';
}

export async function GET(request: NextRequest) {
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

    const job = await getGenerationJobSnapshot({ jobId, userId: user.id });
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
    console.error('Error reading generation job snapshot:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch generation job',
      },
      { status: 500 }
    );
  }
}

