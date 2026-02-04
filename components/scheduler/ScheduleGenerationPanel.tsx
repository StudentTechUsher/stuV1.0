'use client';

import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import ScheduleGenerationTabs from './ScheduleGenerationTabs';
import TermStep from './steps/TermStep';
import PersonalEventsStep from './steps/PersonalEventsStep';
import CourseConfirmationStep from './steps/CourseConfirmationStep';
import PreferencesStep from './steps/PreferencesStep';
import { AgentSchedulerWithSetup } from './agent/AgentSchedulerWithSetup';
import { BlockedTime, SchedulePreferences } from '@/lib/services/scheduleService';
import { getCoursesForTerm, calculateTotalCredits, type GradPlanDetails } from '@/lib/utils/gradPlanHelpers';
import type { SchedulerEvent } from '@/lib/mastra/types';

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
  onCalendarUpdate?: (events: SchedulerEvent[]) => void;
}

interface ScheduleGenerationState {
  currentStep: 1 | 2 | 3 | 4;
  personalEvents: Omit<BlockedTime, 'id'>[];
  selectedCourses: string[];
  preferences: SchedulePreferences;
  totalCredits: number;
}

export default function ScheduleGenerationPanel({
  termName,
  termIndex,
  gradPlanDetails,
  gradPlanId,
  universityId,
  existingPersonalEvents = [],
  existingPreferences = {},
  onComplete,
  onEventsChange,
  onPreferencesChange,
  onTermSelect,
  gradPlanTerms = [],
  selectedTermIndex = null,
  isLoading = false,
  studentId,
  scheduleId,
  onCalendarUpdate,
}: ScheduleGenerationPanelProps) {
  const [state, setState] = useState<ScheduleGenerationState>({
    currentStep: 1,
    personalEvents: [],
    selectedCourses: [],
    preferences: {},
    totalCredits: 0,
  });

  const [showAgent, setShowAgent] = useState(false);

  // Initialize state when term or grad plan changes (reset to step 1)
  useEffect(() => {
    const courses = getCoursesForTerm(gradPlanDetails, termIndex);
    const courseCodes = courses.map(c => c.code);
    const totalCredits = calculateTotalCredits(courses);

    const existingEventsWithoutId = existingPersonalEvents.map(({ id: _id, ...rest }) => rest);

    setState({
      currentStep: 1,
      personalEvents: existingEventsWithoutId,
      selectedCourses: courseCodes,
      preferences: { ...existingPreferences },
      totalCredits,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termIndex, gradPlanDetails]); // Only reset when term or plan changes

  // Update data without resetting currentStep when preferences or events change
  useEffect(() => {
    const existingEventsWithoutId = existingPersonalEvents.map(({ id: _id, ...rest }) => rest);

    setState(prev => ({
      ...prev,
      personalEvents: existingEventsWithoutId,
      preferences: { ...existingPreferences },
    }));
  }, [existingPersonalEvents, existingPreferences]);

  const handleStepChange = (step: 1 | 2 | 3 | 4) => {
    setState({
      ...state,
      currentStep: step,
    });
  };

  const handleNext = () => {
    const nextStep = (state.currentStep + 1) as 1 | 2 | 3 | 4;
    if (nextStep <= 4) {
      handleStepChange(nextStep);
    }
  };

  const handleBack = () => {
    const prevStep = (state.currentStep - 1) as 1 | 2 | 3 | 4;
    if (prevStep >= 1) {
      handleStepChange(prevStep);
    }
  };

  const handleEventsChangeInternal = (events: Omit<BlockedTime, 'id'>[]) => {
    setState({ ...state, personalEvents: events });
    onEventsChange(events); // Propagate to parent for calendar update
  };

  const handleCoursesChange = (courses: string[]) => {
    const allCourses = getCoursesForTerm(gradPlanDetails, termIndex);
    const selectedCourseDetails = allCourses.filter(c => courses.includes(c.code));
    const totalCredits = calculateTotalCredits(selectedCourseDetails);

    setState({ ...state, selectedCourses: courses, totalCredits });
  };

  const handlePreferencesChangeInternal = (preferences: SchedulePreferences) => {
    setState({ ...state, preferences });
    onPreferencesChange(preferences); // Propagate to parent
  };

  const handleCompletePreferences = () => {
    // Instead of calling onComplete immediately, show the agent
    setShowAgent(true);
  };

  const gradPlanCourses = getCoursesForTerm(gradPlanDetails, termIndex);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs - Fixed */}
      <Box sx={{ flexShrink: 0 }}>
        <ScheduleGenerationTabs
          currentStep={state.currentStep}
          onStepChange={handleStepChange}
        />
      </Box>

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
            gradPlanCourses={gradPlanCourses}
            selectedCourses={state.selectedCourses}
            onCoursesChange={handleCoursesChange}
            totalCredits={state.totalCredits}
            universityId={universityId}
            gradPlanId={gradPlanId}
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
          />
        )}
      </Box>

      {/* Agent Overlay */}
      {showAgent && studentId && scheduleId && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'background.paper',
          zIndex: 10
        }}>
          <AgentSchedulerWithSetup
            termName={termName}
            termIndex={termIndex}
            universityId={universityId}
            studentId={studentId}
            scheduleId={scheduleId}
            gradPlanDetails={gradPlanDetails}
            gradPlanId={gradPlanId}
            existingPersonalEvents={existingPersonalEvents.map(evt => ({
              id: evt.id,
              title: evt.title,
              category: evt.category,
              day_of_week: evt.day_of_week,
              start_time: evt.start_time,
              end_time: evt.end_time,
            }))}
            existingPreferences={state.preferences}
            onComplete={() => {
              setShowAgent(false);
              onComplete(); // Activates schedule and loads courses
            }}
            onCalendarUpdate={onCalendarUpdate}
          />
        </Box>
      )}
    </Box>
  );
}
