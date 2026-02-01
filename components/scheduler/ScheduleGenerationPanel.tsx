'use client';

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import ScheduleGenerationTabs from './ScheduleGenerationTabs';
import PersonalEventsStep from './steps/PersonalEventsStep';
import CourseConfirmationStep from './steps/CourseConfirmationStep';
import PreferencesStep from './steps/PreferencesStep';
import ResultsPreviewStep from './steps/ResultsPreviewStep';
import { BlockedTime, SchedulePreferences } from '@/lib/services/scheduleService';
import { CourseSection } from '@/lib/services/courseOfferingService';
import { getCoursesForTerm, calculateTotalCredits, type GradPlanDetails } from '@/lib/utils/gradPlanHelpers';

interface ScheduleGenerationPanelProps {
  termName: string;
  termIndex: number;
  gradPlanDetails: GradPlanDetails | null;
  universityId: number;
  existingPersonalEvents?: BlockedTime[];
  existingPreferences?: SchedulePreferences;
  onComplete: () => void;
  onEventsChange: (events: Omit<BlockedTime, 'id'>[]) => void;
  onPreferencesChange: (prefs: SchedulePreferences) => void;
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
  universityId,
  existingPersonalEvents = [],
  existingPreferences = {},
  onComplete,
  onEventsChange,
  onPreferencesChange,
}: ScheduleGenerationPanelProps) {
  const [state, setState] = useState<ScheduleGenerationState>({
    currentStep: 1,
    personalEvents: [],
    selectedCourses: [],
    preferences: {},
    totalCredits: 0,
  });

  // Initialize state
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
  }, [termIndex, gradPlanDetails, existingPersonalEvents, existingPreferences]);

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

  const handleSave = (_offerings: CourseSection[]) => {
    onComplete();
  };

  const handleStartOver = () => {
    setState({
      currentStep: 1,
      personalEvents: existingPersonalEvents.map(({ id: _id, ...rest }) => rest),
      selectedCourses: getCoursesForTerm(gradPlanDetails, termIndex).map(c => c.code),
      preferences: { ...existingPreferences },
      totalCredits: calculateTotalCredits(getCoursesForTerm(gradPlanDetails, termIndex)),
    });
  };

  const gradPlanCourses = getCoursesForTerm(gradPlanDetails, termIndex);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h6" className="font-header" sx={{ fontWeight: 700, mb: 0.5 }}>
          Generate Schedule
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {termName}
        </Typography>
      </Box>

      {/* Tabs */}
      <ScheduleGenerationTabs
        currentStep={state.currentStep}
        onStepChange={handleStepChange}
      />

      {/* Step Content */}
      <Box>
        {state.currentStep === 1 && (
          <PersonalEventsStep
            events={state.personalEvents}
            onEventsChange={handleEventsChangeInternal}
            onNext={handleNext}
          />
        )}

        {state.currentStep === 2 && (
          <CourseConfirmationStep
            termIndex={termIndex}
            gradPlanCourses={gradPlanCourses}
            selectedCourses={state.selectedCourses}
            onCoursesChange={handleCoursesChange}
            totalCredits={state.totalCredits}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 3 && (
          <PreferencesStep
            preferences={state.preferences}
            onPreferencesChange={handlePreferencesChangeInternal}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {state.currentStep === 4 && (
          <ResultsPreviewStep
            termName={termName}
            courseCodes={state.selectedCourses}
            universityId={universityId}
            onSave={handleSave}
            onStartOver={handleStartOver}
            onBack={handleBack}
          />
        )}
      </Box>
    </Box>
  );
}
