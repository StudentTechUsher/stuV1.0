/**
 * State manager for graduation plan chatbot conversations
 * Handles state updates, validation, and persistence
 */

import {
  ConversationState,
  ConversationStep,
  StateUpdate,
  ValidationResult,
  ConversationProgress,
} from './types';

/**
 * Creates a new conversation state
 */
export function createInitialState(
  conversationId: string,
  userId: string,
  universityId: number
): ConversationState {
  const now = new Date();

  return {
    conversationId,
    userId,
    universityId,
    createdAt: now,
    updatedAt: now,
    currentStep: ConversationStep.INITIALIZE,
    completedSteps: [],
    collectedData: {
      estGradDate: null,
      estGradSem: null,
      careerGoals: null,
      admissionYear: null,
      isTransfer: null,
      hasTranscript: false,
      needsTranscriptUpdate: false,
      transcriptUploaded: false,
      studentType: null,
      selectedPrograms: [],
      courseSelectionMethod: null,
      selectedCourses: [],
      electiveCourses: [],
      needsElectives: false,
      studentInterests: null,
      milestones: null,
      additionalConcerns: null,
    },
    pendingToolCall: null,
    lastToolResult: null,
  };
}

/**
 * Updates conversation state with new data
 */
export function updateState(
  currentState: ConversationState,
  update: StateUpdate
): ConversationState {
  const updatedState: ConversationState = {
    ...currentState,
    updatedAt: new Date(),
  };

  // Update current step if provided
  if (update.step) {
    updatedState.currentStep = update.step;
  }

  // Update collected data if provided
  if (update.data) {
    updatedState.collectedData = {
      ...currentState.collectedData,
      ...update.data,
    };
  }

  // Mark step as completed if provided
  if (update.completedStep && !currentState.completedSteps.includes(update.completedStep)) {
    updatedState.completedSteps = [...currentState.completedSteps, update.completedStep];
  }

  // Update tool call tracking
  if (update.pendingToolCall !== undefined) {
    updatedState.pendingToolCall = update.pendingToolCall;
  }

  if (update.lastToolResult !== undefined) {
    updatedState.lastToolResult = update.lastToolResult;
  }

  return updatedState;
}

/**
 * Validates if a step can be completed based on collected data
 */
