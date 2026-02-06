'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { InteractiveCalendar, type CalendarEvent } from '@/components/scheduler/test/InteractiveCalendar';
import { CourseAnalysisResults, type SectionSelection } from '@/components/scheduler/analysis/CourseAnalysisResults';
import type { CourseAnalysisData } from '@/components/scheduler/analysis/CourseAnalysisResults';
import { SchedulePreferences } from '@/lib/services/scheduleService';

interface SectionReviewStepProps {
  termName: string;
  universityId: number;
  scheduleId: string;
  courseCodes: string[];
  calendarEvents: CalendarEvent[];
  preferences: SchedulePreferences;
  existingSelections: SectionSelection[];
  onSelectionsChange: (selections: SectionSelection[]) => void;
  onCalendarChange: (events: CalendarEvent[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function SectionReviewStep({
  termName,
  universityId,
  scheduleId,
  courseCodes,
  calendarEvents,
  preferences,
  existingSelections,
  onSelectionsChange,
  onCalendarChange,
  onNext,
  onBack,
  onSkip,
}: SectionReviewStepProps) {
  const [analyses, setAnalyses] = useState<CourseAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<SectionSelection[]>(existingSelections);

  // Track previous calendar state to prevent infinite loops
  const previousCalendarRef = useRef<string>('');

  // Auto-trigger analysis when calendar changes (but filter out "Course" events first)
  useEffect(() => {
    const nonCourseEvents = calendarEvents.filter(e => e.category !== 'Course');
    const newCalendarState = JSON.stringify(nonCourseEvents);

    if (newCalendarState !== previousCalendarRef.current) {
      previousCalendarRef.current = newCalendarState;
      handleAnalyzeAllCourses(nonCourseEvents);
    }
  }, [calendarEvents]);

  // Auto-run analysis on mount
  useEffect(() => {
    const nonCourseEvents = calendarEvents.filter(e => e.category !== 'Course');
    handleAnalyzeAllCourses(nonCourseEvents);
  }, []);

  const handleAnalyzeAllCourses = async (eventsToCheck: CalendarEvent[]) => {
    console.log('🔍 [SectionReviewStep] Starting analysis for all courses:', courseCodes);
    setIsLoading(true);
    setError(null);

    try {
      const allAnalyses: CourseAnalysisData[] = [];

      for (const courseCode of courseCodes) {
        console.log(`🔍 [SectionReviewStep] Analyzing ${courseCode}...`);

        const response = await fetch('/api/test-scheduler-tools/analyze-sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            universityId,
            termName,
            courseCode,
            calendarEvents: eventsToCheck, // Exclude "Course" category events
            preferences,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze sections');
        }

        const data = await response.json();
        console.log(`✅ [SectionReviewStep] Analysis complete for ${courseCode}:`, data.analysis);

        allAnalyses.push(data.analysis);
      }

      setAnalyses(allAnalyses);
      console.log('✅ [SectionReviewStep] All analyses complete:', allAnalyses.length);
    } catch (error) {
      console.error('❌ [SectionReviewStep] Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze sections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSection = (courseCode: string, sectionLabel: string, rank: 'primary' | 'backup1' | 'backup2') => {
    console.log(`📌 [SectionReviewStep] Selecting ${courseCode} ${sectionLabel} as ${rank}`);

    // Update selections
    const newSelections = [
      ...selections.filter(s => s.courseCode !== courseCode || s.rank !== rank),
      { courseCode, sectionLabel, rank },
    ];
    setSelections(newSelections);
    onSelectionsChange(newSelections);

    // Add to calendar
    const analysis = analyses.find(a => a.courseCode === courseCode);
    const section = analysis?.sections.find(s => s.section_label === sectionLabel);

    if (section && section.days && section.time) {
      // Parse days and time to create calendar events
      const daysMap: Record<string, number> = {
        'M': 1, 'T': 2, 'W': 3, 'Th': 4, 'R': 4, 'F': 5, 'S': 6
      };

      // Parse days (e.g., "MWF" -> [1, 3, 5])
      const days: number[] = [];
      let i = 0;
      while (i < section.days.length) {
        if (i < section.days.length - 1 && section.days.substring(i, i + 2) === 'Th') {
          days.push(daysMap['Th']);
          i += 2;
        } else {
          const char = section.days[i];
          if (daysMap[char]) {
            days.push(daysMap[char]);
          }
          i += 1;
        }
      }

      // Parse time (e.g., "09:00 - 10:30" or "9:00 AM - 10:30 AM")
      const timeMatch = section.time.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
      if (timeMatch) {
        const startTime = normalizeTime(timeMatch[1]);
        const endTime = normalizeTime(timeMatch[2]);

        // Create calendar events for each day
        const newCalendarEvents = days.map(dayOfWeek => ({
          id: `course-${courseCode}-${sectionLabel}-${dayOfWeek}-${Date.now()}-${Math.random()}`,
          title: `${courseCode} (${section.section_label})`,
          dayOfWeek,
          startTime,
          endTime,
          location: section.location || undefined,
          category: 'Course' as const,
          backgroundColor: '#ef4444',
          textColor: '#ffffff',
        }));

        // Update calendar (remove old events for this course, add new ones)
        const updatedCalendar = [
          ...calendarEvents.filter(e => !(e.category === 'Course' && e.title.startsWith(courseCode))),
          ...newCalendarEvents,
        ];

        onCalendarChange(updatedCalendar);
      }
    }
  };

  const handleDeselectSection = (courseCode: string, sectionLabel: string) => {
    console.log(`🗑️ [SectionReviewStep] Deselecting ${courseCode} ${sectionLabel}`);

    // Remove from selections
    const newSelections = selections.filter(
      s => !(s.courseCode === courseCode && s.sectionLabel === sectionLabel)
    );
    setSelections(newSelections);
    onSelectionsChange(newSelections);

    // Remove from calendar
    const updatedCalendar = calendarEvents.filter(
      e => !(e.category === 'Course' && e.title.startsWith(courseCode))
    );
    onCalendarChange(updatedCalendar);
  };

  // Helper to normalize time format (handle both 12-hour and 24-hour)
  const normalizeTime = (timeStr: string): string => {
    const trimmed = timeStr.trim();

    // Already in 24-hour format (HH:MM)
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [hours, minutes] = trimmed.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }

    // 12-hour format with AM/PM
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      console.warn(`⚠️ Unable to parse time: "${timeStr}"`);
      return trimmed;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Check if all courses have primary selections
  const primarySelections = selections.filter(s => s.rank === 'primary');
  const coursesWithPrimary = new Set(primarySelections.map(s => s.courseCode)).size;
  const allCoursesHavePrimary = coursesWithPrimary === courseCodes.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Review & Select Sections
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose your preferred sections for each course. Adjust your calendar to see how conflicts change in real-time.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Side-by-Side Layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: 3, minHeight: '600px' }}>
        {/* Left Panel: Calendar */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Your Calendar
          </Typography>
          <InteractiveCalendar
            events={calendarEvents}
            onChange={onCalendarChange}
            compact
          />
        </Box>

        {/* Right Panel: Section Analysis */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Section Analysis
            </Typography>
            {isLoading && <CircularProgress size={20} />}
          </Box>

          {isLoading && analyses.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Analyzing sections for {courseCodes.length} course{courseCodes.length > 1 ? 's' : ''}...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowY: 'auto', maxHeight: '700px', pr: 1 }}>
              <CourseAnalysisResults
                analyses={analyses}
                compact
                selections={selections}
                onSelectSection={handleSelectSection}
                onDeselectSection={handleDeselectSection}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid var(--border)' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={18} />}
          onClick={onBack}
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SkipForward size={18} />}
            onClick={onSkip}
          >
            Skip to AI
          </Button>

          <Button
            variant="contained"
            endIcon={<ArrowRight size={18} />}
            onClick={onNext}
            disabled={!allCoursesHavePrimary}
            sx={{
              bgcolor: '#06C96C',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Continue to AI
          </Button>
        </Box>
      </Box>

      {/* Progress Warning */}
      {!allCoursesHavePrimary && (
        <Alert severity="warning">
          Please select a primary section for all {courseCodes.length} courses before continuing.
          ({coursesWithPrimary}/{courseCodes.length} completed)
        </Alert>
      )}
    </Box>
  );
}
