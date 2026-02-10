'use client';

import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import ScheduleGenerationTabs from './ScheduleGenerationTabs';
import TermStep from './steps/TermStep';
import PersonalEventsStep from './steps/PersonalEventsStep';
import CourseConfirmationStep from './steps/CourseConfirmationStep';
import PreferencesStep from './steps/PreferencesStep';
import { SectionReviewStep } from './steps/SectionReviewStep';
import { BlockedTime, SchedulePreferences } from '@/lib/services/scheduleService';
import { getCoursesForTerm, calculateTotalCredits, type GradPlanDetails } from '@/lib/utils/gradPlanHelpers';
import type { CalendarEvent } from '@/components/scheduler/test/InteractiveCalendar';
import type { SectionSelection } from '@/components/scheduler/analysis/CourseAnalysisResults';
import type { SchedulerEvent } from '@/components/scheduler/scheduler-calendar';

interface ScheduleGenerationPanelProps {
  termName: string;
  termIndex: number;
  gradPlanDetails: GradPlanDetails | null;
  gradPlanId?: string;
  universityId: number;
  existingPersonalEvents?: BlockedTime[];
  existingPreferences?: SchedulePreferences;
  onComplete: () => void;
  onEventsChange: (events: Omit<BlockedTime, 'id'>[]) => void;
  onPreferencesChange: (prefs: SchedulePreferences) => void;
  onTermSelect?: (termName: string, index: number) => void;
  gradPlanTerms?: Array<{
    term: string;
    notes?: string;
    courses?: unknown[];
    credits_planned?: number;
    is_active?: boolean;
    termPassed?: boolean;
  }>;
  selectedTermIndex?: number | null;
  isLoading?: boolean;
  studentId?: number;
  scheduleId?: string;
  onSectionPreviewEventsChange?: (events: SchedulerEvent[]) => void;
}

interface ScheduleGenerationState {
  currentStep: number; // 1, 2, 3, 4, or 4.5
  personalEvents: Omit<BlockedTime, 'id'>[];
  selectedCourses: string[];
  preferences: SchedulePreferences;
  totalCredits: number;
  sectionSelections: Array<{
    courseCode: string;
    sectionLabel: string;
    rank: 'primary' | 'backup1' | 'backup2';
  }>;
}

