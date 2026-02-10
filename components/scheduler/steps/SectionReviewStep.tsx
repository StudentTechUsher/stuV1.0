'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CalendarEvent } from '@/components/scheduler/test/InteractiveCalendar';
import type { SchedulerEvent } from '@/components/scheduler/scheduler-calendar';
import { CourseAnalysisResults, type SectionSelection } from '@/components/scheduler/analysis/CourseAnalysisResults';
import type { CourseAnalysisData, SectionAnalysis } from '@/components/scheduler/analysis/CourseAnalysisResults';
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
  onPreviewEventsChange?: (events: SchedulerEvent[]) => void;
  onNext: () => void;
  onBack: () => void;
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
  onCalendarChange: _onCalendarChange,
  onPreviewEventsChange,
  onNext,
  onBack,
}: SectionReviewStepProps) {
  const [analyses, setAnalyses] = useState<CourseAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<SectionSelection[]>(existingSelections);
  const [selectedSectionDetails, setSelectedSectionDetails] = useState<Record<string, SectionAnalysis>>({});
  const [availableCourseCodes, setAvailableCourseCodes] = useState<string[]>(courseCodes);
  const [isValidatingCourses, setIsValidatingCourses] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<{
    notInTerm: Array<{ courseCode: string; availableIn?: string }>;
    notFound: Array<{ courseCode: string }>;
  } | null>(null);
  const [wantsBackups, setWantsBackups] = useState<boolean | null>(null);

  // Track previous calendar state to prevent infinite loops
  const previousCalendarRef = useRef<string>('');

  // Validate course availability before analyzing sections
  useEffect(() => {
    let isActive = true;

    const validateCourses = async () => {
      if (!courseCodes || courseCodes.length === 0) {
        setAvailableCourseCodes([]);
        setValidationSummary(null);
        return;
      }

      setIsValidatingCourses(true);
      setValidationError(null);

      try {
        const response = await fetch('/api/test-scheduler-tools/get-course-offerings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            universityId,
            termName,
            courseCodes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to validate course availability');
        }

        const data = await response.json();

        if (!isActive) return;

        const available = (data?.results?.available || []).map((result: { courseCode: string }) => result.courseCode);
        const notInTerm = (data?.results?.notInTerm || []).map((result: { courseCode: string; availableIn?: string }) => ({
          courseCode: result.courseCode,
          availableIn: result.availableIn,
        }));
        const notFound = (data?.results?.notFound || []).map((result: { courseCode: string }) => ({
          courseCode: result.courseCode,
        }));

        setAvailableCourseCodes(available);
        setValidationSummary({ notInTerm, notFound });
      } catch (err) {
        console.error('❌ [SectionReviewStep] Course validation error:', err);
        if (isActive) {
          setValidationError(err instanceof Error ? err.message : 'Failed to validate courses');
          setAvailableCourseCodes(courseCodes);
          setValidationSummary(null);
        }
      } finally {
        if (isActive) {
          setIsValidatingCourses(false);
        }
      }
    };

    validateCourses();

    return () => {
      isActive = false;
    };
  }, [courseCodes, termName, universityId]);

  // Auto-trigger analysis when calendar changes (but filter out "Course" events first)
  useEffect(() => {
    if (isValidatingCourses) return;

    const nonCourseEvents = calendarEvents.filter(e => e.category !== 'Course');
    const newCalendarState = JSON.stringify(
      {
        events: nonCourseEvents.map(event => ({
          title: event.title,
          dayOfWeek: event.dayOfWeek,
          startTime: event.startTime,
          endTime: event.endTime,
          category: event.category,
          location: event.location,
        })),
        courses: availableCourseCodes,
      }
    );

    if (newCalendarState !== previousCalendarRef.current) {
      previousCalendarRef.current = newCalendarState;
      handleAnalyzeAllCourses(nonCourseEvents, availableCourseCodes);
    }
  }, [calendarEvents, availableCourseCodes, isValidatingCourses]);

  const handleAnalyzeAllCourses = async (eventsToCheck: CalendarEvent[], coursesToAnalyze: string[]) => {
    if (!coursesToAnalyze || coursesToAnalyze.length === 0) {
      setAnalyses([]);
      return;
    }

    console.log('🔍 [SectionReviewStep] Starting analysis for all courses:', coursesToAnalyze);
    setIsLoading(true);
    setError(null);

    try {
      const allAnalyses: CourseAnalysisData[] = [];

      for (const courseCode of coursesToAnalyze) {
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

  const parseSectionDays = (days: string): number[] => {
    const dayMap: Record<string, number> = {
      'M': 1,
      'T': 2,
      'W': 3,
      'Th': 4,
      'R': 4,
      'F': 5,
      'S': 6,
      'U': 7,
    };

    const result: number[] = [];
    const seen = new Set<number>();
    let i = 0;

    while (i < days.length) {
      if (i < days.length - 1 && days.substring(i, i + 2) === 'Th') {
        const day = dayMap['Th'];
        if (!seen.has(day)) {
          seen.add(day);
          result.push(day);
        }
        i += 2;
        continue;
      }

      const char = days[i];
      const mapped = dayMap[char];
      if (mapped && !seen.has(mapped)) {
        seen.add(mapped);
        result.push(mapped);
      }
      i += 1;
    }

    return result;
  };

  const parseSectionTimeRange = (timeStr: string): { startTime: string; endTime: string } | null => {
    const timeMatch = timeStr.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
    if (!timeMatch) return null;

    return {
      startTime: normalizeTime(timeMatch[1]),
      endTime: normalizeTime(timeMatch[2]),
    };
  };

  const getSelectionKey = (courseCode: string, sectionLabel: string) => `${courseCode}__${sectionLabel}`;

  const buildPreviewEvents = (
    currentSelections: SectionSelection[],
    currentAnalyses: CourseAnalysisData[]
  ): SchedulerEvent[] => {
    const previewEvents: SchedulerEvent[] = [];

    currentSelections.forEach(selection => {
      const selectionKey = getSelectionKey(selection.courseCode, selection.sectionLabel);
      const sectionFromCache = selectedSectionDetails[selectionKey];
      const analysis = currentAnalyses.find(a => a.courseCode === selection.courseCode);
      const section = sectionFromCache || analysis?.sections.find(s => s.section_label === selection.sectionLabel);

      if (!section || !section.days || !section.time) return;

      const days = parseSectionDays(section.days);
      const timeRange = parseSectionTimeRange(section.time);

      if (!timeRange || days.length === 0) return;

      days.forEach(dayOfWeek => {
        previewEvents.push({
          id: `preview-${selection.courseCode}-${selection.sectionLabel}-${selection.rank}-${dayOfWeek}`,
          title: `${selection.courseCode} (${section.section_label})`,
          dayOfWeek,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime,
          type: 'class',
          status: 'planned',
          isUnofficial: true,
          course_code: selection.courseCode,
          section: section.section_label,
          professor: section.instructor,
          location: section.location,
        });
      });
    });

    return previewEvents;
  };

  useEffect(() => {
    if (!onPreviewEventsChange) return;
    onPreviewEventsChange(buildPreviewEvents(selections, analyses));
  }, [analyses, selections, onPreviewEventsChange, selectedSectionDetails]);

  const primarySelections = selections.filter(s => s.rank === 'primary');
  const coursesWithPrimary = new Set(primarySelections.map(s => s.courseCode));
  const allCoursesHavePrimary =
    availableCourseCodes.length > 0 &&
    availableCourseCodes.every(code => coursesWithPrimary.has(code));
  const coursesWithPrimaryCount = coursesWithPrimary.size;

  const clearBackupSelections = (nextSelections?: SectionSelection[]) => {
    const filteredSelections = (nextSelections || selections).filter(s => s.rank === 'primary');
    setSelections(filteredSelections);
    onSelectionsChange(filteredSelections);
    onPreviewEventsChange?.(buildPreviewEvents(filteredSelections, analyses));
  };

  useEffect(() => {
    if (allCoursesHavePrimary) return;

    if (wantsBackups !== null) {
      setWantsBackups(null);
    }

    if (selections.some(s => s.rank !== 'primary')) {
      clearBackupSelections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCoursesHavePrimary]);

  const handleSelectSection = (courseCode: string, sectionLabel: string, rank: 'primary' | 'backup1' | 'backup2') => {
    console.log(`📌 [SectionReviewStep] Selecting ${courseCode} ${sectionLabel} as ${rank}`);

    // Update selections
    const newSelections = [
      ...selections.filter(s => s.courseCode !== courseCode || s.rank !== rank),
      { courseCode, sectionLabel, rank },
    ];

    const analysis = analyses.find(a => a.courseCode === courseCode);
    const section = analysis?.sections.find(s => s.section_label === sectionLabel);
    if (section) {
      const selectionKey = getSelectionKey(courseCode, sectionLabel);
      setSelectedSectionDetails(prev => ({ ...prev, [selectionKey]: section }));
    }

    setSelections(newSelections);
    onSelectionsChange(newSelections);
    onPreviewEventsChange?.(buildPreviewEvents(newSelections, analyses));
  };

  const handleDeselectSection = (courseCode: string, sectionLabel: string) => {
    console.log(`🗑️ [SectionReviewStep] Deselecting ${courseCode} ${sectionLabel}`);

    // Remove from selections
    const newSelections = selections.filter(
      s => !(s.courseCode === courseCode && s.sectionLabel === sectionLabel)
    );

    const selectionKey = getSelectionKey(courseCode, sectionLabel);
    setSelectedSectionDetails(prev => {
      if (!prev[selectionKey]) return prev;
      const { [selectionKey]: _removed, ...rest } = prev;
      return rest;
    });

    setSelections(newSelections);
    onSelectionsChange(newSelections);
    onPreviewEventsChange?.(buildPreviewEvents(newSelections, analyses));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Review & Select Sections
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose your preferred sections for each course. Conflicts are analyzed against your saved calendar events.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {validationError && (
        <Alert severity="error" onClose={() => setValidationError(null)}>
          {validationError}
        </Alert>
      )}

      {isValidatingCourses && (
        <Alert severity="info">
          Validating course availability for {termName}...
        </Alert>
      )}

      {validationSummary && (validationSummary.notInTerm.length > 0 || validationSummary.notFound.length > 0) && (
        <Alert severity="warning">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {validationSummary.notInTerm.length > 0 && (
              <Typography variant="body2">
                Not in term: {validationSummary.notInTerm
                  .map(item => item.availableIn ? `${item.courseCode} (offered in ${item.availableIn})` : item.courseCode)
                  .join(', ')}
              </Typography>
            )}
            {validationSummary.notFound.length > 0 && (
              <Typography variant="body2">
                Not found: {validationSummary.notFound.map(item => item.courseCode).join(', ')}
              </Typography>
            )}
            <Typography variant="body2">
              These courses were skipped during section analysis.
            </Typography>
          </Box>
        </Alert>
      )}

      {allCoursesHavePrimary && wantsBackups === null && (
        <Alert severity="info">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              All primary sections selected. Do you want to add backups?
            </Typography>
            <Typography variant="body2">
              Backups are optional and should be different sections than your primary choice.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => setWantsBackups(true)}
                sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
              >
                Yes, add backups
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setWantsBackups(false);
                  clearBackupSelections();
                }}
              >
                No, skip backups
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {allCoursesHavePrimary && wantsBackups === false && (
        <Alert severity="success">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Backup selection skipped.
            </Typography>
            <Button
              variant="text"
              size="small"
              onClick={() => setWantsBackups(true)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add backups anyway
            </Button>
          </Box>
        </Alert>
      )}

      {/* Section Analysis */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: '600px' }}>
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
              Analyzing sections for {availableCourseCodes.length} course{availableCourseCodes.length > 1 ? 's' : ''}...
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
              allowBackups={allCoursesHavePrimary && wantsBackups === true}
            />
          </Box>
        )}
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
            variant="contained"
            endIcon={<ArrowRight size={18} />}
            onClick={onNext}
            disabled={!allCoursesHavePrimary || (allCoursesHavePrimary && wantsBackups === null)}
            sx={{
              bgcolor: '#06C96C',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Finish Schedule
          </Button>
        </Box>
      </Box>

      {/* Progress Warning */}
      {!allCoursesHavePrimary && (
        <Alert severity="warning">
          Please select a primary section for all {availableCourseCodes.length} courses before continuing.
          ({coursesWithPrimaryCount}/{availableCourseCodes.length} completed)
        </Alert>
      )}
    </Box>
  );
}
