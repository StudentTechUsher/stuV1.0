'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import { X } from 'lucide-react';
import ScheduleGenerationStepper from './ScheduleGenerationStepper';
import PersonalEventsStep from './steps/PersonalEventsStep';
import CourseConfirmationStep from './steps/CourseConfirmationStep';
import PreferencesStep from './steps/PreferencesStep';
import ResultsPreviewStep from './steps/ResultsPreviewStep';
import { BlockedTime, SchedulePreferences } from '@/lib/services/scheduleService';
import { CourseSection } from '@/lib/services/courseOfferingService';
import { getCoursesForTerm, calculateTotalCredits, type GradPlanDetails } from '@/lib/utils/gradPlanHelpers';

interface GenerateScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  termName: string;
  termIndex: number;
  gradPlanDetails: GradPlanDetails | null;
  universityId: number;
  existingPersonalEvents?: BlockedTime[];
  existingPreferences?: SchedulePreferences;
  onComplete: () => void;
}

interface ScheduleGenerationState {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps: number[];
  personalEvents: Omit<BlockedTime, 'id'>[];
  selectedCourses: string[];
  preferences: SchedulePreferences;
  totalCredits: number;
}

export default function GenerateScheduleDialog({
  open,
  onClose,
  termName,
  termIndex,
  gradPlanDetails,
  universityId,
  existingPersonalEvents = [],
  existingPreferences = {},
  onComplete,
}: GenerateScheduleDialogProps) {
  const [state, setState] = useState<ScheduleGenerationState>({
    currentStep: 1,
    completedSteps: [],
    personalEvents: [],
    selectedCourses: [],
    preferences: {},
    totalCredits: 0,
  });

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      // Get courses from grad plan for this term
      const courses = getCoursesForTerm(gradPlanDetails, termIndex);
      const courseCodes = courses.map(c => c.code);
      const totalCredits = calculateTotalCredits(courses);

      // Convert existing blocked times to the format we need
      const existingEventsWithoutId = existingPersonalEvents.map(({ id: _id, ...rest }) => rest);

      setState({
        currentStep: 1,
        completedSteps: [],
        personalEvents: existingEventsWithoutId,
        selectedCourses: courseCodes,
        preferences: { ...existingPreferences },
        totalCredits,
      });
    }
  }, [open, termIndex, gradPlanDetails, existingPersonalEvents, existingPreferences]);

  const handleNext = () => {
    const nextStep = (state.currentStep + 1) as 1 | 2 | 3 | 4;
    if (nextStep <= 4) {
      setState({
        ...state,
        currentStep: nextStep,
        completedSteps: [...state.completedSteps, state.currentStep],
      });
    }
  };

  const handleBack = () => {
    const prevStep = (state.currentStep - 1) as 1 | 2 | 3 | 4;
    if (prevStep >= 1) {
      setState({
        ...state,
        currentStep: prevStep,
      });
    }
  };

  const handleStepClick = (step: 1 | 2 | 3 | 4) => {
    setState({
      ...state,
      currentStep: step,
    });
  };

  const handleEventsChange = (events: Omit<BlockedTime, 'id'>[]) => {
    setState({ ...state, personalEvents: events });
  };

  const handleCoursesChange = (courses: string[]) => {
    // Recalculate total credits when courses change
    const allCourses = getCoursesForTerm(gradPlanDetails, termIndex);
    const selectedCourseDetails = allCourses.filter(c => courses.includes(c.code));
    const totalCredits = calculateTotalCredits(selectedCourseDetails);

    setState({ ...state, selectedCourses: courses, totalCredits });
  };

  const handlePreferencesChange = (preferences: SchedulePreferences) => {
    setState({ ...state, preferences });
  };

  const handleSave = (_offerings: CourseSection[]) => {
    // In the future, this will save the selected offerings to the schedule
    // For now, we just complete the flow
    onComplete();
    onClose();
  };

  const handleStartOver = () => {
    setState({
      currentStep: 1,
      completedSteps: [],
      personalEvents: existingPersonalEvents.map(({ id: _id, ...rest }) => rest),
      selectedCourses: getCoursesForTerm(gradPlanDetails, termIndex).map(c => c.code),
      preferences: { ...existingPreferences },
      totalCredits: calculateTotalCredits(getCoursesForTerm(gradPlanDetails, termIndex)),
    });
  };

  const gradPlanCourses = getCoursesForTerm(gradPlanDetails, termIndex);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" className="font-header" sx={{ fontWeight: 700 }}>
              Generate Schedule
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {termName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Stepper */}
        <ScheduleGenerationStepper
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={handleStepClick}
        />

        {/* Step Content */}
        <Box sx={{ mt: 2 }}>
          {state.currentStep === 1 && (
            <PersonalEventsStep
              events={state.personalEvents}
              onEventsChange={handleEventsChange}
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
              onPreferencesChange={handlePreferencesChange}
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
      </DialogContent>
    </Dialog>
  );
}
