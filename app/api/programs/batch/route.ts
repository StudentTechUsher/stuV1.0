import { NextRequest, NextResponse } from 'next/server';
import {
  fetchProgramsBatch,
  ProgramFetchError,
} from '@/lib/services/programService';
import { logError } from '@/lib/logger';

// GET /api/programs/batch?ids=1,2,3&universityId=123
export async function GET(request: NextRequest) {
  return handleGetProgramsBatch(request);
}

async function handleGetProgramsBatch(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const universityIdStr = searchParams.get('universityId');

    if (!idsParam) {
      return NextResponse.json({ error: 'Missing required parameter: ids' }, { status: 400 });
    }

    const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
    }

    const universityId = universityIdStr ? Number(universityIdStr) : undefined;

    // Fetch programs using service layer
    const programs = await fetchProgramsBatch(ids, universityId);

    return NextResponse.json(programs);
  } catch (error) {
    if (error instanceof ProgramFetchError) {
      logError('Failed to fetch programs batch', error, {
        action: 'fetch_programs_batch',
      });
      return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
    }

    logError('Unexpected error fetching programs batch', error, {
      action: 'fetch_programs_batch',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}