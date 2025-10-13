import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPrograms,
  ProgramFetchError,
} from '@/lib/services/programService';
import { logError } from '@/lib/logger';

// GET /api/programs?type=minor|major&universityId=123
export async function GET(request: NextRequest) {
  return handleGetPrograms(request);
}

async function handleGetPrograms(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined; // major | minor | emphasis | etc
    const universityIdStr = searchParams.get('universityId');
    const universityId = universityIdStr ? Number(universityIdStr) : undefined;

    // Fetch programs using service layer
    const programs = await fetchPrograms({ type, universityId });

    return NextResponse.json(programs);
  } catch (error) {
    if (error instanceof ProgramFetchError) {
      logError('Failed to fetch programs', error, {
        action: 'fetch_programs',
      });
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    logError('Unexpected error fetching programs', error, {
      action: 'fetch_programs',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
