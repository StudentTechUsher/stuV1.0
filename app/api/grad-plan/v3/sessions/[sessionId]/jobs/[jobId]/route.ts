import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { getV3GenerationJobSnapshot } from '@/lib/services/gradPlanV3GenerationJobService';

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

export async function GET(request: NextRequest) {
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

    const job = await getV3GenerationJobSnapshot({
      jobId,
      userId: user.id,
      sessionId,
    });

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error) {
    console.error('Error reading v3 generation job snapshot:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch v3 generation job',
      },
      { status: 500 }
    );
  }
}
