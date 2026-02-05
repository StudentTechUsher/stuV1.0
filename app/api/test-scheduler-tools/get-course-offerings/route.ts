import { NextRequest, NextResponse } from 'next/server';
import { getCourseOfferingsForCourse } from '@/lib/mastra/tools/courseSelectionTools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, termName, courseCode } = body;

    // Validate inputs
    if (!universityId || !termName || !courseCode) {
      return NextResponse.json(
        { error: 'Missing required fields: universityId, termName, courseCode' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST API] Testing getCourseOfferingsForCourse:', {
      universityId,
      termName,
      courseCode,
    });

    // Call the tool
    const sections = await getCourseOfferingsForCourse(
      universityId,
      termName,
      courseCode
    );

    return NextResponse.json({
      success: true,
      sections,
      count: sections.length,
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
