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
      selectedGenEdProgramId: null,
      selectedGenEdProgramName: null,
      hasTranscript: false,
      needsTranscriptUpdate: false,
      transcriptUploaded: false,
      planStartTerm: null,
      planStartYear: null,
      selectedPrograms: [],
      courseSelectionMethod: null,
      selectedCourses: [],
      totalSelectedCredits: 0,
      electiveCourses: [],
      needsElectives: false,
      studentInterests: null,
      creditDistributionStrategy: null,
      milestones: [],
      workConstraints: null,
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

    case ConversationStep.PROFILE_CHECK:
      // Profile data is now fetched from student table - always valid
      break;

    case ConversationStep.CAREER_PATHFINDER:
      // Optional step - always valid
      break;

    case ConversationStep.PROGRAM_PATHFINDER:
      // Optional step - always valid
      break;

    case ConversationStep.TRANSCRIPT_CHECK:
      // Just asking questions - always valid
      break;

    case ConversationStep.PROGRAM_SELECTION:
      if (state.collectedData.selectedPrograms.length === 0) {
        errors.push('At least one program must be selected');
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

    case ConversationStep.STUDENT_INTERESTS:
      // Optional - always valid
      break;

    case ConversationStep.CREDIT_DISTRIBUTION:
      if (!state.collectedData.creditDistributionStrategy) {
        errors.push('Credit distribution strategy must be selected');
      }
      break;

    case ConversationStep.MILESTONES_AND_CONSTRAINTS:
      if (!state.collectedData.workConstraints) {
        errors.push('Work status must be selected');
      }
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
    ConversationStep.PROFILE_CHECK,
    ConversationStep.CAREER_PATHFINDER,
    ConversationStep.PROGRAM_PATHFINDER,
    ConversationStep.TRANSCRIPT_CHECK,
    ConversationStep.PROGRAM_SELECTION,
    ConversationStep.COURSE_METHOD,
    ConversationStep.COURSE_SELECTION,
    ConversationStep.ELECTIVES,
    ConversationStep.STUDENT_INTERESTS,
    ConversationStep.CREDIT_DISTRIBUTION,
    ConversationStep.MILESTONES_AND_CONSTRAINTS,
    ConversationStep.GENERATING_PLAN,
    ConversationStep.COMPLETE,
  ];

  const currentStepIndex = stepOrder.indexOf(state.currentStep);
  const completionPercentage = (state.completedSteps.length / stepOrder.length) * 100;

  const collectedFields = [];

  // General education requirements
  if (state.collectedData.selectedGenEdProgramName) {
    collectedFields.push({
      field: 'genEdRequirements',
      label: 'Gen Ed Requirements',
      value: state.collectedData.selectedGenEdProgramName,
      completed: true,
    });
  }

  // Transcript - Show status if transcript check step is completed
  if (state.completedSteps.includes(ConversationStep.TRANSCRIPT_CHECK)) {
    let transcriptValue = 'Not using transcript';

    if (state.collectedData.hasTranscript) {
      if (state.collectedData.transcriptUploaded) {
        transcriptValue = 'New transcript uploaded';
      } else if (state.collectedData.needsTranscriptUpdate) {
        transcriptValue = 'Transcript updated';
      } else {
        transcriptValue = 'Using existing transcript';
      }
    }

    collectedFields.push({
      field: 'transcript',
      label: 'Transcript Status',
      value: transcriptValue,
      completed: true,
    });
  }

  if (state.collectedData.planStartTerm && state.collectedData.planStartYear) {
    collectedFields.push({
      field: 'planStart',
      label: 'Plan Start',
      value: `${state.collectedData.planStartTerm} ${state.collectedData.planStartYear}`,
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

  // Total Selected Credits
  if (state.collectedData.totalSelectedCredits > 0) {
    collectedFields.push({
      field: 'totalCredits',
      label: 'Total Credits',
      value: `${state.collectedData.totalSelectedCredits} credits`,
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

  // Credit Distribution Strategy
  if (state.collectedData.creditDistributionStrategy) {
    const strategyLabels = {
      fast_track: 'Fast Track',
      balanced: 'Balanced',
      explore: 'Explore',
    };
    collectedFields.push({
      field: 'creditStrategy',
      label: 'Credit Strategy',
      value: strategyLabels[state.collectedData.creditDistributionStrategy.type],
      completed: true,
    });

    // Show selected terms if available
    const selectedTermIds = state.collectedData.creditDistributionStrategy.selectedTermIds;
    if (selectedTermIds && selectedTermIds.length > 0) {
      // Format term IDs to readable labels (capitalize)
      const termLabels = selectedTermIds.map(termId =>
        termId.charAt(0).toUpperCase() + termId.slice(1)
      ).join(', ');

      collectedFields.push({
        field: 'selectedTerms',
        label: 'Terms Included in Plan',
        value: termLabels,
        completed: true,
      });
    } else if (state.collectedData.creditDistributionStrategy.includeSecondaryCourses) {
      // Fallback for old data without selectedTermIds
      collectedFields.push({
        field: 'secondaryTerms',
        label: 'Spring & Summer Terms',
        value: 'Included',
        completed: true,
      });
    }
  }

  // Milestones
  if (state.collectedData.milestones.length > 0) {
    collectedFields.push({
      field: 'milestones',
      label: 'Milestones',
      value: `${state.collectedData.milestones.length} milestone${state.collectedData.milestones.length > 1 ? 's' : ''}`,
      completed: true,
    });
  }

  // Work Constraints
  if (state.collectedData.workConstraints) {
    const workStatusLabels = {
      not_working: 'Not Working',
      part_time: 'Part-time Work',
      full_time: 'Full-time Work',
      variable: 'Variable Schedule',
    };
    collectedFields.push({
      field: 'workStatus',
      label: 'Work Status',
      value: workStatusLabels[state.collectedData.workConstraints.workStatus],
      completed: true,
    });
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
    [ConversationStep.PROFILE_CHECK]: 'Profile Check',
    [ConversationStep.CAREER_PATHFINDER]: 'Career Exploration',
    [ConversationStep.PROGRAM_PATHFINDER]: 'Program Exploration',
    [ConversationStep.TRANSCRIPT_CHECK]: 'Transcript Review',
    [ConversationStep.PROGRAM_SELECTION]: 'Program Selection',
    [ConversationStep.COURSE_METHOD]: 'Course Selection Method',
    [ConversationStep.COURSE_SELECTION]: 'Course Selection',
    [ConversationStep.ELECTIVES]: 'Elective Courses',
    [ConversationStep.STUDENT_INTERESTS]: 'Your Interests',
    [ConversationStep.CREDIT_DISTRIBUTION]: 'Credit Distribution',
    [ConversationStep.MILESTONES_AND_CONSTRAINTS]: 'Milestones & Constraints',
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

  // Profile data (now from student table, not grad plan state)
  // These are checked during PROFILE_CHECK step, so they should exist

  if (state.collectedData.selectedPrograms.length === 0) {
    errors.push('At least one program must be selected');
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

  if (!state.collectedData.creditDistributionStrategy) {
    errors.push('Credit distribution strategy must be selected');
  }

  if (!state.collectedData.workConstraints) {
    errors.push('Work status must be specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}
