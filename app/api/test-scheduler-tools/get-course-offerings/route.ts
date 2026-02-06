import { NextRequest, NextResponse } from 'next/server';
import { validateCoursesForScheduling } from '@/lib/mastra/tools/courseSelectionTools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, termName, courseCodes } = body;

    // Validate inputs
    if (!universityId || !termName || !courseCodes) {
      return NextResponse.json(
        { error: 'Missing required fields: universityId, termName, courseCodes (array)' },
        { status: 400 }
      );
    }

    if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
      return NextResponse.json(
        { error: 'courseCodes must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST API] Testing validateCoursesForScheduling:', {
      universityId,
      termName,
      courseCount: courseCodes.length,
      courses: courseCodes,
    });

    // Call the validation tool
    const results = await validateCoursesForScheduling(
      universityId,
      termName,
      courseCodes
    );

    // Group results by status
    const available = results.filter(r => r.status === 'available');
    const notInTerm = results.filter(r => r.status === 'not_in_term');
    const notFound = results.filter(r => r.status === 'not_found');

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        available: available.length,
        needsRescheduling: notInTerm.length,
        notFound: notFound.length,
      },
      results: {
        available,
        notInTerm,
        notFound,
      },
      allResults: results,
    });
  } catch (error) {
    console.error('❌ [TEST API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
