'use client';

import { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import ScheduleGenerationTabs from './ScheduleGenerationTabs';
import TermStep from './steps/TermStep';
import PersonalEventsStep from './steps/PersonalEventsStep';
import CourseConfirmationStep from './steps/CourseConfirmationStep';
import PreferencesStep from './steps/PreferencesStep';
import { AgentSchedulerWithSetup } from './agent/AgentSchedulerWithSetup';
import { BlockedTime, SchedulePreferences } from '@/lib/services/scheduleService';
import { getCoursesForTerm, calculateTotalCredits, type GradPlanDetails } from '@/lib/utils/gradPlanHelpers';
import type { SchedulerEvent as MastraSchedulerEvent } from '@/lib/mastra/types';

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
  onAgentCalendarUpdate?: (events: MastraSchedulerEvent[]) => void;
}

interface ScheduleGenerationState {
  currentStep: 1 | 2 | 3 | 4 | 5;
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
  onComplete: _onComplete,
  onEventsChange,
  onPreferencesChange,
  onTermSelect,
  gradPlanTerms = [],
  selectedTermIndex = null,
  isLoading = false,
  studentId,
  scheduleId,
  onAgentCalendarUpdate,
}: ScheduleGenerationPanelProps) {
  const [state, setState] = useState<ScheduleGenerationState>({
    currentStep: 1,
    personalEvents: [],
    selectedCourses: [],
    preferences: {},
    totalCredits: 0,
  });

  // Refs to prevent agent re-initialization on parent re-renders
  const scheduleIdRef = useRef(scheduleId);
  const isAgentInitializedRef = useRef(false);

  // Update ref when scheduleId changes
  useEffect(() => {
    scheduleIdRef.current = scheduleId;
  }, [scheduleId]);

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
    });
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

  const handleStepChange = (step: 1 | 2 | 3 | 4 | 5) => {
    setState({
      ...state,
      currentStep: step,
    });
  };

  const handleNext = () => {
    const nextStep = (state.currentStep + 1) as 1 | 2 | 3 | 4 | 5;
    if (nextStep <= 5) {
      handleStepChange(nextStep);
    }
  };

  const handleBack = () => {
    const prevStep = (state.currentStep - 1) as 1 | 2 | 3 | 4 | 5;
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
    // Validation
    if (!scheduleId || !studentId) {
      console.error('Missing required IDs:', { scheduleId, studentId });
      return;
    }

    console.log('Starting inline agent with:', {
      scheduleId,
      termName,
      termIndex,
      preferences: state.preferences,
      blockedTimes: state.personalEvents.length
    });

    // Move to Step 5 (agent) instead of navigating
    setState(prev => ({ ...prev, currentStep: 5 }));
  };

  // Use term name instead of index to avoid mismatch with filtered terms
  const gradPlanCourses = getCoursesForTerm(gradPlanDetails, termName);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs - Fixed (hide when on step 5 - agent) */}
      {state.currentStep !== 5 && (
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

        {state.currentStep === 5 && studentId && scheduleIdRef.current && (
          <Box>
            <AgentSchedulerWithSetup
              key={scheduleIdRef.current}
              termName={termName}
              termIndex={termIndex}
              universityId={universityId}
              studentId={studentId}
              scheduleId={scheduleIdRef.current}
              gradPlanDetails={gradPlanDetails}
              gradPlanId={gradPlanId}
              existingPersonalEvents={state.personalEvents.map(evt => ({
                ...evt,
                id: `temp-${Math.random()}`,
              }))}
              existingPreferences={state.preferences}
              onCalendarUpdate={(newEvents) => {
                // Pass to parent without triggering re-render
                onAgentCalendarUpdate?.(newEvents);
              }}
              onComplete={() => {
                // Agent done - reset to step 1
                setState(prev => ({
                  ...prev,
                  currentStep: 1,
                }));
                isAgentInitializedRef.current = false;
                _onComplete();
              }}
              onExit={() => {
                // Exit agent - go back to step 4 (preferences)
                console.log('Exiting agent, returning to preferences');
                setState(prev => ({
                  ...prev,
                  currentStep: 4,
                }));
                isAgentInitializedRef.current = false;
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
