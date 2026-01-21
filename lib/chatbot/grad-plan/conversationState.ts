/**
 * Conversation state machine for graduation plan chatbot
 * Handles step transitions and determines next steps based on collected data
 */

import { ConversationState, ConversationStep } from './types';

/**
 * Determines the next step in the conversation based on current state
 */
export function getNextStep(state: ConversationState): ConversationStep {
  const { currentStep, collectedData } = state;

  switch (currentStep) {
    case ConversationStep.INITIALIZE:
      // After initialization, always go to profile check
      return ConversationStep.PROFILE_CHECK;

    case ConversationStep.PROFILE_CHECK:
      // After basic profile setup, go to transcript check
      return ConversationStep.TRANSCRIPT_CHECK;

    case ConversationStep.CAREER_PATHFINDER:
      // After career pathfinder, go to transcript check
      return ConversationStep.TRANSCRIPT_CHECK;

    case ConversationStep.PROGRAM_PATHFINDER:
      // After program pathfinder, go to program selection
      return ConversationStep.PROGRAM_SELECTION;

    case ConversationStep.STUDENT_INTERESTS:
      // After student interests, go to credit distribution
      return ConversationStep.CREDIT_DISTRIBUTION;

    case ConversationStep.TRANSCRIPT_CHECK:
      // After transcript check/upload, go to program selection
      return ConversationStep.PROGRAM_SELECTION;

    case ConversationStep.PROGRAM_SELECTION:
      // After program selection, ask about course selection method
      return ConversationStep.COURSE_METHOD;

    case ConversationStep.COURSE_METHOD:
      // If manual course selection chosen, go to course selection
      // If AI chosen, skip to electives check
      if (collectedData.courseSelectionMethod === 'manual') {
        return ConversationStep.COURSE_SELECTION;
      }
      // Check if electives are needed
      return determineElectivesStep(state);

    case ConversationStep.COURSE_SELECTION:
      // After manual course selection, check if electives are needed
      return determineElectivesStep(state);

    case ConversationStep.ELECTIVES:
      // After electives, go to credit distribution
      return ConversationStep.CREDIT_DISTRIBUTION;

    case ConversationStep.CREDIT_DISTRIBUTION:
      // After credit distribution, go to milestones and constraints
      return ConversationStep.MILESTONES_AND_CONSTRAINTS;

    case ConversationStep.MILESTONES_AND_CONSTRAINTS:
      // After milestones and constraints, generate the plan
      return ConversationStep.GENERATING_PLAN;

    case ConversationStep.GENERATING_PLAN:
      // After generation, mark as complete
      return ConversationStep.COMPLETE;

    case ConversationStep.COMPLETE:
      // No next step - conversation is done
      return ConversationStep.COMPLETE;

    default:
      // Fallback - should not happen
      return state.currentStep;
  }
}

/**
 * Determines if we need the electives step or can skip it
 */
function determineElectivesStep(state: ConversationState): ConversationStep {
  // TODO: This logic should check if the selected programs require electives
  // For now, we'll always ask about electives
  // In the future, we can check program requirements to see if electives are needed

  const programsRequireElectives = checkIfProgramsRequireElectives(state);

  if (programsRequireElectives) {
    return ConversationStep.ELECTIVES;
  }

  // Skip electives and go to credit distribution
  return ConversationStep.CREDIT_DISTRIBUTION;
}

/**
 * Checks if any selected programs require elective courses
 * TODO: Implement actual logic to check program requirements
 */
function checkIfProgramsRequireElectives(state: ConversationState): boolean {
  // Placeholder - assume electives are needed
  // In production, this should query program requirements
  return state.collectedData.selectedPrograms.length > 0;
}

/**
 * Gets the previous step (for back navigation)
 */
