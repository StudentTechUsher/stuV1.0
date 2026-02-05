import { NextRequest, NextResponse } from 'next/server';
import { addCourseSelection } from '@/lib/mastra/tools/courseSelectionTools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      scheduleId,
      courseCode,
      primaryOfferingId,
      backup1OfferingId,
      backup2OfferingId,
      isWaitlisted,
    } = body;

    // Validate inputs
    if (!scheduleId || !courseCode || !primaryOfferingId) {
      return NextResponse.json(
        { error: 'Missing required fields: scheduleId, courseCode, primaryOfferingId' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST API] Testing addCourseSelection:', {
      scheduleId,
      courseCode,
      primaryOfferingId,
      backup1OfferingId,
      backup2OfferingId,
      isWaitlisted,
    });

    // Add the course selection
    const result = await addCourseSelection({
      scheduleId,
      courseCode,
      primaryOfferingId,
      backup1OfferingId,
      backup2OfferingId,
      isWaitlisted: isWaitlisted || false,
    });

    return NextResponse.json({
      success: result.success,
      selectionId: result.selectionId,
      error: result.error,
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