export function validateStepCompletion(
  state: ConversationState,
  step: ConversationStep
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (step) {
    case ConversationStep.INITIALIZE:
      // Always valid - just fetches data
      break;

    case ConversationStep.PROFILE_SETUP:
      if (!state.collectedData.estGradDate) {
        errors.push('Expected graduation date is required');
      }
      if (!state.collectedData.estGradSem) {
        errors.push('Expected graduation semester is required');
      }
      if (!state.collectedData.careerGoals) {
        errors.push('Career goals are required');
      }
      break;

    case ConversationStep.CAREER_PATHFINDER:
      // Optional step - always valid
      break;

    case ConversationStep.TRANSCRIPT_CHECK:
      // Just asking questions - always valid
      break;

    case ConversationStep.STUDENT_TYPE:
      if (!state.collectedData.studentType) {
        errors.push('Student type must be selected');
      }
      break;

    case ConversationStep.PROGRAM_SELECTION:
      if (state.collectedData.selectedPrograms.length === 0) {
        errors.push('At least one program must be selected');
      } else {
        // For undergraduates, ensure they have at least one major (not just gen ed)
        const nonGenEdPrograms = state.collectedData.selectedPrograms.filter(
          p => p.programType !== 'general_education'
        );
        if (state.collectedData.studentType === 'undergraduate' && nonGenEdPrograms.length === 0) {
          errors.push('At least one major or minor must be selected');
        }
      }
      break;

    case ConversationStep.COURSE_METHOD:
      if (!state.collectedData.courseSelectionMethod) {
        errors.push('Course selection method must be chosen');
      }
      break;

    case ConversationStep.COURSE_SELECTION:
      if (
        state.collectedData.courseSelectionMethod === 'manual' &&
        state.collectedData.selectedCourses.length === 0
      ) {
        errors.push('At least one course must be selected');
      }
      break;

    case ConversationStep.ELECTIVES:
      if (state.collectedData.needsElectives && state.collectedData.electiveCourses.length === 0) {
        warnings.push('No elective courses were added');
      }
      break;

    case ConversationStep.ADDITIONAL_CONCERNS:
      // Optional - always valid
      break;

    case ConversationStep.GENERATING_PLAN:
      // Validation happens in plan generation
      break;

    case ConversationStep.COMPLETE:
      // Always valid
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets progress information for UI display
 */
export function getConversationProgress(state: ConversationState): ConversationProgress {
  const stepOrder = [
    ConversationStep.INITIALIZE,
    ConversationStep.PROFILE_SETUP,
    ConversationStep.CAREER_PATHFINDER,
    ConversationStep.TRANSCRIPT_CHECK,
    ConversationStep.STUDENT_TYPE,
    ConversationStep.PROGRAM_SELECTION,
    ConversationStep.COURSE_METHOD,
    ConversationStep.COURSE_SELECTION,
    ConversationStep.ELECTIVES,
    ConversationStep.ADDITIONAL_CONCERNS,
    ConversationStep.GENERATING_PLAN,
    ConversationStep.COMPLETE,
  ];

  const currentStepIndex = stepOrder.indexOf(state.currentStep);
  const completionPercentage = (state.completedSteps.length / stepOrder.length) * 100;

  const collectedFields = [];

  // Profile fields
  if (state.collectedData.estGradDate) {
    collectedFields.push({
      field: 'estGradDate',
      label: 'Graduation Date',
      value: state.collectedData.estGradDate,
      completed: true,
    });
  }

  if (state.collectedData.estGradSem) {
    collectedFields.push({
      field: 'estGradSem',
      label: 'Graduation Semester',
      value: state.collectedData.estGradSem,
      completed: true,
    });
  }

  if (state.collectedData.admissionYear) {
    collectedFields.push({
      field: 'admissionYear',
      label: 'Admission Year',
      value: state.collectedData.admissionYear.toString(),
      completed: true,
    });
  }

  if (state.collectedData.careerGoals) {
    collectedFields.push({
      field: 'careerGoals',
      label: 'Career Goals',
      value: state.collectedData.careerGoals,
      completed: true,
    });
  }

  // Transcript
  if (state.collectedData.hasTranscript) {
    collectedFields.push({
      field: 'transcript',
      label: 'Transcript',
      value: state.collectedData.transcriptUploaded ? 'Uploaded' : 'On file',
      completed: true,
    });
  }

  // Student type
  if (state.collectedData.studentType) {
    collectedFields.push({
      field: 'studentType',
      label: 'Student Type',
      value: state.collectedData.studentType === 'undergraduate' ? 'Undergraduate' : 'Graduate',
      completed: true,
    });
  }

  // Programs (excluding gen ed requirements since they're always required for undergrads)
  if (state.collectedData.selectedPrograms.length > 0) {
    // Filter out general education programs for display
    const nonGenEdPrograms = state.collectedData.selectedPrograms.filter(
      p => p.programType !== 'general_education'
    );

    // Only show non-gen-ed programs (majors, minors, graduate programs)
    if (nonGenEdPrograms.length > 0) {
      collectedFields.push({
        field: 'programs',
        label: 'Programs',
        value: nonGenEdPrograms.map(p => p.programName),
        completed: true,
      });
    }
  }

  // Course selection method
  if (state.collectedData.courseSelectionMethod) {
    collectedFields.push({
      field: 'courseMethod',
      label: 'Course Selection',
      value: state.collectedData.courseSelectionMethod === 'ai' ? 'AI-Selected' : 'Manually Selected',
      completed: true,
    });
  }

  // Courses (if manual)
  if (state.collectedData.selectedCourses.length > 0) {
    collectedFields.push({
      field: 'courses',
      label: 'Courses Selected',
      value: `${state.collectedData.selectedCourses.length} courses`,
      completed: true,
    });
  }

  // Electives
  if (state.collectedData.electiveCourses.length > 0) {
    collectedFields.push({
      field: 'electives',
      label: 'Electives',
      value: `${state.collectedData.electiveCourses.length} elective courses`,
      completed: true,
    });
  }

  // Milestones
  if (state.collectedData.milestones) {
    try {
      const milestonesData = JSON.parse(state.collectedData.milestones) as {
        hasMilestones: boolean;
        milestones?: Array<{ type: string; title: string; timing: string }>;
      };

      if (milestonesData.hasMilestones && milestonesData.milestones && milestonesData.milestones.length > 0) {
        collectedFields.push({
          field: 'milestones',
          label: 'Milestones',
          value: `${milestonesData.milestones.length} milestone${milestonesData.milestones.length > 1 ? 's' : ''} set`,
          completed: true,
        });
      } else {
        collectedFields.push({
          field: 'milestones',
          label: 'Milestones',
          value: 'None',
          completed: true,
        });
      }
    } catch (error) {
      console.error('Error parsing milestones:', error);
    }
  }

  return {
    currentStepNumber: currentStepIndex + 1,
    totalSteps: stepOrder.length,
    currentStepLabel: getStepLabel(state.currentStep),
    completionPercentage: Math.round(completionPercentage),
    collectedFields,
  };
}

/**
 * Gets human-readable label for a conversation step
 */
export function getStepLabel(step: ConversationStep): string {
  const labels: Record<ConversationStep, string> = {
    [ConversationStep.INITIALIZE]: 'Initializing',
    [ConversationStep.PROFILE_SETUP]: 'Profile Setup',
    [ConversationStep.CAREER_SELECTION]: 'Career Selection',
    [ConversationStep.CAREER_PATHFINDER]: 'Career Exploration',
    [ConversationStep.PROGRAM_PATHFINDER]: 'Program Exploration',
    [ConversationStep.TRANSCRIPT_CHECK]: 'Transcript Review',
    [ConversationStep.STUDENT_TYPE]: 'Student Classification',
    [ConversationStep.PROGRAM_SELECTION]: 'Program Selection',
    [ConversationStep.COURSE_METHOD]: 'Course Selection',
    [ConversationStep.COURSE_SELECTION]: 'Course Selection',
    [ConversationStep.ELECTIVES]: 'Elective Courses',
    [ConversationStep.STUDENT_INTERESTS]: 'Your Interests',
    [ConversationStep.MILESTONES]: 'Academic Milestones',
    [ConversationStep.ADDITIONAL_CONCERNS]: 'Additional Concerns',
    [ConversationStep.GENERATING_PLAN]: 'Generate Plan',
    [ConversationStep.COMPLETE]: 'Complete',
  };

  return labels[step];
}

/**
 * Checks if state has all required data for plan generation
 */
export function isReadyForGeneration(state: ConversationState): ValidationResult {
  const errors: string[] = [];

  if (!state.collectedData.estGradDate) {
    errors.push('Graduation date is required');
  }

  if (!state.collectedData.estGradSem) {
    errors.push('Graduation semester is required');
  }

  if (!state.collectedData.studentType) {
    errors.push('Student type is required');
  }

  if (state.collectedData.selectedPrograms.length === 0) {
    errors.push('At least one program must be selected');
  } else {
    // For undergraduates, ensure they have at least one major (not just gen ed)
    const nonGenEdPrograms = state.collectedData.selectedPrograms.filter(
      p => p.programType !== 'general_education'
    );
    if (state.collectedData.studentType === 'undergraduate' && nonGenEdPrograms.length === 0) {
      errors.push('At least one major or minor must be selected');
    }
  }

  if (!state.collectedData.courseSelectionMethod) {
    errors.push('Course selection method must be chosen');
  }

  if (
    state.collectedData.courseSelectionMethod === 'manual' &&
    state.collectedData.selectedCourses.length === 0
  ) {
    errors.push('Courses must be selected for manual mode');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}
