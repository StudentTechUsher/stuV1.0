import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAvailableStudentTypes,
  ProgramFetchError,
} from '@/lib/services/programService';
import { logError } from '@/lib/logger';

// GET /api/programs/student-types?universityId=123
export async function GET(request: NextRequest) {
  return handleGetAvailableStudentTypes(request);
}

async function handleGetAvailableStudentTypes(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const universityIdStr = searchParams.get('universityId');

    if (!universityIdStr) {
      return NextResponse.json(
        { error: 'universityId parameter is required' },
        { status: 400 }
      );
    }

    const universityId = Number(universityIdStr);

    if (isNaN(universityId)) {
      return NextResponse.json(
        { error: 'universityId must be a valid number' },
        { status: 400 }
      );
    }

    const studentTypes = await fetchAvailableStudentTypes(universityId);

    return NextResponse.json(studentTypes);
  } catch (error) {
    if (error instanceof ProgramFetchError) {
      logError('Failed to fetch available student types', error, {
        action: 'fetch_student_types',
      });
      return NextResponse.json(
        { error: 'Failed to fetch available student types' },
        { status: 500 }
      );
    }

    logError('Unexpected error fetching available student types', error, {
      action: 'fetch_student_types',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
