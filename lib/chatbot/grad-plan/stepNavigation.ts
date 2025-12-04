/**
 * Step navigation and dependency management for grad plan chatbot
 * Handles going back to previous steps and resetting dependent steps
 */

import { ConversationStep, ConversationState } from './types';
import { updateState } from './stateManager';

/**
 * Defines which steps depend on other steps
 * If a user goes back to a step and changes it, all dependent steps must be reset
 */
export const STEP_DEPENDENCIES: Record<ConversationStep, ConversationStep[]> = {
  [ConversationStep.INITIALIZE]: [],
  [ConversationStep.PROFILE_SETUP]: [
    ConversationStep.CAREER_SELECTION,
    ConversationStep.CAREER_PATHFINDER,
  ],
  [ConversationStep.CAREER_SELECTION]: [],
  [ConversationStep.CAREER_PATHFINDER]: [],
  [ConversationStep.TRANSCRIPT_CHECK]: [],
  [ConversationStep.STUDENT_TYPE]: [
    ConversationStep.PROGRAM_SELECTION,
    ConversationStep.PROGRAM_PATHFINDER,
    ConversationStep.COURSE_METHOD,
    ConversationStep.COURSE_SELECTION,
    ConversationStep.MILESTONES,
  ],
  [ConversationStep.PROGRAM_SELECTION]: [
    ConversationStep.COURSE_METHOD,
    ConversationStep.COURSE_SELECTION,
    ConversationStep.MILESTONES,
  ],
  [ConversationStep.PROGRAM_PATHFINDER]: [],
  [ConversationStep.COURSE_METHOD]: [
    ConversationStep.COURSE_SELECTION,
    ConversationStep.MILESTONES,
  ],
  [ConversationStep.COURSE_SELECTION]: [
    ConversationStep.MILESTONES,
  ],
  [ConversationStep.ELECTIVES]: [],
  [ConversationStep.STUDENT_INTERESTS]: [],
  [ConversationStep.MILESTONES]: [],
  [ConversationStep.ADDITIONAL_CONCERNS]: [],
  [ConversationStep.GENERATING_PLAN]: [],
  [ConversationStep.COMPLETE]: [],
};

/**
 * Defines which data fields are associated with each step
 * Used to clear data when resetting a step
 */
export const STEP_DATA_FIELDS: Record<ConversationStep, Array<keyof ConversationState['collectedData']>> = {
  [ConversationStep.INITIALIZE]: [],
  [ConversationStep.PROFILE_SETUP]: ['estGradDate', 'estGradSem', 'admissionYear', 'isTransfer'],
  [ConversationStep.CAREER_SELECTION]: ['careerGoals'],
  [ConversationStep.CAREER_PATHFINDER]: ['careerGoals'],
  [ConversationStep.TRANSCRIPT_CHECK]: ['hasTranscript', 'needsTranscriptUpdate', 'transcriptUploaded'],
  [ConversationStep.STUDENT_TYPE]: ['studentType'],
  [ConversationStep.PROGRAM_SELECTION]: ['selectedPrograms'],
  [ConversationStep.PROGRAM_PATHFINDER]: [],
  [ConversationStep.COURSE_METHOD]: ['courseSelectionMethod'],
  [ConversationStep.COURSE_SELECTION]: ['selectedCourses'],
  [ConversationStep.ELECTIVES]: ['electiveCourses', 'needsElectives'],
  [ConversationStep.STUDENT_INTERESTS]: ['studentInterests'],
  [ConversationStep.MILESTONES]: ['milestones'],
  [ConversationStep.ADDITIONAL_CONCERNS]: ['additionalConcerns'],
  [ConversationStep.GENERATING_PLAN]: [],
  [ConversationStep.COMPLETE]: [],
};

/**
 * Determines if a user can navigate back to a specific step
 */
export function canNavigateToStep(
  targetStep: ConversationStep,
  completedSteps: ConversationStep[]
): boolean {
  // Can only navigate to completed steps (not upcoming steps)
  return completedSteps.includes(targetStep);
}

/**
 * Gets all steps that need to be reset when navigating back to a target step
 */
export function getStepsToReset(targetStep: ConversationStep): ConversationStep[] {
  const stepsToReset: ConversationStep[] = [];

  // Get direct dependencies
  const directDependencies = STEP_DEPENDENCIES[targetStep] || [];
  stepsToReset.push(...directDependencies);

  // Recursively get dependencies of dependencies
  directDependencies.forEach(depStep => {
    const nestedDeps = getStepsToReset(depStep);
    nestedDeps.forEach(nestedDep => {
      if (!stepsToReset.includes(nestedDep)) {
        stepsToReset.push(nestedDep);
      }
    });
  });

  return stepsToReset;
}

/**
 * Clears data for a specific step
 */
export function clearStepData(
  state: ConversationState,
  step: ConversationStep
): ConversationState {
  const fieldsToClear = STEP_DATA_FIELDS[step] || [];

  const clearedData: Partial<ConversationState['collectedData']> = {};
  fieldsToClear.forEach(field => {
    if (Array.isArray(state.collectedData[field])) {
      clearedData[field] = [] as never;
    } else if (typeof state.collectedData[field] === 'boolean') {
      clearedData[field] = false as never;
    } else {
      clearedData[field] = null as never;
    }
  });

  return updateState(state, { data: clearedData });
}

/**
 * Navigates back to a previous step and resets all dependent steps
 */
export function navigateToStep(
  currentState: ConversationState,
  targetStep: ConversationStep
): ConversationState {
  // Check if navigation is allowed
  if (!canNavigateToStep(targetStep, currentState.completedSteps)) {
    console.warn(`Cannot navigate to step ${targetStep}: step not completed`);
    return currentState;
  }

  // Get all steps that need to be reset
  const stepsToReset = getStepsToReset(targetStep);

  // Clear data for all dependent steps
  let updatedState = currentState;
  stepsToReset.forEach(step => {
    updatedState = clearStepData(updatedState, step);
  });

  // Remove reset steps from completedSteps
  const newCompletedSteps = currentState.completedSteps.filter(
    step => !stepsToReset.includes(step) && step !== targetStep
  );

  // Update to target step
  updatedState = {
    ...updatedState,
    currentStep: targetStep,
    completedSteps: newCompletedSteps,
    updatedAt: new Date(),
  };

  return updatedState;
}

/**
 * Gets a user-friendly message about what will be reset
 */
export function getResetWarningMessage(targetStep: ConversationStep): string | null {
  const stepsToReset = getStepsToReset(targetStep);

  if (stepsToReset.length === 0) {
    return null;
  }

  const stepLabels = stepsToReset.map(step => {
    // Simple label extraction - you can import getStepLabel for better labels
    return step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  });

  return `Going back to this step will reset: ${stepLabels.join(', ')}`;
}
