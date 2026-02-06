import { NextRequest, NextResponse } from 'next/server';
import { analyzeCourseSections, type CourseAnalysis } from '@/lib/mastra/tools/courseSelectionTools';
import type { SchedulerEvent } from '@/lib/mastra/types';
import type { SchedulePreferences } from '@/lib/services/scheduleService';
import type { CourseAnalysisData } from '@/components/scheduler/analysis/CourseAnalysisResults';

/**
 * POST /api/test-scheduler-tools/analyze-sections
 * Analyzes sections for a single course against calendar and preferences
 */
export async function POST(request: NextRequest) {
  return handleAnalyzeSections(request);
}

async function handleAnalyzeSections(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityId, termName, courseCode, calendarEvents, preferences } = body;

    console.log('🔍 [analyze-sections API] Request:', {
      universityId,
      termName,
      courseCode,
      calendarEventCount: calendarEvents?.length,
    });

    // Validate inputs
    if (!universityId || !termName || !courseCode) {
      return NextResponse.json(
        { error: 'Missing required fields: universityId, termName, courseCode' },
        { status: 400 }
      );
    }

    // Convert CalendarEvent[] to SchedulerEvent[]
    const schedulerEvents: SchedulerEvent[] = (calendarEvents || []).map((evt: {
      id: string;
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      location?: string;
      category?: string;
    }) => ({
      id: evt.id,
      title: evt.title,
      dayOfWeek: evt.dayOfWeek,
      startTime: evt.startTime,
      endTime: evt.endTime,
      location: evt.location,
      category: evt.category as 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Other' | 'Course',
    }));

    // Call analyzeCourseSections (single course)
    const analyses: CourseAnalysis[] = await analyzeCourseSections(
      universityId,
      termName,
      [courseCode],
      schedulerEvents,
      preferences as SchedulePreferences || {}
    );

    if (analyses.length === 0) {
      return NextResponse.json(
        { error: 'No sections found for course' },
        { status: 404 }
      );
    }

    const courseAnalysis = analyses[0];

    // Convert to CourseAnalysisData format expected by CourseAnalysisResults component
    const result: CourseAnalysisData = {
      courseCode: courseAnalysis.courseCode,
      courseName: courseAnalysis.courseName,
      totalSections: courseAnalysis.sections.length,
      sectionsWithConflicts: courseAnalysis.sections.filter(s => s.conflicts.hasConflict).length,
      sectionsWithoutConflicts: courseAnalysis.sections.filter(s => !s.conflicts.hasConflict).length,
      allHaveConflicts: courseAnalysis.allHaveConflicts,
      bestSection: courseAnalysis.bestSection ? convertSection(courseAnalysis.bestSection) : null,
      sections: courseAnalysis.sections.map(convertSection),
    };

    console.log('✅ [analyze-sections API] Analysis complete:', {
      courseCode: result.courseCode,
      totalSections: result.totalSections,
      sectionsWithConflicts: result.sectionsWithConflicts,
    });

    return NextResponse.json({ analysis: result });
  } catch (error) {
    console.error('❌ [analyze-sections API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze sections' },
      { status: 500 }
    );
  }
}

// Helper to convert AnalyzedSection to SectionAnalysis format
function convertSection(section: CourseAnalysis['sections'][0]) {
  // Extract meeting info for display
  const firstMeeting = section.parsedMeetings?.[0];
  const days = firstMeeting?.days || '';
  const time = firstMeeting ? `${firstMeeting.startTime} - ${firstMeeting.endTime}` : '';

  return {
    section_label: section.section_label,
    instructor: section.instructor || 'TBA',
    days,
    time,
    location: section.location_raw || firstMeeting?.location,
    hasConflict: section.conflicts.hasConflict,
    conflictCount: section.conflicts.conflicts.length,
    score: section.ranking.score,
    originalScore: section.ranking.originalScore,
    recommended: section.ranking.recommended,
    conflicts: section.conflicts.conflicts.map(c => ({
      conflictType: c.conflictType,
      message: c.message,
      conflictingWith: c.conflictingEvent.title,
    })),
  };
}
