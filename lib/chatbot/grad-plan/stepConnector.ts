/**
 * Step Connector - Pure orchestration logic for grad plan pipeline
 *
 * Extracted from CreatePlanClient's handleToolComplete, this module provides
 * pure functions that compute state transitions. Given (toolType, result, state, context),
 * it returns a declarative StepTransition describing what should happen next.
 *
 * This makes the orchestration testable, reusable, and decoupled from React.
 */

import type { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import type { ToolResultFor } from './toolResultTypes';
import { ConversationStep, type ConversationState, type StateUpdate, type AgentCheck, type Milestone } from './types';
import { updateState } from './stateManager';
import { getNextStep } from './conversationState';
import { getProgramSelectionConfirmationMessage } from '@/lib/chatbot/tools/programSelectionTool';
import { countTotalCourses, countTotalCredits, getCourseSelectionConfirmationMessage } from '@/lib/chatbot/tools/courseSelectionTool';
import type { CourseSelection } from './types';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';

// ============================================================================
// Context Types
// ============================================================================

export interface StepConnectorContext {
  // Student profile data
  studentProfile: {
    id: string;
    university_id: number;
    student_type?: 'undergraduate' | 'honor' | 'graduate' | null;
    est_grad_date?: string | null;
    admission_year?: number | null;
    is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
  };

  // Course data
  hasCourses: boolean;

  // Academic terms configuration
  academicTerms: AcademicTermsConfig;

  // User ID
  userId: string;
}

// ============================================================================
// Side Effect Types
// ============================================================================

export type SideEffect =
  | { type: 'fetch_student_type' }
  | { type: 'fetch_program_names'; programIds: number[]; universityId: number }
  | { type: 'update_profile'; userId: string; updates: Record<string, unknown> }
  | { type: 'generate_plan'; planData: Record<string, unknown> }
  | { type: 'start_plan_generation' };

// ============================================================================
// Step Transition Type
// ============================================================================

export interface StepTransition {
  // State updates to apply
  stateUpdate: StateUpdate;

  // Next tool to render (null if conversation paused/complete)
  nextTool: ToolType | null;

  // Data for next tool
  nextToolData: Record<string, unknown>;

  // Confirmation message to show user
  confirmationMessage: string;

  // Optional agent check to upsert
  agentCheck?: AgentCheck;

  // Side effects for caller to execute
  sideEffects: SideEffect[];

  // Delay before showing next tool (ms)
  delayMs: number;

  // Optional decision metadata for message
  decisionMeta?: {
    title: string;
    badges: string[];
    evidence: string[];
  };

  // Whether to show feedback UI
  showFeedback?: boolean;

  // Whether to remove welcome message
  removeWelcomeMessage?: boolean;

  // Whether to remove last assistant message
  removeLastAssistantMessage?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolves student type from profile value
 */
function resolveStudentType(
  profileStudentType?: 'undergraduate' | 'honor' | 'graduate' | null
): 'undergraduate' | 'honor' | 'graduate' {
  return profileStudentType || 'undergraduate';
}

/**
 * Gets career selection confirmation message
 */
function getCareerSelectionConfirmationMessage(career: string): string {
  return `Great choice! ${career} is an exciting field with many opportunities.`;
}

// ============================================================================
// Main Compute Function
// ============================================================================

/**
 * Computes the next step transition given a tool completion
 */
export function computeStepTransition<T extends ToolType>(
  toolType: T,
  result: ToolResultFor<T>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  switch (toolType) {
    case 'profile_check':
      return handleProfileCheck(result as ToolResultFor<'profile_check'>, currentState, context);

    case 'transcript_check':
      return handleTranscriptCheck(result as ToolResultFor<'transcript_check'>, currentState, context);

    case 'program_selection':
      return handleProgramSelection(result as ToolResultFor<'program_selection'>, currentState, context);

    case 'course_selection':
      return handleCourseSelection(result as ToolResultFor<'course_selection'>, currentState, context);

    case 'credit_distribution':
      return handleCreditDistribution(result as ToolResultFor<'credit_distribution'>, currentState, context);

    case 'milestones_and_constraints':
      return handleMilestonesAndConstraints(result as ToolResultFor<'milestones_and_constraints'>, currentState, context);

    case 'generate_plan_confirmation':
      return handleGeneratePlanConfirmation(result as ToolResultFor<'generate_plan_confirmation'>, currentState, context);

    case 'active_feedback_plan':
      return handleActiveFeedbackPlan(result as ToolResultFor<'active_feedback_plan'>, currentState, context);

    case 'career_suggestions':
      return handleCareerSuggestions(result as ToolResultFor<'career_suggestions'>, currentState, context);

    case 'program_suggestions':
      return handleProgramSuggestions(result as ToolResultFor<'program_suggestions'>, currentState, context);

    default:
      // Unhandled tool type - return no-op transition
      return {
        stateUpdate: {},
        nextTool: null,
        nextToolData: {},
        confirmationMessage: `Tool ${toolType} completed.`,
        sideEffects: [],
        delayMs: 0,
      };
  }
}

// ============================================================================
// Individual Tool Handlers
// ============================================================================

function handleProfileCheck(
  _result: ToolResultFor<'profile_check'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  const updatedStudentType = resolveStudentType(context.studentProfile.student_type);

  // Update state to mark profile check complete
  const withProfileCheck = updateState(currentState, {
    step: ConversationStep.PROFILE_CHECK,
    data: {
      studentType: updatedStudentType,
    },
    completedStep: ConversationStep.PROFILE_CHECK,
  });

  const nextState = updateState(withProfileCheck, {
    step: getNextStep(withProfileCheck),
  });

  return {
    stateUpdate: {
      step: nextState.currentStep,
      data: {
        studentType: updatedStudentType,
      },
      completedStep: ConversationStep.PROFILE_CHECK,
    },
    nextTool: 'transcript_check',
    nextToolData: {
      hasCourses: context.hasCourses,
      academicTerms: context.academicTerms,
    },
    confirmationMessage: "Perfect! Your profile is all set. Now let's check your transcript status.",
    agentCheck: {
      id: 'profile_check',
      label: 'Profile data verified',
      status: 'ok',
      evidence: ['Student record'],
    },
    sideEffects: [{ type: 'fetch_student_type' }],
    delayMs: 1000,
    removeWelcomeMessage: true,
  };
}

function handleTranscriptCheck(
  result: ToolResultFor<'transcript_check'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  // Update conversation state
  const withTranscript = updateState(currentState, {
    step: ConversationStep.TRANSCRIPT_CHECK,
    data: {
      hasTranscript: result.hasTranscript,
      transcriptUploaded: result.wantsToUpload,
      needsTranscriptUpdate: result.wantsToUpdate || false,
    },
    completedStep: ConversationStep.TRANSCRIPT_CHECK,
  });

  // Move to next step
  const nextState = updateState(withTranscript, {
    step: getNextStep(withTranscript),
  });

  // Build message
  let nextMessage: string;
  if (result.wantsToUpload) {
    nextMessage = "Great! Your transcript has been reviewed and included in your context.";
  } else if (result.hasTranscript) {
    nextMessage = "Perfect! We'll use the transcript you uploaded previously.";
  } else {
    nextMessage = "Okay, we can proceed without a transcript.";
  }
  nextMessage += " Now, let's select your program(s).";

  const currentStudentType = currentState.collectedData.studentType ?? resolveStudentType(context.studentProfile.student_type);

  return {
    stateUpdate: {
      step: nextState.currentStep,
      data: {
        hasTranscript: result.hasTranscript,
        transcriptUploaded: result.wantsToUpload,
        needsTranscriptUpdate: result.wantsToUpdate || false,
      },
      completedStep: ConversationStep.TRANSCRIPT_CHECK,
    },
    nextTool: 'program_selection',
    nextToolData: {
      studentType: currentStudentType,
      universityId: context.studentProfile.university_id,
      studentAdmissionYear: context.studentProfile.admission_year,
      studentIsTransfer: context.studentProfile.is_transfer,
      selectedGenEdProgramId: currentState.collectedData.selectedGenEdProgramId,
      profileId: context.userId,
    },
    confirmationMessage: nextMessage,
    agentCheck: {
      id: 'transcript_check',
      label: 'Transcript status confirmed',
      status: result.hasTranscript ? 'ok' : 'warn',
      evidence: result.hasTranscript ? ['Transcript attached'] : ['No transcript'],
    },
    sideEffects: [],
    delayMs: 1000,
    removeLastAssistantMessage: !result.hasTranscript && !result.wantsToUpload,
  };
}

function handleProgramSelection(
  result: ToolResultFor<'program_selection'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  const programData = result;

  // Build program selections with proper type info
  const selectedPrograms: Array<{
    programId: number;
    programName: string;
    programType: 'major' | 'minor' | 'honors' | 'graduate' | 'general_education';
  }> = [];

  if (programData.studentType !== 'graduate') {
    // Add majors
    programData.programs.majorIds.forEach(id => {
      selectedPrograms.push({
        programId: Number(id),
        programName: '', // Will be populated from actual data
        programType: 'major',
      });
    });

    // Add minors
    if (programData.programs.minorIds) {
      programData.programs.minorIds.forEach(id => {
        selectedPrograms.push({
          programId: Number(id),
          programName: '',
          programType: 'minor',
        });
      });
    }

    // Add gen eds
    if (programData.programs.genEdIds) {
      programData.programs.genEdIds.forEach(id => {
        selectedPrograms.push({
          programId: Number(id),
          programName: '',
          programType: 'general_education',
        });
      });
    }

    // Add honors program if applied
    if ('honorsProgramIds' in programData.programs && programData.programs.honorsProgramIds) {
      programData.programs.honorsProgramIds.forEach(id => {
        selectedPrograms.push({
          programId: Number(id),
          programName: '',
          programType: 'honors',
        });
      });
    }
  } else {
    // Add graduate programs
    programData.programs.graduateProgramIds.forEach(id => {
      selectedPrograms.push({
        programId: Number(id),
        programName: '',
        programType: 'graduate',
      });
    });
  }

  const primaryProgramsCount = selectedPrograms.filter(p => p.programType !== 'general_education').length;
  const programConfirmationMessage = getProgramSelectionConfirmationMessage(
    programData.studentType,
    primaryProgramsCount > 0 ? primaryProgramsCount : selectedPrograms.length
  );

  // Update conversation state
  const withPrograms = updateState(currentState, {
    step: ConversationStep.PROGRAM_SELECTION,
    data: {
      selectedPrograms,
      studentType: programData.studentType,
    },
    completedStep: ConversationStep.PROGRAM_SELECTION,
  });

  // Move to next step
  const nextState = updateState(withPrograms, {
    step: getNextStep(withPrograms),
  });

  // Extract program IDs by type for course selection
  const majorMinorIds = selectedPrograms
    .filter(p => p.programType === 'major' || p.programType === 'minor' || p.programType === 'honors')
    .map(p => p.programId);
  const genEdIds = selectedPrograms
    .filter(p => p.programType === 'general_education')
    .map(p => p.programId);

  return {
    stateUpdate: {
      step: nextState.currentStep,
      data: {
        selectedPrograms,
        studentType: programData.studentType,
      },
      completedStep: ConversationStep.PROGRAM_SELECTION,
    },
    nextTool: 'course_selection',
    nextToolData: {
      studentType: programData.studentType,
      universityId: context.studentProfile.university_id,
      selectedProgramIds: majorMinorIds,
      genEdProgramIds: genEdIds,
      userId: context.userId,
      hasTranscript: currentState.collectedData.hasTranscript ?? false,
    },
    confirmationMessage: programConfirmationMessage,
    agentCheck: {
      id: 'program_selection',
      label: 'Programs selected',
      status: 'ok',
      evidence: [
        `${selectedPrograms.length} program${selectedPrograms.length === 1 ? '' : 's'}`,
      ],
    },
    sideEffects: [
      {
        type: 'fetch_program_names',
        programIds: selectedPrograms.map(p => p.programId),
        universityId: context.studentProfile.university_id,
      },
    ],
    delayMs: 500,
    decisionMeta: {
      title: 'Program decision',
      badges: ['Program selection'],
      evidence: [`${selectedPrograms.length} program${selectedPrograms.length === 1 ? '' : 's'}`],
    },
    showFeedback: true,
  };
}

function handleCourseSelection(
  result: ToolResultFor<'course_selection'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  const courseData = result;

  // Count total courses
  const totalCourses = countTotalCourses(courseData);
  // Count programs excluding general education
  const programCount = courseData.programs.filter(p => p.programType !== 'general_education').length;

  // Update conversation state with course selection data
  const withMethod = updateState(currentState, {
    step: ConversationStep.COURSE_METHOD,
    data: {
      courseSelectionMethod: 'manual',
    },
    completedStep: ConversationStep.COURSE_METHOD,
  });

  const withSelection = updateState(withMethod, {
    step: ConversationStep.COURSE_SELECTION,
    data: {
      selectedCourses: courseData as unknown as CourseSelection[],
      totalSelectedCredits: courseData.totalSelectedCredits || 0,
      remainingCreditsToComplete: courseData.totalCreditsToComplete || courseData.remainingRequirementCredits || 0,
    },
    completedStep: ConversationStep.COURSE_SELECTION,
  });

  // Move to CREDIT_DISTRIBUTION step
  const nextState = updateState(withSelection, {
    step: ConversationStep.CREDIT_DISTRIBUTION,
  });

  const resolvedTotalCredits = (
    courseData.totalCreditsToComplete ||
    courseData.remainingRequirementCredits ||
    courseData.totalSelectedCredits ||
    countTotalCredits(courseData)
  );
  const legacyTotalSelectedCredits = courseData.totalSelectedCredits || countTotalCredits(courseData);
  const confirmationMessage = getCourseSelectionConfirmationMessage(programCount, totalCourses);

  // Calculate total credits for credit distribution
  const totalCredits = resolvedTotalCredits;

  return {
    stateUpdate: {
      step: nextState.currentStep,
      data: {
        courseSelectionMethod: 'manual',
        selectedCourses: courseData as unknown as CourseSelection[],
        totalSelectedCredits: legacyTotalSelectedCredits,
        remainingCreditsToComplete: resolvedTotalCredits,
      },
      completedStep: ConversationStep.COURSE_SELECTION,
    },
    nextTool: 'credit_distribution',
    nextToolData: {
      totalCredits,
      totalCourses,
      studentData: {
        admission_year: context.studentProfile.admission_year || new Date().getFullYear(),
        admission_term: 'Fall', // TODO: Get from student profile
        est_grad_date: context.studentProfile.est_grad_date || '',
      },
      hasTranscript: currentState.collectedData.hasTranscript ?? false,
      academicTerms: context.academicTerms,
    },
    confirmationMessage,
    agentCheck: {
      id: 'course_selection',
      label: 'Course selections validated',
      status: 'ok',
      evidence: [`${totalCourses} courses`, `${resolvedTotalCredits} credits remaining`],
    },
    sideEffects: [],
    delayMs: 1000,
    decisionMeta: {
      title: 'Course decision',
      badges: ['Course selection'],
      evidence: [`${totalCourses} courses`, `${resolvedTotalCredits} credits remaining`],
    },
    showFeedback: true,
  };
}

function handleCreditDistribution(
  result: ToolResultFor<'credit_distribution'>,
  currentState: ConversationState,
  _context: StepConnectorContext
): StepTransition {
  const creditData = result;

  const withCredit = updateState(currentState, {
    step: ConversationStep.CREDIT_DISTRIBUTION,
    data: {
      creditDistributionStrategy: creditData,
    },
    completedStep: ConversationStep.CREDIT_DISTRIBUTION,
  });

  const nextState = updateState(withCredit, {
    step: getNextStep(withCredit),
  });

  return {
    stateUpdate: {
      step: nextState.currentStep,
      data: {
        creditDistributionStrategy: creditData,
      },
      completedStep: ConversationStep.CREDIT_DISTRIBUTION,
    },
    nextTool: 'milestones_and_constraints',
    nextToolData: {
      distribution: creditData.suggestedDistribution,
      studentType: currentState.collectedData.studentType,
    },
    confirmationMessage: "Great! I've saved your credit distribution preferences. Now let's add any important milestones or constraints.",
    agentCheck: {
      id: 'credit_distribution',
      label: 'Credit distribution selected',
      status: 'ok',
      evidence: [creditData.type.replace('_', ' ')],
    },
    sideEffects: [],
    delayMs: 1000,
    decisionMeta: {
      title: 'Distribution decision',
      badges: ['Credit strategy'],
      evidence: [creditData.type.replace('_', ' ')],
    },
    showFeedback: true,
  };
}

function handleMilestonesAndConstraints(
  result: ToolResultFor<'milestones_and_constraints'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  const constraintsData = result;

  const withConstraints = updateState(currentState, {
    step: ConversationStep.MILESTONES_AND_CONSTRAINTS,
    data: {
      milestones: constraintsData.milestones,
      workConstraints: constraintsData.workConstraints,
    },
    completedStep: ConversationStep.MILESTONES_AND_CONSTRAINTS,
  });

  const nextState = updateState(withConstraints, {
    step: getNextStep(withConstraints),
  });

  return {
    stateUpdate: {
      step: nextState.currentStep,
      data: {
        milestones: constraintsData.milestones,
        workConstraints: constraintsData.workConstraints,
      },
      completedStep: ConversationStep.MILESTONES_AND_CONSTRAINTS,
    },
    nextTool: 'generate_plan_confirmation',
    nextToolData: {
      academicTerms: context.academicTerms,
      lastCompletedTerm: null, // TODO: Get from context if available
      preferredStartTerms: undefined,
    },
    confirmationMessage: "Perfect! I've saved your milestones and work constraints.",
    agentCheck: {
      id: 'milestones_constraints',
      label: 'Milestones captured',
      status: 'ok',
      evidence: [
        `${constraintsData.milestones.length} milestone${constraintsData.milestones.length === 1 ? '' : 's'}`,
        constraintsData.workConstraints.workStatus.replace('_', ' '),
      ],
    },
    sideEffects: [],
    delayMs: 1000,
    decisionMeta: {
      title: 'Milestones decision',
      badges: ['Constraints saved'],
      evidence: [`${constraintsData.milestones.length} milestones`],
    },
    showFeedback: true,
  };
}

function handleGeneratePlanConfirmation(
  result: ToolResultFor<'generate_plan_confirmation'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  const confirmationData = result;

  if (confirmationData.action === 'review') {
    // User wants to review - don't generate yet
    return {
      stateUpdate: {},
      nextTool: null,
      nextToolData: {},
      confirmationMessage: "No problem! Take your time to review your information. You can click on any completed step in the sidebar to make changes. When you're ready, we'll generate your plan.",
      sideEffects: [],
      delayMs: 0,
    };
  }

  const generationMode = confirmationData.mode;
  const startTerm = confirmationData.startTerm || '';
  const startYear = confirmationData.startYear || new Date().getFullYear();

  // Store start term/year in conversation state
  const withStartInfo = updateState(currentState, {
    data: {
      planStartTerm: startTerm,
      planStartYear: startYear,
    },
  });

  if (generationMode === 'active_feedback') {
    return {
      stateUpdate: {
        data: {
          planStartTerm: startTerm,
          planStartYear: startYear,
        },
      },
      nextTool: 'active_feedback_plan',
      nextToolData: {
        courseData: withStartInfo.collectedData.selectedCourses,
        suggestedDistribution: withStartInfo.collectedData.creditDistributionStrategy?.suggestedDistribution,
        hasTranscript: withStartInfo.collectedData.hasTranscript ?? false,
        academicTermsConfig: context.academicTerms,
        workStatus: withStartInfo.collectedData.workConstraints?.workStatus,
        milestones: withStartInfo.collectedData.milestones,
      },
      confirmationMessage: `Great choice! We'll start your plan in ${startTerm} ${startYear}. Here is a quick draft. Move courses earlier or later and I'll adjust the plan as you go.`,
      sideEffects: [],
      delayMs: 0,
    };
  }

  // Automatic generation mode
  return {
    stateUpdate: {
      data: {
        planStartTerm: startTerm,
        planStartYear: startYear,
      },
    },
    nextTool: null,
    nextToolData: {},
    confirmationMessage: `Perfect! I'll generate your complete plan starting from ${startTerm} ${startYear}. This may take a moment...`,
    sideEffects: [{ type: 'start_plan_generation' }],
    delayMs: 0,
  };
}

function handleActiveFeedbackPlan(
  result: ToolResultFor<'active_feedback_plan'>,
  _currentState: ConversationState,
  _context: StepConnectorContext
): StepTransition {
  const feedbackResult = result;

  if (feedbackResult.action === 'close') {
    return {
      stateUpdate: {},
      nextTool: null,
      nextToolData: {},
      confirmationMessage: "Got it. I'll pause here. When you're ready, head back to Generate Plan to continue.",
      sideEffects: [],
      delayMs: 0,
    };
  }

  // Generate action
  return {
    stateUpdate: {},
    nextTool: null,
    nextToolData: {},
    confirmationMessage: 'Starting plan generation...',
    sideEffects: [{ type: 'start_plan_generation' }],
    delayMs: 0,
  };
}

function handleCareerSuggestions(
  result: ToolResultFor<'career_suggestions'>,
  _currentState: ConversationState,
  _context: StepConnectorContext
): StepTransition {
  const careerSelection = result;
  const selectedCareer = careerSelection.selectedCareer;

  const confirmationMessage = `${getCareerSelectionConfirmationMessage(selectedCareer)}

One last question: On a scale of 1-10, how committed are you to this career path?

(Don't worry - it's completely okay if you're not 100% sure! We just want to help you set realistic goals for your education.)

1 = Just exploring  |  10 = Absolutely certain`;

  return {
    stateUpdate: {},
    nextTool: null,
    nextToolData: { selectedCareer },
    confirmationMessage,
    sideEffects: [],
    delayMs: 0,
  };
}

function handleProgramSuggestions(
  result: ToolResultFor<'program_suggestions'>,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  const programSelections = result;

  // Update conversation state with program pathfinder completed
  const withPathfinder = updateState(currentState, {
    step: ConversationStep.PROGRAM_PATHFINDER,
    completedStep: ConversationStep.PROGRAM_PATHFINDER,
  });

  // Build confirmation message
  const programNames = programSelections.map(p => p.programName).join(', ');
  const confirmMessage = programSelections.length === 1
    ? `Great choice! ${programNames} is an excellent program. Now let's find the specific version of this program offered at your university.`
    : `Great choices! I've noted your interest in: ${programNames}. Now let's find the specific versions of these programs offered at your university.`;

  const currentStudentType = currentState.collectedData.studentType ?? resolveStudentType(context.studentProfile.student_type);

  return {
    stateUpdate: {
      step: ConversationStep.PROGRAM_SELECTION,
      completedStep: ConversationStep.PROGRAM_PATHFINDER,
    },
    nextTool: 'program_selection',
    nextToolData: {
      studentType: currentStudentType,
      universityId: currentState.universityId,
      studentAdmissionYear: context.studentProfile.admission_year,
      studentIsTransfer: context.studentProfile.is_transfer,
      selectedGenEdProgramId: currentState.collectedData.selectedGenEdProgramId,
      profileId: context.userId,
      suggestedPrograms: programSelections,
    },
    confirmationMessage: confirmMessage,
    sideEffects: [],
    delayMs: 1000,
  };
}

// ============================================================================
// Skip Transition Handler
// ============================================================================

/**
 * Computes transition when a tool is skipped
 */
export function computeSkipTransition(
  skippedToolType: ToolType,
  currentState: ConversationState,
  context: StepConnectorContext
): StepTransition {
  // Most skips just move to next step
  const nextStep = getNextStep(currentState);

  return {
    stateUpdate: {
      step: nextStep,
    },
    nextTool: null, // Caller should determine next tool based on next step
    nextToolData: {},
    confirmationMessage: `Skipped ${skippedToolType.replace(/_/g, ' ')}.`,
    sideEffects: [],
    delayMs: 500,
  };
}
