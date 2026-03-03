'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from '@mui/material';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CalendarEvent } from '@/components/scheduler/test/InteractiveCalendar';
import type { SchedulerEvent } from '@/components/scheduler/scheduler-calendar';
import { CourseAnalysisResults, type SectionSelection } from '@/components/scheduler/analysis/CourseAnalysisResults';
import type { CourseAnalysisData, SectionAnalysis } from '@/components/scheduler/analysis/CourseAnalysisResults';
import { SchedulePreferences } from '@/lib/services/scheduleService';
import { replaceCourseSelectionsAction } from '@/lib/services/server-actions';

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
  type SelectedSectionDetail = SectionAnalysis & {
    courseCode: string;
    rank: 'primary' | 'backup1' | 'backup2';
  };

  const [analyses, setAnalyses] = useState<CourseAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<SectionSelection[]>(existingSelections);
  const [selectedSectionDetails, setSelectedSectionDetails] = useState<Record<string, SelectedSectionDetail>>({});
  const [availableCourseCodes, setAvailableCourseCodes] = useState<string[]>(courseCodes);
  const [isValidatingCourses, setIsValidatingCourses] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<{
    notInTerm: Array<{ courseCode: string; availableIn?: string }>;
    notFound: Array<{ courseCode: string }>;
  } | null>(null);
  const [wantsBackups, setWantsBackups] = useState<boolean | null>(null);
  const [showBackupsDialog, setShowBackupsDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    const selectionEvents = buildSelectionCalendarEvents();
    const newCalendarState = JSON.stringify(
      {
        events: [...nonCourseEvents, ...selectionEvents].map(event => ({
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
  }, [calendarEvents, availableCourseCodes, isValidatingCourses, selections, selectedSectionDetails, analyses]);

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
      const selectionEvents = buildSelectionCalendarEvents(courseCode);
      const analysisEvents = [...eventsToCheck, ...selectionEvents];

      const response = await fetch('/api/test-scheduler-tools/analyze-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityId,
          termName,
          courseCode,
          calendarEvents: analysisEvents,
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

    // Handle compact 24-hour format (e.g., "900" or "0930")
    if (/^\d{3,4}$/.test(trimmed)) {
      const padded = trimmed.padStart(4, '0');
      const hours = padded.slice(0, 2);
      const minutes = padded.slice(2);
      return `${hours}:${minutes}`;
    }

    // 12-hour format with optional minutes (e.g., "8 AM", "8:15 PM")
    const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!match) {
      console.warn(`⚠️ Unable to parse time: "${timeStr}"`);
      return trimmed;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2] || '00';
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
    const timeMatch = timeStr.match(/(\d{1,2}(?::\d{2})?\s*[AP]M|\d{1,2}:\d{2})\s*-\s*(\d{1,2}(?::\d{2})?\s*[AP]M|\d{1,2}:\d{2})/i);
    if (!timeMatch) return null;

    return {
      startTime: normalizeTime(timeMatch[1]),
      endTime: normalizeTime(timeMatch[2]),
    };
  };

  const getSelectionKey = (courseCode: string, sectionLabel: string, rank: SectionSelection['rank']) =>
    `${courseCode}__${sectionLabel}__${rank}`;

  const buildPreviewEvents = (
    currentSelections: SectionSelection[],
    currentAnalyses: CourseAnalysisData[],
    currentSelectionDetails: Record<string, SelectedSectionDetail>
  ): SchedulerEvent[] => {
    const previewEvents: SchedulerEvent[] = [];

    currentSelections.forEach(selection => {
      const selectionKey = getSelectionKey(selection.courseCode, selection.sectionLabel, selection.rank);
      const sectionFromCache = currentSelectionDetails[selectionKey];
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

  const buildSelectionCalendarEvents = (excludeCourseCode?: string): CalendarEvent[] => {
    const previewEvents = buildPreviewEvents(selections, analyses, selectedSectionDetails);
    return previewEvents
      .filter(event => event.course_code && event.course_code !== excludeCourseCode)
      .map(event => ({
        id: event.id,
        title: event.title,
        dayOfWeek: event.dayOfWeek,
        startTime: event.startTime,
        endTime: event.endTime,
        category: 'Course',
        location: event.location,
      }));
  };

  const lastSelectionsRef = useRef<string>('');

  useEffect(() => {
    const serialized = JSON.stringify(selections);
    if (serialized === lastSelectionsRef.current) return;
    lastSelectionsRef.current = serialized;
    onSelectionsChange(selections);
  }, [selections, onSelectionsChange]);

  useEffect(() => {
    if (!onPreviewEventsChange) return;
    onPreviewEventsChange(buildPreviewEvents(selections, analyses, selectedSectionDetails));
  }, [analyses, selections, onPreviewEventsChange, selectedSectionDetails]);

  const primarySelections = selections.filter(s => s.rank === 'primary');
  const coursesWithPrimary = new Set(primarySelections.map(s => s.courseCode));
  const allCoursesHavePrimary =
    availableCourseCodes.length > 0 &&
    availableCourseCodes.every(code => coursesWithPrimary.has(code));
  const coursesWithPrimaryCount = coursesWithPrimary.size;
  const primaryProgress = availableCourseCodes.length > 0
    ? Math.round((coursesWithPrimaryCount / availableCourseCodes.length) * 100)
    : 0;

  const clearBackupSelections = (nextSelections?: SectionSelection[]) => {
    const filteredSelections = (nextSelections || selections).filter(s => s.rank === 'primary');
    setSelections(filteredSelections);
    onSelectionsChange(filteredSelections);
    onPreviewEventsChange?.(buildPreviewEvents(filteredSelections, analyses, selectedSectionDetails));
  };

  useEffect(() => {
    if (allCoursesHavePrimary) return;

    if (wantsBackups !== null) {
      setWantsBackups(null);
    }
    if (showBackupsDialog) {
      setShowBackupsDialog(false);
    }

    if (selections.some(s => s.rank !== 'primary')) {
      clearBackupSelections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCoursesHavePrimary]);

  useEffect(() => {
    if (allCoursesHavePrimary && wantsBackups === null) {
      setShowBackupsDialog(true);
    }
  }, [allCoursesHavePrimary, wantsBackups]);

  const handleSelectSection = (courseCode: string, sectionLabel: string, rank: 'primary' | 'backup1' | 'backup2') => {
    console.log(`📌 [SectionReviewStep] Selecting ${courseCode} ${sectionLabel} as ${rank}`);

    const analysis = analyses.find(a => a.courseCode === courseCode);
    const section = analysis?.sections.find(s => s.section_label === sectionLabel);
    if (section) {
      const selectionKey = getSelectionKey(courseCode, sectionLabel, rank);
      setSelectedSectionDetails(prev => ({
        ...prev,
        [selectionKey]: { ...section, courseCode, rank },
      }));
    }

    setSelections(prev => ([
      ...prev.filter(s => s.courseCode !== courseCode || s.rank !== rank),
      { courseCode, sectionLabel, rank },
    ]));
  };

  const handleDeselectSection = (courseCode: string, sectionLabel: string) => {
    console.log(`🗑️ [SectionReviewStep] Deselecting ${courseCode} ${sectionLabel}`);

    setSelectedSectionDetails(prev => {
      const keysToRemove = Object.keys(prev).filter(key =>
        key.startsWith(`${courseCode}__${sectionLabel}__`)
      );
      if (keysToRemove.length === 0) return prev;
      const next = { ...prev };
      keysToRemove.forEach(key => {
        delete next[key];
      });
      return next;
    });

    setSelections(prev => (
      prev.filter(s => !(s.courseCode === courseCode && s.sectionLabel === sectionLabel))
    ));
  };

  const resolveSelectionDetail = (selection: SectionSelection): SelectedSectionDetail | null => {
    const selectionKey = getSelectionKey(selection.courseCode, selection.sectionLabel, selection.rank);
    const cached = selectedSectionDetails[selectionKey];
    if (cached) return cached;

    const analysis = analyses.find(a => a.courseCode === selection.courseCode);
    const section = analysis?.sections.find(s => s.section_label === selection.sectionLabel);
    if (!section) return null;

    return { ...section, courseCode: selection.courseCode, rank: selection.rank };
  };

  const handleFinishSchedule = async () => {
    setSaveError(null);

    if (!scheduleId) {
      setSaveError('Missing schedule ID. Please refresh and try again.');
      return;
    }

    if (!allCoursesHavePrimary) {
      setSaveError('Select a primary section for each course before finishing.');
      return;
    }

    setIsSaving(true);

    try {
      const grouped = new Map<string, { primary?: SectionSelection; backup1?: SectionSelection; backup2?: SectionSelection }>();
      selections.forEach(selection => {
        if (!grouped.has(selection.courseCode)) {
          grouped.set(selection.courseCode, {});
        }
        const entry = grouped.get(selection.courseCode)!;
        if (selection.rank === 'primary') entry.primary = selection;
        if (selection.rank === 'backup1') entry.backup1 = selection;
        if (selection.rank === 'backup2') entry.backup2 = selection;
      });

      const payload = Array.from(grouped.entries()).map(([courseCode, entry]) => {
        if (!entry.primary) return null;

        const primaryDetail = resolveSelectionDetail(entry.primary);
        const backup1Detail = entry.backup1 ? resolveSelectionDetail(entry.backup1) : null;
        const backup2Detail = entry.backup2 ? resolveSelectionDetail(entry.backup2) : null;

        if (!primaryDetail?.offering_id) {
          throw new Error(`Missing offering ID for ${courseCode} primary selection.`);
        }

        if (entry.backup1 && !backup1Detail?.offering_id) {
          throw new Error(`Missing offering ID for ${courseCode} backup 1 selection.`);
        }

        if (entry.backup2 && !backup2Detail?.offering_id) {
          throw new Error(`Missing offering ID for ${courseCode} backup 2 selection.`);
        }

        return {
          course_code: courseCode,
          requirement_type: null,
          primary_offering_id: primaryDetail.offering_id,
          backup_1_offering_id: backup1Detail?.offering_id ?? null,
          backup_2_offering_id: backup2Detail?.offering_id ?? null,
          status: 'planned' as const,
          notes: null,
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      if (payload.length === 0) {
        setSaveError('No selections to save.');
        return;
      }

      const result = await replaceCourseSelectionsAction(scheduleId, payload);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save selections.');
      }

      onNext();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save selections.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Sticky Header with Action Buttons */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'var(--card, #fff)',
        pb: 2,
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.04)',
        mx: -3,
        px: 3,
        pt: 1.5,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
              Review & Select Sections
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose your preferred sections for each course. Conflicts are analyzed against your saved calendar events.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, alignItems: 'center' }}>
            <Box sx={{ minWidth: 140 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: allCoursesHavePrimary ? '#10b981' : '#f59e0b' }}>
                Primaries: {coursesWithPrimaryCount}/{availableCourseCodes.length}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={primaryProgress}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: allCoursesHavePrimary ? '#10b981' : '#f59e0b',
                  },
                }}
              />
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowLeft size={16} />}
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              variant="contained"
              size="small"
              endIcon={<ArrowRight size={16} />}
              onClick={handleFinishSchedule}
              disabled={isSaving || !allCoursesHavePrimary || (allCoursesHavePrimary && wantsBackups === null)}
              sx={{
                bgcolor: '#06C96C',
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {isSaving ? 'Saving...' : 'Finish Schedule'}
            </Button>
          </Box>
        </Box>
        {!allCoursesHavePrimary && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
            Select a primary section for all {availableCourseCodes.length} courses ({coursesWithPrimaryCount}/{availableCourseCodes.length} completed)
          </Typography>
        )}
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

      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError}
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

      <Dialog
        open={showBackupsDialog}
        onClose={() => setShowBackupsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>All primary sections selected</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Would you like to add backup sections?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Backups are optional and should be different sections than your primary choice.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setWantsBackups(false);
              clearBackupSelections();
              setShowBackupsDialog(false);
            }}
          >
            No, skip backups
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setWantsBackups(true);
              setShowBackupsDialog(false);
            }}
            sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
          >
            Yes, add backups
          </Button>
        </DialogActions>
      </Dialog>

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

    </Box>
  );
}
