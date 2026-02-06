import { NextRequest, NextResponse } from 'next/server';
import { analyzeCourseSections } from '@/lib/mastra/tools/courseSelectionTools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, termName, courseCodes, calendarEvents, preferences } = body;

    // Validate inputs
    if (!universityId || !termName || !courseCodes) {
      return NextResponse.json(
        { error: 'Missing required fields: universityId, termName, courseCodes' },
        { status: 400 }
      );
    }

    if (!Array.isArray(courseCodes) || courseCodes.length === 0) {
      return NextResponse.json(
        { error: 'courseCodes must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log('🧪 [TEST API] Testing analyzeCourseSections:', {
      universityId,
      termName,
      courseCount: courseCodes.length,
      courses: courseCodes,
      calendarEventCount: calendarEvents?.length || 0,
    });

    // Analyze all courses
    const analyses = await analyzeCourseSections(
      universityId,
      termName,
      courseCodes,
      calendarEvents || [],
      preferences || {}
    );

    // Format results for display
    const formattedResults = analyses.map(analysis => ({
      courseCode: analysis.courseCode,
      courseName: analysis.courseName,
      totalSections: analysis.sections.length,
      sectionsWithConflicts: analysis.sections.filter(s => s.conflicts.hasConflict).length,
      sectionsWithoutConflicts: analysis.sections.filter(s => !s.conflicts.hasConflict).length,
      allHaveConflicts: analysis.allHaveConflicts,
      bestSection: analysis.bestSection ? {
        section_label: analysis.bestSection.section_label,
        instructor: analysis.bestSection.instructor,
        days: analysis.bestSection.parsedMeetings?.[0]?.days,
        time: analysis.bestSection.parsedMeetings?.[0]
          ? `${analysis.bestSection.parsedMeetings[0].startTime} - ${analysis.bestSection.parsedMeetings[0].endTime}`
          : 'No meetings',
        score: analysis.bestSection.ranking.score,
        recommended: analysis.bestSection.ranking.recommended,
      } : null,
      sections: analysis.sections.map(s => ({
        section_label: s.section_label,
        instructor: s.instructor,
        days: s.parsedMeetings?.[0]?.days,
        time: s.parsedMeetings?.[0]
          ? `${s.parsedMeetings[0].startTime} - ${s.parsedMeetings[0].endTime}`
          : 'No meetings',
        hasConflict: s.conflicts.hasConflict,
        conflictCount: s.conflicts.conflicts.length,
        score: s.ranking.score,
        originalScore: s.ranking.originalScore,
        recommended: s.ranking.recommended,
        conflicts: s.conflicts.conflicts.map(c => ({
          type: c.conflictType,
          message: c.message,
          conflictingWith: c.conflictingEvent.title,
        })),
      })),
    }));

    return NextResponse.json({
      success: true,
      analyses: formattedResults,
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
