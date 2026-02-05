import { NextRequest, NextResponse } from 'next/server';
import { getCourseOfferingsForCourse, checkSectionConflicts } from '@/lib/mastra/tools/courseSelectionTools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, termName, courseCode, sectionId, calendarEvents } = body;

    // Validate inputs
    if (!universityId || !termName || !courseCode || !sectionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST API] Testing checkSectionConflicts:', {
      universityId,
      termName,
      courseCode,
      sectionId,
      sectionIdType: typeof sectionId,
      calendarEventCount: calendarEvents?.length || 0,
    });

    // First, fetch the course sections to find the specific section
    const sections = await getCourseOfferingsForCourse(
      universityId,
      termName,
      courseCode
    );

    console.log('🔍 [TEST API] Available sections:', {
      count: sections.length,
      sections: sections.map(s => ({
        offering_id: s.offering_id,
        section_label: s.section_label,
        instructor: s.instructor
      }))
    });

    // Search by section_label (e.g., "001", "002") OR offering_id
    const sectionIdStr = String(sectionId).trim();
    let section = sections.find(s => s.section_label === sectionIdStr);

    // If not found by label, try by offering_id (numeric)
    if (!section && !isNaN(Number(sectionIdStr))) {
      const numericId = parseInt(sectionIdStr, 10);
      section = sections.find(s => s.offering_id === numericId);
    }

    // If still not found, try padding the input (e.g., "1" -> "001")
    if (!section && !isNaN(Number(sectionIdStr))) {
      const paddedLabel = sectionIdStr.padStart(3, '0');
      section = sections.find(s => s.section_label === paddedLabel);
      console.log(`🔍 [TEST API] Tried padded label "${paddedLabel}":`, !!section);
    }

    console.log('🔍 [TEST API] Section search result:', {
      searchTerm: sectionIdStr,
      found: !!section,
      foundSection: section ? {
        offering_id: section.offering_id,
        section_label: section.section_label
      } : null
    });

    if (!section) {
      return NextResponse.json(
        {
          error: `Section "${sectionIdStr}" not found for course ${courseCode}`,
          hint: 'Enter section label (e.g., "001") or offering ID',
          availableSections: sections.map(s => ({
            section_label: s.section_label,
            offering_id: s.offering_id,
            instructor: s.instructor
          }))
        },
        { status: 404 }
      );
    }

    // Check conflicts
    const conflictCheck = await checkSectionConflicts(
      section,
      calendarEvents || [],
      {} // Empty preferences for basic conflict check
    );

    return NextResponse.json({
      success: true,
      section: {
        id: section.offering_id,
        label: section.section_label,
        instructor: section.instructor,
      },
      conflictCheck,
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