export function getPreviousStep(state: ConversationState): ConversationStep | null {
  const { currentStep, collectedData } = state;

  switch (currentStep) {
    case ConversationStep.INITIALIZE:
      return null; // Can't go back from start

    case ConversationStep.PROFILE_CHECK:
      return ConversationStep.INITIALIZE;

    case ConversationStep.CAREER_PATHFINDER:
      return ConversationStep.PROFILE_CHECK;

    case ConversationStep.PROGRAM_PATHFINDER:
      return ConversationStep.PROGRAM_SELECTION;

    case ConversationStep.STUDENT_INTERESTS:
      // Could have come from profile or career pathfinder
      if (state.completedSteps.includes(ConversationStep.CAREER_PATHFINDER)) {
        return ConversationStep.CAREER_PATHFINDER;
      }
      return ConversationStep.PROFILE_CHECK;

    case ConversationStep.TRANSCRIPT_CHECK:
      return ConversationStep.PROFILE_CHECK;

    case ConversationStep.PROGRAM_SELECTION:
      return ConversationStep.TRANSCRIPT_CHECK;

    case ConversationStep.COURSE_METHOD:
      return ConversationStep.PROGRAM_SELECTION;

    case ConversationStep.COURSE_SELECTION:
      return ConversationStep.COURSE_METHOD;

    case ConversationStep.ELECTIVES:
      // Could have come from course selection or course method
      if (collectedData.courseSelectionMethod === 'manual') {
        return ConversationStep.COURSE_SELECTION;
      }
      return ConversationStep.COURSE_METHOD;

    case ConversationStep.CREDIT_DISTRIBUTION:
      // Could have come from electives or skipped electives
      if (state.completedSteps.includes(ConversationStep.ELECTIVES)) {
        return ConversationStep.ELECTIVES;
      }
      if (collectedData.courseSelectionMethod === 'manual') {
        return ConversationStep.COURSE_SELECTION;
      }
      return ConversationStep.COURSE_METHOD;

    case ConversationStep.MILESTONES_AND_CONSTRAINTS:
      return ConversationStep.CREDIT_DISTRIBUTION;

    case ConversationStep.GENERATING_PLAN:
      return ConversationStep.MILESTONES_AND_CONSTRAINTS;

    case ConversationStep.COMPLETE:
      return ConversationStep.GENERATING_PLAN;

    default:
      return null;
  }
}

/**
 * Checks if a step can be skipped based on conditions
 */
export function canSkipStep(state: ConversationState, step: ConversationStep): boolean {
  switch (step) {
    case ConversationStep.CAREER_PATHFINDER:
      // Career pathfinder is always optional
      return true;

    case ConversationStep.TRANSCRIPT_CHECK:
      // Cannot skip - we need to know about transcript status
      return false;

    case ConversationStep.COURSE_SELECTION:
      // Can skip if AI method chosen
      return state.collectedData.courseSelectionMethod === 'ai';

    case ConversationStep.ELECTIVES:
      // Can skip if programs don't require electives
      return !checkIfProgramsRequireElectives(state);

    case ConversationStep.MILESTONES_AND_CONSTRAINTS:
      // Milestones and constraints are optional - can be skipped
      return true;

    default:
      // Most steps cannot be skipped
      return false;
  }
}

/**
 * Gets all required steps for the current state
 */
export function getRequiredSteps(state: ConversationState): ConversationStep[] {
  const required: ConversationStep[] = [
    ConversationStep.INITIALIZE,
    ConversationStep.PROFILE_CHECK,
    ConversationStep.TRANSCRIPT_CHECK,
    ConversationStep.PROGRAM_SELECTION,
    ConversationStep.COURSE_METHOD,
  ];

  // Add course selection if manual method
  if (state.collectedData.courseSelectionMethod === 'manual') {
    required.push(ConversationStep.COURSE_SELECTION);
  }

  // Add electives if needed
  if (checkIfProgramsRequireElectives(state)) {
    required.push(ConversationStep.ELECTIVES);
  }

  // Always required at the end
  required.push(ConversationStep.CREDIT_DISTRIBUTION);
  required.push(ConversationStep.GENERATING_PLAN);
  required.push(ConversationStep.COMPLETE);

  return required;
}

/**
 * Checks if conversation can proceed to next step
 */
export function canProceedToNextStep(state: ConversationState): boolean {
  // Check if current step has required data
  const { currentStep, collectedData } = state;

  switch (currentStep) {
    case ConversationStep.INITIALIZE:
      return true; // Just needs to fetch data

    case ConversationStep.PROFILE_CHECK:
      return true; // Profile check validates required data internally

    case ConversationStep.CAREER_PATHFINDER:
      return true; // Career pathfinder is optional, doesn't block progression

    case ConversationStep.PROGRAM_PATHFINDER:
      return true; // Program pathfinder is optional, doesn't block progression

    case ConversationStep.TRANSCRIPT_CHECK:
      return true; // Just asking questions, always can proceed

    case ConversationStep.PROGRAM_SELECTION:
      return collectedData.selectedPrograms.length > 0;

    case ConversationStep.COURSE_METHOD:
      return !!collectedData.courseSelectionMethod;

    case ConversationStep.COURSE_SELECTION:
      // If manual, need courses selected
      return collectedData.courseSelectionMethod === 'ai' ||
        collectedData.selectedCourses.length > 0;

    case ConversationStep.ELECTIVES:
      // Optional step, always can proceed
      return true;

    case ConversationStep.STUDENT_INTERESTS:
      // Optional step, always can proceed
      return true;

    case ConversationStep.CREDIT_DISTRIBUTION:
      // Optional, always can proceed
      return true;

    case ConversationStep.MILESTONES_AND_CONSTRAINTS:
      // Optional, always can proceed
      return true;

    case ConversationStep.GENERATING_PLAN:
      // In progress, can't proceed manually
      return false;

    case ConversationStep.COMPLETE:
      return false; // Already done

    default:
      return false;
  }
}