export default function ScheduleGenerationPanel({
  termName,
  termIndex,
  gradPlanDetails,
  gradPlanId,
  universityId,
  existingPersonalEvents = [],
  existingPreferences = {},
  onComplete: _onComplete,
  onEventsChange,
  onPreferencesChange,
  onTermSelect,
  gradPlanTerms = [],
  selectedTermIndex = null,
  isLoading = false,
  studentId,
  scheduleId,
  onSectionPreviewEventsChange,
}: ScheduleGenerationPanelProps) {
  const [state, setState] = useState<ScheduleGenerationState>({
    currentStep: 1,
    personalEvents: [],
    selectedCourses: [],
    preferences: {},
    totalCredits: 0,
    sectionSelections: [],
  });
  const [hasCourseIssues, setHasCourseIssues] = useState(false);

  // Initialize state when term or grad plan changes (reset to step 1)
  useEffect(() => {
    // Use term name instead of index to avoid mismatch with filtered terms
    const courses = getCoursesForTerm(gradPlanDetails, termName);
    const courseCodes = courses.map(c => c.code);
    const totalCredits = calculateTotalCredits(courses);

    const existingEventsWithoutId = existingPersonalEvents.map(({ id: _id, ...rest }) => rest);

    setState({
      currentStep: 1,
      personalEvents: existingEventsWithoutId,
      selectedCourses: courseCodes,
      preferences: { ...existingPreferences },
      totalCredits,
      sectionSelections: [],
    });
    setHasCourseIssues(false);
    onSectionPreviewEventsChange?.([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termName, gradPlanDetails]); // Only reset when term name or plan changes

  // Update data without resetting currentStep when preferences or events change
  useEffect(() => {
    const existingEventsWithoutId = existingPersonalEvents.map(({ id: _id, ...rest }) => rest);

    setState(prev => ({
      ...prev,
      personalEvents: existingEventsWithoutId,
      preferences: { ...existingPreferences },
    }));
  }, [existingPersonalEvents, existingPreferences]);

  const handleStepChange = (step: number) => {
    setState({
      ...state,
      currentStep: step,
    });
  };

  const handleNext = () => {
    let nextStep = state.currentStep + 1;
    // Skip from 4 to 4.5 when moving forward
    if (state.currentStep === 4) {
      nextStep = 4.5;
    }
    if (nextStep <= 4.5) {
      handleStepChange(nextStep);
    }
  };

  const handleBack = () => {
    let prevStep = state.currentStep - 1;
    // Skip from 4.5 to 4 when moving backward
    if (state.currentStep === 4.5) {
      prevStep = 4;
    }
    if (prevStep >= 1) {
      handleStepChange(prevStep);
    }
  };

  const handleEventsChangeInternal = (events: Omit<BlockedTime, 'id'>[]) => {
    setState({ ...state, personalEvents: events });
    onEventsChange(events); // Propagate to parent for calendar update
  };

  const handleCoursesChange = (courses: string[]) => {
    const allCourses = getCoursesForTerm(gradPlanDetails, termName || termIndex);
    const selectedCourseDetails = allCourses.filter(c => courses.includes(c.code));
    const totalCredits = calculateTotalCredits(selectedCourseDetails);

    setState({ ...state, selectedCourses: courses, totalCredits });
  };

  const handleTotalCreditsChange = (totalCredits: number) => {
    setState(prev => ({ ...prev, totalCredits }));
  };

  const handlePreferencesChangeInternal = (preferences: SchedulePreferences) => {
    setState({ ...state, preferences });
    onPreferencesChange(preferences); // Propagate to parent
  };

  const handleCompletePreferences = () => {
    // Move to Step 4.5 (section review)
    setState(prev => ({ ...prev, currentStep: 4.5 }));
  };

  const handleSelectionsChange = (selections: SectionSelection[]) => {
    setState({ ...state, sectionSelections: selections });
  };

  const convertToMastraEvents = (events: Omit<BlockedTime, 'id'>[]): CalendarEvent[] => {
    return events.map((evt, index) => ({
      id: `blocked-${index}-${evt.day_of_week}-${evt.start_time}-${evt.end_time}`,
      title: evt.title,
      dayOfWeek: evt.day_of_week,
      startTime: evt.start_time,
      endTime: evt.end_time,
      category: evt.category,
    }));
  };

  const convertFromCalendarEvents = (events: CalendarEvent[]): Omit<BlockedTime, 'id'>[] => {
    return events
      .filter(e => e.category !== 'Course') // Exclude course events
      .map(evt => ({
        title: evt.title,
        category: evt.category as 'Work' | 'Club' | 'Sports' | 'Study' | 'Family' | 'Other',
        day_of_week: evt.dayOfWeek,
        start_time: evt.startTime,
        end_time: evt.endTime,
      }));
  };

  const handleCalendarChangeFromReview = (events: CalendarEvent[]) => {
    // Update internal state
    const nonCourseEvents = convertFromCalendarEvents(events);
    setState({ ...state, personalEvents: nonCourseEvents });

    // Propagate to parent
    onEventsChange(nonCourseEvents);
  };

  const handleReviewComplete = () => {
    // Validation
    if (!scheduleId || !studentId) {
      console.error('Missing required IDs:', { scheduleId, studentId });
      return;
    }

    console.log('Section review complete:', state.sectionSelections);

    setState(prev => ({ ...prev, currentStep: 1 }));
    _onComplete();
  };

  // Use term name instead of index to avoid mismatch with filtered terms
  const gradPlanCourses = getCoursesForTerm(gradPlanDetails, termName);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs - Fixed (hide when on step 4.5) */}
      {state.currentStep !== 4.5 && (
        <Box sx={{ flexShrink: 0 }}>
          <ScheduleGenerationTabs
            currentStep={state.currentStep as 1 | 2 | 3 | 4}
            onStepChange={handleStepChange}
          />
        </Box>
      )}

      {/* Step Content - Scrollable */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {state.currentStep === 1 && onTermSelect && (
          <TermStep
            terms={gradPlanTerms}
            selectedTermIndex={selectedTermIndex}
            selectedTermName={termName}
            onTermSelect={onTermSelect}
            onNext={handleNext}
            isLoading={isLoading}
          />
        )}

        {state.currentStep === 2 && (
          <PersonalEventsStep
            events={state.personalEvents}
            onEventsChange={handleEventsChangeInternal}
            onNext={handleNext}
          />
        )}

        {state.currentStep === 3 && (
          <CourseConfirmationStep
            termIndex={termIndex}
            termName={termName}
            gradPlanCourses={gradPlanCourses}
            selectedCourses={state.selectedCourses}
            onCoursesChange={handleCoursesChange}
            totalCredits={state.totalCredits}
            universityId={universityId}
            gradPlanId={gradPlanId}
            onCourseIssuesChange={setHasCourseIssues}
            onTotalCreditsChange={handleTotalCreditsChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 4 && (
          <PreferencesStep
            preferences={state.preferences}
            onPreferencesChange={handlePreferencesChangeInternal}
            onNext={handleCompletePreferences}
            onBack={handleBack}
            hasCourseIssues={hasCourseIssues}
          />
        )}

        {state.currentStep === 4.5 && (
          <SectionReviewStep
            termName={termName}
            universityId={universityId}
            scheduleId={scheduleId || ''}
            courseCodes={state.selectedCourses}
            calendarEvents={convertToMastraEvents(state.personalEvents)}
            preferences={state.preferences}
            existingSelections={state.sectionSelections}
            onSelectionsChange={handleSelectionsChange}
            onCalendarChange={handleCalendarChangeFromReview}
            onPreviewEventsChange={onSectionPreviewEventsChange}
            onNext={handleReviewComplete}
            onBack={handleBack}
          />
        )}

      </Box>
    </Box>
  );
}
