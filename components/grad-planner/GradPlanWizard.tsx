'use client';

/**
 * Main Grad Plan Wizard Component
 * Orchestrates the multi-step wizard flow with state management and backend integration
 * Flexible wrapper that works as both a standalone page and modal component
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useWizardState } from './wizard/useWizardState';
import { WizardState } from './wizard/types';
import { ProgressBar } from './wizard/ProgressBar';
import { NameStep } from './wizard/steps/NameStep';
import { StudentTypeStep } from './wizard/steps/StudentTypeStep';
import { ProgramStep } from './wizard/steps/ProgramStep';
import { GenEdStrategyStep } from './wizard/steps/GenEdStrategyStep';
import { PlanModeStep } from './wizard/steps/PlanModeStep';
import { CourseSelectionStep, Requirement } from './wizard/steps/CourseSelectionStep';
import { ElectivesStep } from './wizard/steps/ElectivesStep';
import { ReviewStep } from './wizard/steps/ReviewStep';

interface GradPlanWizardProps {
  // User data
  studentName?: string;
  studentId?: string;

  // Callback when wizard completes
  onComplete?: (planData: WizardState) => void;
  onClose?: () => void;

  // Optional prefilled data
  prefilledData?: Partial<WizardState>;

  // Data loaders
  onLoadPrograms?: (universityId: string) => Promise<unknown[]>;
  onLoadRequirements?: (programIds: string[]) => Promise<Requirement[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSearchCourses?: (query: string) => Promise<any[]>;
  onSubmitPlan?: (planData: WizardState) => Promise<{ success: boolean; error?: string }>;

  // UI Options
  showProgressIndicator?: boolean;
  maxSteps?: number;
}

// Step definitions with visibility and validation logic
const getStepConfig = (state: WizardState) => {
  return [
    {
      id: 'name',
      shouldShow: () => true,
      isValid: () => state.studentName.trim().length > 0,
    },
    {
      id: 'student-type',
      shouldShow: () => true,
      isValid: () => state.studentType !== null,
    },
    {
      id: 'programs',
      shouldShow: () => true,
      isValid: () => state.selectedPrograms.length > 0,
    },
    {
      id: 'gen-ed-strategy',
      shouldShow: () => state.studentType === 'undergraduate',
      isValid: () =>
        state.studentType !== 'undergraduate' || state.genEdStrategy !== null,
    },
    {
      id: 'plan-mode',
      shouldShow: () => true,
      isValid: () => state.planMode !== null,
    },
    {
      id: 'course-selection',
      shouldShow: () => state.planMode === 'MANUAL',
      isValid: () =>
        state.planMode !== 'MANUAL' ||
        Object.keys(state.selectedCourses).length > 0,
    },
    {
      id: 'electives',
      shouldShow: () => true,
      isValid: () => true, // Optional step
    },
    {
      id: 'review',
      shouldShow: () => true,
      isValid: () => true,
    },
  ];
};

// Get visible steps
const getVisibleSteps = (state: WizardState) => {
  const config = getStepConfig(state);
  return config.filter((step) => step.shouldShow());
};

export const GradPlanWizard: React.FC<GradPlanWizardProps> = ({
  studentName = '',
  studentId = '',
  onComplete,

  prefilledData,
  onLoadPrograms,
  onLoadRequirements,
  onSearchCourses,
  onSubmitPlan,
}) => {
  // State management
  const {
    state,
    setStep,
    setStudentName,
    setStudentType,
    setPrograms,
    setGenEdStrategy,
    setPlanMode,
    updateCourseSelection,
    addElective,
    removeElective,
    setPlanName,
    setLoading,
    setError,
  } = useWizardState(
    prefilledData || {
      studentName: studentName || '',
    }
  );

  // Data loading states
  const [programsData, setProgramsData] = useState<unknown[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [requirementsData, setRequirementsData] = useState<Requirement[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get visible steps
  const visibleSteps = useMemo(() => getVisibleSteps(state), [state]);
  const currentVisibleStepIndex = useMemo(
    () =>
      visibleSteps.findIndex(
        (step) => getStepConfig(state)[state.currentStep]?.id === step.id
      ),
    [visibleSteps, state]
  );

  // Load programs when program step is reached
  useEffect(() => {
    const stepConfig = getStepConfig(state);
    if (
      state.currentStep === 2 &&
      stepConfig[2].shouldShow() &&
      programsData.length === 0 &&
      onLoadPrograms
    ) {
      const loadPrograms = async () => {
        setLoadingPrograms(true);
        try {
          console.log('Loading programs for studentId:', studentId);
          const data = await onLoadPrograms(studentId);
          console.log('Loaded programs:', data);
          setProgramsData(data || []);
        } catch (error) {
          console.error('Failed to load programs:', error);
          setError('Failed to load available programs');
        } finally {
          setLoadingPrograms(false);
        }
      };
      loadPrograms();
    }
  }, [state, state.currentStep, onLoadPrograms, studentId, programsData.length, setError]);

  // Load requirements when in manual mode
  useEffect(() => {
    const stepConfig = getStepConfig(state);
    if (
      state.currentStep === 5 &&
      stepConfig[5].shouldShow() &&
      state.selectedPrograms.length > 0 &&
      onLoadRequirements &&
      requirementsData.length === 0
    ) {
      const loadRequirements = async () => {
        setLoadingRequirements(true);
        try {
          const data = await onLoadRequirements(state.selectedPrograms);
          setRequirementsData(data);
        } catch (error) {
          console.error('Failed to load requirements:', error);
          setError('Failed to load course requirements');
        } finally {
          setLoadingRequirements(false);
        }
      };
      loadRequirements();
    }
  }, [
    state,
    state.currentStep,
    state.selectedPrograms,
    onLoadRequirements,
    requirementsData.length,
    setError,
  ]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    const nextStep = state.currentStep + 1;
    if (nextStep < getStepConfig(state).length) {
      setStep(nextStep);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state, setStep]);

  const goToPreviousStep = useCallback(() => {
    if (state.currentStep > 0) {
      setStep(state.currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state, setStep]);

  // Handle step submission
  const handleSubmitPlan = useCallback(async () => {
    if (!onSubmitPlan) {
      console.error('onSubmitPlan handler not provided');
      return;
    }

    setSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      const result = await onSubmitPlan(state);
      if (result.success) {
        // Success - call completion callback
        if (onComplete) {
          onComplete(state);
        }
      } else {
        setError(result.error || 'Failed to create graduation plan');
      }
    } catch (error) {
      console.error('Error submitting plan:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred'
      );
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }, [state, onSubmitPlan, setLoading, setError, onComplete]);

  // Current step index for rendering
  const stepConfig = getStepConfig(state);
  const currentStepId = stepConfig[state.currentStep]?.id;

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStepId) {
      case 'name':
        return (
          <NameStep
            state={state}
            onNameChange={setStudentName}
            onNext={goToNextStep}
            onBack={state.currentStep > 0 ? goToPreviousStep : undefined}
          />
        );

      case 'student-type':
        return (
          <StudentTypeStep
            state={state}
            onTypeSelect={setStudentType}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case 'programs':
        return (
          <ProgramStep
            state={state}
            onProgramsSelect={setPrograms}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            availablePrograms={programsData.map((p: any) => ({
              id: p.id,
              name: p.name,
              type: p.program_type || 'major',
            }))}
            isLoadingPrograms={loadingPrograms}
          />
        );

      case 'gen-ed-strategy':
        return (
          <GenEdStrategyStep
            state={state}
            onStrategySelect={setGenEdStrategy}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case 'plan-mode':
        return (
          <PlanModeStep
            state={state}
            onModeSelect={setPlanMode}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );

      case 'course-selection':
        return (
          <CourseSelectionStep
            state={state}
            requirements={requirementsData}
            onCourseSelect={updateCourseSelection}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            isLoadingRequirements={loadingRequirements}
          />
        );

      case 'electives':
        return (
          <ElectivesStep
            state={state}
            onAddElective={addElective}
            onRemoveElective={removeElective}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            searchCourses={onSearchCourses}
          />
        );

      case 'review':
        return (
          <ReviewStep
            state={state}
            onPlanNameChange={setPlanName}
            onSubmit={handleSubmitPlan}
            onBack={goToPreviousStep}
            isSubmitting={submitting}
            error={state.error ?? undefined}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <>
      <ProgressBar
        currentStep={currentVisibleStepIndex}
        totalSteps={visibleSteps.length}
      />

      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        {renderCurrentStep()}
      </div>
    </>
  );
};

export default GradPlanWizard;
