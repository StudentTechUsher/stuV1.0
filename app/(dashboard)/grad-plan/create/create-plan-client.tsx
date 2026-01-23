'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2 } from 'lucide-react';
import TextField from '@mui/material/TextField';
import MarkdownMessage from '@/components/chatbot/MarkdownMessage';
import { StuLoader } from '@/components/ui/StuLoader';
import ConversationProgressSteps from '@/components/chatbot/ConversationProgressSteps';
import ToolRenderer, { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import {
  ConversationState,
  ConversationStep,
  CourseSelection,
  CreditDistributionStrategy,
  Milestone,
} from '@/lib/chatbot/grad-plan/types';
import {
  createInitialState,
  updateState,
  getConversationProgress,
  getStepLabel,
} from '@/lib/chatbot/grad-plan/stateManager';
import {
  generateConversationId,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
} from '@/lib/chatbot/grad-plan/statePersistence';
import { getNextStep } from '@/lib/chatbot/grad-plan/conversationState';
import { navigateToStep } from '@/lib/chatbot/grad-plan/stepNavigation';
import { shouldRequestProfileUpdate } from '@/lib/chatbot/tools/profileUpdateTool';
import { getStudentTypeConfirmationMessage } from '@/lib/chatbot/tools/studentTypeTool';
import { getProgramSelectionConfirmationMessage, type ProgramSelectionInput } from '@/lib/chatbot/tools/programSelectionTool';
import { getCourseSelectionConfirmationMessage, countTotalCourses, countTotalCredits, type CourseSelectionInput } from '@/lib/chatbot/tools/courseSelectionTool';
import { getAdditionalConcernsConfirmationMessage, type AdditionalConcernsInput } from '@/lib/chatbot/tools/additionalConcernsTool';
import { getMilestoneConfirmationMessage, type MilestoneInput } from '@/lib/chatbot/tools/milestoneTool';
import { CAREER_PATHFINDER_INITIAL_MESSAGE, getCareerSelectionConfirmationMessage, type CareerSuggestionsInput, CAREER_PATHFINDER_SYSTEM_PROMPT, careerSuggestionsToolDefinition } from '@/lib/chatbot/tools/careerSuggestionsTool';
import { type ProgramSuggestionsInput, programSuggestionsToolDefinition, buildProgramPathfinderSystemPrompt, fetchAvailableProgramsForRAG } from '@/lib/chatbot/tools/programSuggestionsTool';
import { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';
import { updateProfileForChatbotAction, fetchUserCoursesAction, getAiPromptAction, organizeCoursesIntoSemestersAction, ensureStudentRecordAction } from '@/lib/services/server-actions';
import { findMostRecentTerm } from '@/lib/utils/termCalculation';

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  toolType?: ToolType;
  toolData?: Record<string, unknown>;
  quickReplies?: string[];
}

interface CreatePlanClientProps {
  user: User;
  studentProfile: {
    id: string;
    university_id: number;
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
    [key: string]: unknown;
  };
  hasCourses: boolean;
  hasActivePlan: boolean;
  academicTerms: AcademicTermsConfig;
}

export default function CreatePlanClient({
  user,
  studentProfile,
  hasCourses,
  hasActivePlan,
  academicTerms,
}: Readonly<CreatePlanClientProps>) {
  const router = useRouter();

  // Initialize conversation state
  const [conversationState, setConversationState] = useState<ConversationState>(() => {
    // Create initial state without accessing window (for SSR compatibility)
    const conversationId = generateConversationId();
    return createInitialState(
      conversationId,
      studentProfile.id,
      studentProfile.university_id
    );
  });

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlConversationId = params.get('id');

    if (urlConversationId) {
      const saved = loadStateFromLocalStorage(urlConversationId);
      if (saved) {
        setConversationState(saved);
      }
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const planGenerationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [planGenerationStage, setPlanGenerationStage] = useState<'generating' | 'validating'>('generating');
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to get tool data for plan generation confirmation
  const getGeneratePlanConfirmationToolData = async (): Promise<Record<string, unknown>> => {
    const toolData: Record<string, unknown> = {
      academicTerms,
    };

    // Fetch last completed term from user courses if they have a transcript
    if (conversationState.collectedData.hasTranscript) {
      try {
        const coursesResult = await fetchUserCoursesAction(user.id);
        if (coursesResult.success && coursesResult.courses && coursesResult.courses.length > 0) {
          const terms = coursesResult.courses
            .map(c => c.term)
            .filter((term): term is string => !!term);

          const lastTerm = findMostRecentTerm(terms);
          if (lastTerm) {
            toolData.lastCompletedTerm = lastTerm;
          }
        }
      } catch (error) {
        console.error('Error fetching courses for last term:', error);
      }
    }

    // TODO: Add preferred start terms from student preferences if available
    // This would come from student table or profile preferences

    return toolData;
  };

  // Initialize conversation on mount
  useEffect(() => {
    if (messages.length !== 0) return;

    let isMounted = true;

    const initializeConversation = async () => {
      setIsProcessing(true);

      const studentRecordResult = await ensureStudentRecordAction(user.id);
      if (!isMounted) return;

      if (!studentRecordResult.success) {
        setMessages([
          {
            role: 'assistant',
            content: 'I ran into an issue setting up your student record. Please refresh and try again, or contact support if the issue persists.',
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
        return;
      }

      // Check profile status for messaging
      const profileCheck = shouldRequestProfileUpdate(studentProfile);

      // Create welcome message based on whether user has an active plan
      let welcomeMessage: string;

      if (hasActivePlan) {
        // Returning user with active plan
        welcomeMessage = `Welcome back! I see you already have an active graduation plan. Let's verify your profile information is up to date before we continue.`;
      } else {
        // New user or user without active plan
        welcomeMessage = profileCheck.needsUpdate
          ? `Hi! I'm here to help you create your graduation plan. **This is a quick process** - just a few steps to gather your information. Let's start by checking your profile.${
              profileCheck.hasValues
                ? ' I see you have some information already - please review and update if needed.'
                : ''
            }`
          : `Hi! I'm here to help you create your graduation plan. **This is a quick process** - just a few steps to gather your information. Let's start by checking your profile.`;
      }

      setMessages([
        {
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        },
        {
          role: 'tool',
          content: '',
          timestamp: new Date(),
          toolType: 'profile_check',
          toolData: {
            userId: user.id,
            hasActivePlan,
          },
        },
      ]);
      setActiveTool('profile_check');
      setIsProcessing(false);
    };

    void initializeConversation();

    return () => {
      isMounted = false;
    };
  }, [messages.length, studentProfile, hasActivePlan, user.id, ensureStudentRecordAction, shouldRequestProfileUpdate]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveStateToLocalStorage(conversationState);
  }, [conversationState]);

  // Auto-scroll when messages change
  // When AI responds, scroll so new content appears at top of window
  // Otherwise scroll to bottom
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // If last message is from assistant, scroll to show it at the top
    if (lastMessage.role === 'assistant' && lastAssistantMessageRef.current) {
      lastAssistantMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Otherwise scroll to bottom (e.g., when user sends a message)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-focus input field when AI finishes responding (and no active tool)
  useEffect(() => {
    if (!isProcessing && !activeTool) {
      inputRef.current?.focus();
    }
  }, [isProcessing, activeTool]);

  const handleStepNavigation = (targetStep: ConversationStep) => {
    // Navigate to the target step (this also resets dependent steps)
    const updatedState = navigateToStep(conversationState, targetStep);
    setConversationState(updatedState);

    // Close any active tools
    setActiveTool(null);
    setIsProcessing(true);

    // Clear chat window and add a message indicating we're going back to this step
    setMessages([
      {
        role: 'assistant',
        content: `Okay, let's go back to the **${getStepLabel(targetStep)}** step. I've reset any steps that depended on this information.`,
        timestamp: new Date(),
      },
    ]);

    // Show the appropriate tool for the target step after a brief delay
    setTimeout(async () => {
      let toolMessage: Message | null = null;

      switch (targetStep) {
        case ConversationStep.PROFILE_CHECK:
          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'profile_check',
            toolData: {
              userId: user.id,
            },
          };
          setActiveTool('profile_check');
          break;

        case ConversationStep.TRANSCRIPT_CHECK:
          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'transcript_check',
            toolData: {
              hasCourses,
              academicTerms,
            },
          };
          setActiveTool('transcript_check');
          break;

        case ConversationStep.PROGRAM_SELECTION:
          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'program_selection',
            toolData: {
              // TODO: Fetch studentType from student table
              studentType: (studentProfile as { student_type?: 'undergraduate' | 'graduate' }).student_type || 'undergraduate',
              universityId: updatedState.universityId,
              studentAdmissionYear: (studentProfile as { admission_year?: number }).admission_year,
              studentIsTransfer: (studentProfile as { is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' }).is_transfer,
              selectedGenEdProgramId: updatedState.collectedData.selectedGenEdProgramId,
              profileId: user.id,
            },
          };
          setActiveTool('program_selection');
          break;

        case ConversationStep.COURSE_SELECTION:
          // For course selection, we need the program info
          const selectedPrograms = updatedState.collectedData.selectedPrograms || [];
          const majorMinorIds = selectedPrograms
            .filter(p => p.programType === 'major' || p.programType === 'minor')
            .map(p => p.programId);
          const genEdIds = selectedPrograms
            .filter(p => p.programType === 'general_education')
            .map(p => p.programId);

          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'course_selection',
            toolData: {
              // TODO: Fetch studentType from student table
              studentType: (studentProfile as { student_type?: 'undergraduate' | 'graduate' }).student_type || 'undergraduate',
              universityId: updatedState.universityId,
              selectedProgramIds: majorMinorIds,
              genEdProgramIds: genEdIds,
              userId: user.id,
              hasTranscript: updatedState.collectedData.hasTranscript ?? false,
            },
          };
          setActiveTool('course_selection');
          break;

        case ConversationStep.CREDIT_DISTRIBUTION:
          // Use the totalSelectedCredits from conversation state
          const totalCredits = updatedState.collectedData.totalSelectedCredits || 0;
          const totalCourses = updatedState.collectedData.selectedCourses.length || 0;

          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'credit_distribution',
            toolData: {
              totalCredits,
              totalCourses,
              studentData: {
                admission_year: studentProfile.admission_year || new Date().getFullYear(),
                admission_term: 'Fall', // TODO: Get from student profile
                est_grad_date: studentProfile.est_grad_date || '',
              },
              hasTranscript: updatedState.collectedData.hasTranscript ?? false,
              academicTerms,
            },
          };
          setActiveTool('credit_distribution');
          break;

        case ConversationStep.MILESTONES_AND_CONSTRAINTS:
          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'milestones_and_constraints',
            toolData: {
              distribution: updatedState.collectedData.creditDistributionStrategy?.suggestedDistribution,
            },
          };
          setActiveTool('milestones_and_constraints');
          break;

        case ConversationStep.GENERATING_PLAN: {
          const toolData = await getGeneratePlanConfirmationToolData();
          toolMessage = {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'generate_plan_confirmation',
            toolData,
          };
          setActiveTool('generate_plan_confirmation');
          break;
        }

        default:
          // For other steps, just show a message
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Please use the chat to continue from this step.',
              timestamp: new Date(),
            },
          ]);
          setIsProcessing(false);
          return;
      }

      if (toolMessage) {
        setMessages(prev => [...prev, toolMessage!]);
      }
      setIsProcessing(false);
    }, 500);
  };

  const handleToolComplete = async (toolType: ToolType, result: unknown) => {
    setIsProcessing(true);

    try {
      if (toolType === 'profile_check') {
        // Profile data now stored in student table, not grad plan state
        // Just mark step as complete and move to next
        setActiveTool(null);

        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.PROFILE_CHECK,
            completedStep: ConversationStep.PROFILE_CHECK,
          });
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Remove the welcome message (first message) and add completion message
        setMessages(prev => [
          ...prev.slice(1), // Skip the first message (welcome message)
          {
            role: 'assistant',
            content: 'Perfect! Your profile is all set. Now let\'s check your transcript status.',
            timestamp: new Date(),
          },
        ]);

        // Trigger next step (transcript check)
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'transcript_check',
              toolData: {
                hasCourses,
                academicTerms,
              },
            },
          ]);
          setActiveTool('transcript_check');
          setIsProcessing(false);
        }, 1000);
      } else if (toolType === 'transcript_check') {
        setActiveTool(null);
        const transcriptData = result as {
          hasTranscript: boolean;
          wantsToUpload: boolean;
          wantsToUpdate?: boolean;
        };

        // Update conversation state
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.TRANSCRIPT_CHECK,
            data: {
              hasTranscript: transcriptData.hasTranscript,
              transcriptUploaded: transcriptData.wantsToUpload,
              needsTranscriptUpdate: transcriptData.wantsToUpdate || false,
            },
            completedStep: ConversationStep.TRANSCRIPT_CHECK,
          });

          // Move to next step
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Add appropriate message based on their choice
        let nextMessage: string;

        if (transcriptData.wantsToUpload) {
          nextMessage = 'Great! Your transcript has been reviewed and included in your context.';
        } else if (transcriptData.hasTranscript) {
          nextMessage = 'Perfect! We\'ll use the transcript you uploaded previously.';
        } else {
          nextMessage = 'Okay, we can proceed without a transcript.';
        }
        nextMessage += ' Now, let\'s select your program(s).';

        setMessages(prev => {
          let trimmed = prev.length > 0 ? prev.slice(1) : prev;
          if (!transcriptData.hasTranscript && !transcriptData.wantsToUpload) {
            trimmed = removeLastAssistantMessage(trimmed);
          }
          return [
            ...trimmed,
            {
              role: 'assistant',
              content: nextMessage,
              timestamp: new Date(),
            },
          ];
        });

        // Trigger program selection (student type now part of profile check)
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'program_selection',
              toolData: {
                studentType: 'undergraduate', // TODO: Get from student table
                universityId: studentProfile.university_id,
                profileId: user.id,
              },
            },
          ]);
          setActiveTool('program_selection');
          setIsProcessing(false);
        }, 1000);
      } else if (toolType === 'program_selection') {
        setActiveTool(null);
        const programData = result as ProgramSelectionInput;

        // Build program selections with proper type info
        const selectedPrograms: { programId: number; programName: string; programType: 'major' | 'minor' | 'graduate' | 'general_education' }[] = [];

        if (programData.studentType === 'undergraduate') {
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
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.PROGRAM_SELECTION,
            data: {
              selectedPrograms,
            },
            completedStep: ConversationStep.PROGRAM_SELECTION,
          });

          // Move to next step
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Extract program IDs by type for course selection
        const majorMinorIds = selectedPrograms
          .filter(p => p.programType === 'major' || p.programType === 'minor')
          .map(p => p.programId);
        const genEdIds = selectedPrograms
          .filter(p => p.programType === 'general_education')
          .map(p => p.programId);

        // Show confirmation and then move to course selection tool
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: programConfirmationMessage,
              timestamp: new Date(),
            },
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'course_selection',
              toolData: {
                studentType: programData.studentType,
                universityId: studentProfile.university_id,
                selectedProgramIds: majorMinorIds,
                genEdProgramIds: genEdIds,
                userId: user.id,
                hasTranscript: conversationState.collectedData.hasTranscript ?? false,
              },
            },
          ]);
          setActiveTool('course_selection');
          setIsProcessing(false);
        }, 500);
      } else if (toolType === 'course_selection') {
        setActiveTool(null);
        const courseData = result as CourseSelectionInput;

        // Count total courses
        const totalCourses = countTotalCourses(courseData);
        // Count programs excluding general education (gen eds are always required for undergrads)
        const programCount = courseData.programs.filter(p => p.programType !== 'general_education').length;

        // Update conversation state with course selection data
        setConversationState(prev => {
          // First mark COURSE_METHOD as complete
          const withMethod = updateState(prev, {
            step: ConversationStep.COURSE_METHOD,
            data: {
              courseSelectionMethod: 'manual',
            },
            completedStep: ConversationStep.COURSE_METHOD,
          });

          // Then mark COURSE_SELECTION as complete
          const withSelection = updateState(withMethod, {
            step: ConversationStep.COURSE_SELECTION,
            data: {
              selectedCourses: courseData as unknown as CourseSelection[],
              totalSelectedCredits: courseData.totalSelectedCredits || 0,
            },
            completedStep: ConversationStep.COURSE_SELECTION,
          });

          // Move to CREDIT_DISTRIBUTION step
          return updateState(withSelection, {
            step: ConversationStep.CREDIT_DISTRIBUTION,
          });
        });

        // Add confirmation message
        const confirmationMessage = getCourseSelectionConfirmationMessage(programCount, totalCourses);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Calculate total credits for credit distribution
        const totalCredits = courseData.totalSelectedCredits || countTotalCredits(courseData);

        // Show credit distribution tool
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'credit_distribution',
              toolData: {
                totalCredits,
                totalCourses,
                studentData: {
                  admission_year: (studentProfile as { admission_year?: number }).admission_year || new Date().getFullYear(),
                  admission_term: 'Fall', // TODO: Get from student profile
                  est_grad_date: studentProfile.est_grad_date || '',
                },
                hasTranscript: conversationState.collectedData.hasTranscript ?? false,
                academicTerms,
              },
            },
          ]);
          setActiveTool('credit_distribution');
          setIsProcessing(false);
        }, 1000);

      } else if (toolType === 'credit_distribution') {
        setActiveTool(null);
        const creditData = result as CreditDistributionStrategy;

        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.CREDIT_DISTRIBUTION,
            data: {
              creditDistributionStrategy: creditData,
            },
            completedStep: ConversationStep.CREDIT_DISTRIBUTION,
          });
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Great! I\'ve saved your credit distribution preferences. Now let\'s add any important milestones or constraints.',
            timestamp: new Date(),
          },
        ]);

        // Move to MILESTONES_AND_CONSTRAINTS step
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'milestones_and_constraints',
              toolData: {
                distribution: creditData.suggestedDistribution,
              },
            },
          ]);
          setActiveTool('milestones_and_constraints');
          setIsProcessing(false);
        }, 1000);

      } else if (toolType === 'milestones_and_constraints') {
        setActiveTool(null);
        const constraintsData = result as {
          milestones: Milestone[];
          workConstraints: {
            workStatus: 'not_working' | 'part_time' | 'full_time' | 'variable';
            additionalNotes: string;
          };
        };

        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.MILESTONES_AND_CONSTRAINTS,
            data: {
              milestones: constraintsData.milestones,
              workConstraints: constraintsData.workConstraints,
            },
            completedStep: ConversationStep.MILESTONES_AND_CONSTRAINTS,
          });
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Perfect! I\'ve saved your milestones and work constraints.',
            timestamp: new Date(),
          },
        ]);

        // Move to GENERATING_PLAN step
        setTimeout(async () => {
          const toolData = await getGeneratePlanConfirmationToolData();
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Great! We have all the information we need.',
              timestamp: new Date(),
            },
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'generate_plan_confirmation',
              toolData,
            },
          ]);
          setActiveTool('generate_plan_confirmation');
          setIsProcessing(false);
        }, 1000);

      } else if (toolType === 'generate_plan_confirmation') {
        setActiveTool(null);
        const confirmationData = result as
          | { action: 'generate'; mode: 'automatic' | 'active_feedback'; startTerm: string; startYear: number }
          | { action: 'review' };

        if (confirmationData.action === 'review') {
          // User wants to review - don't generate yet
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'No problem! Take your time to review your information. You can click on any completed step in the sidebar to make changes. When you\'re ready, we\'ll generate your plan.',
              timestamp: new Date(),
            },
          ]);
          setIsProcessing(false);
          return;
        }

        const generationMode = confirmationData.mode;
        const startTerm = confirmationData.startTerm;
        const startYear = confirmationData.startYear;

        // Store start term/year in conversation state
        setConversationState(prev => updateState(prev, {
          data: {
            planStartTerm: startTerm,
            planStartYear: startYear,
          },
        }));

        if (generationMode === 'active_feedback') {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Great choice! We'll start your plan in ${startTerm} ${startYear}. Here is a quick draft. Move courses earlier or later and I'll adjust the plan as you go.`,
              timestamp: new Date(),
            },
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'active_feedback_plan',
              toolData: {
                courseData: conversationState.collectedData.selectedCourses,
                suggestedDistribution: conversationState.collectedData.creditDistributionStrategy?.suggestedDistribution,
                hasTranscript: conversationState.collectedData.hasTranscript ?? false,
                academicTermsConfig: academicTerms,
                workStatus: conversationState.collectedData.workConstraints?.workStatus,
                milestones: conversationState.collectedData.milestones,
              },
            },
          ]);
          setActiveTool('active_feedback_plan');
          setIsProcessing(false);
          return;
        }

        // Automatic generation mode
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Perfect! I'll generate your complete plan starting from ${startTerm} ${startYear}. This may take a moment...`,
            timestamp: new Date(),
          },
        ]);

        startPlanGeneration();

      } else if (toolType === 'active_feedback_plan') {
        setActiveTool(null);
        const feedbackResult = result as { action: 'generate' | 'close'; draftPlan?: unknown };

        if (feedbackResult.action === 'close') {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Got it. I\'ll pause here. When you\'re ready, head back to Generate Plan to continue.',
              timestamp: new Date(),
            },
          ]);
          setIsProcessing(false);
          return;
        }

        startPlanGeneration();

      } else if (toolType === 'career_suggestions') {
        setActiveTool(null);
        const careerSelection = result as { selectedCareer: string };

        // Career goal will be saved to student table after commitment level question
        // Store temporarily in local state for the commitment level question
        const selectedCareer = careerSelection.selectedCareer;

        // Add confirmation message with commitment level question
        const confirmationMessage = `${getCareerSelectionConfirmationMessage(selectedCareer)}

One last question: On a scale of 1-10, how committed are you to this career path?

(Don't worry - it's completely okay if you're not 100% sure! We just want to help you set realistic goals for your education.)

1 = Just exploring  |  10 = Absolutely certain`;

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
            quickReplies: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            // Store career in message metadata for access in commitment handler
            toolData: { selectedCareer },
          },
        ]);

        setIsProcessing(false);

      } else if (toolType === 'program_suggestions') {
        setActiveTool(null);
        const programSelections = result as Array<{ programName: string; programType: string }>;

        // Update conversation state with program pathfinder completed
        setConversationState(prev => updateState(prev, {
          step: ConversationStep.PROGRAM_PATHFINDER,
          completedStep: ConversationStep.PROGRAM_PATHFINDER,
        }));

        // Build confirmation message
        const programNames = programSelections.map(p => p.programName).join(', ');
        const confirmMessage = programSelections.length === 1
          ? `Great choice! ${programNames} is an excellent program. Now let's find the specific version of this program offered at your university.`
          : `Great choices! I've noted your interest in: ${programNames}. Now let's find the specific versions of these programs offered at your university.`;

        // Add confirmation message
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmMessage,
            timestamp: new Date(),
          },
        ]);

        // Move back to program selection with the suggestions
        setTimeout(() => {
          setConversationState(prev => updateState(prev, {
            step: ConversationStep.PROGRAM_SELECTION,
          }));

          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Please review and select the specific program(s) from the list below. I\'ve highlighted programs that match your interests.',
              timestamp: new Date(),
            },
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'program_selection',
              toolData: {
                // TODO: Fetch studentType from student table
                studentType: (studentProfile as { student_type?: 'undergraduate' | 'graduate' }).student_type || 'undergraduate',
                universityId: conversationState.universityId,
                studentAdmissionYear: (studentProfile as { admission_year?: number }).admission_year,
                studentIsTransfer: (studentProfile as { is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' }).is_transfer,
                selectedGenEdProgramId: conversationState.collectedData.selectedGenEdProgramId,
                profileId: user.id,
                suggestedPrograms: programSelections,
              },
            },
          ]);
          setActiveTool('program_selection');
          setIsProcessing(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling tool completion:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
    }
  };

  const handleToolSkip = () => {
    setActiveTool(null);

    // Check which tool was skipped to determine next step
    const lastToolMessage = messages.findLast(m => m.role === 'tool');

    if (lastToolMessage?.toolType === 'profile_check') {
      // Profile data now in student table, just mark profile check as complete
      const hasActivePlanValue = lastToolMessage.toolData?.hasActivePlan;

      if (hasActivePlanValue) {
        // For returning users with active plans, mark profile and transcript as complete
        setConversationState(prev => {
          let updated = updateState(prev, {
            step: ConversationStep.PROFILE_CHECK,
            completedStep: ConversationStep.PROFILE_CHECK,
          });

          // Mark transcript check as complete
          updated = updateState(updated, {
            step: ConversationStep.TRANSCRIPT_CHECK,
            data: {
              hasTranscript: hasCourses,
            },
            completedStep: ConversationStep.TRANSCRIPT_CHECK,
          });

          // Move to program selection
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Trigger program selection
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Great! Keeping your current profile and transcript. Let\'s select your program.',
            timestamp: new Date(),
          },
          {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'program_selection',
            toolData: {
              studentType: 'undergraduate', // TODO: Get from student table
              universityId: studentProfile.university_id,
              profileId: user.id,
            },
          },
        ]);
        setActiveTool('program_selection');
      } else {
        // For new users, follow the normal flow
        // Mark profile check as complete
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.PROFILE_CHECK,
            completedStep: ConversationStep.PROFILE_CHECK,
          });

          // Move to next step
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Trigger transcript check step
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Okay, keeping your current profile information. Now let\'s check your transcript status.',
            timestamp: new Date(),
          },
          {
            role: 'tool',
            content: '',
            timestamp: new Date(),
            toolType: 'transcript_check',
            toolData: {
              hasCourses,
              academicTerms,
            },
          },
        ]);
        setActiveTool('transcript_check');
      }
    } else {
      // Generic skip for other tools
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Okay, let\'s continue with the next step.',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleCareerPathfinderClick = (industries?: string) => {
    // Hide the profile update form
    setActiveTool(null);

    // Update state to career pathfinder step
    setConversationState(prev => updateState(prev, {
      step: ConversationStep.CAREER_PATHFINDER,
    }));

    // Generate industry-specific quick replies if industries were selected
    let quickReplies: string[] | undefined;
    if (industries) {
      // Map industries to relevant subjects/activities
      const industryMap: Record<string, string[]> = {
        'Technology & Software': ['Programming & coding', 'Data analysis', 'System design', 'Problem-solving'],
        'Healthcare & Medical': ['Biology & anatomy', 'Helping people', 'Medical sciences', 'Patient care'],
        'Finance & Business': ['Economics & markets', 'Business strategy', 'Data & analytics', 'Entrepreneurship'],
        'Engineering & Manufacturing': ['Math & physics', 'Building things', 'Design & systems', 'Hands-on projects'],
        'Education & Training': ['Teaching & mentoring', 'Child development', 'Curriculum design', 'Public speaking'],
        'Creative & Media': ['Art & design', 'Writing & storytelling', 'Digital media', 'Creative expression'],
      };

      // Get suggestions from first matched industry
      const industryKey = Object.keys(industryMap).find(key => industries.includes(key));
      if (industryKey) {
        quickReplies = industryMap[industryKey];
      }
    }

    // Add the initial career pathfinder message
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: CAREER_PATHFINDER_INITIAL_MESSAGE,
        timestamp: new Date(),
        quickReplies,
      },
    ]);
  };

  const handleProgramPathfinderClick = () => {
    // Hide the program selection form
    setActiveTool(null);

    // Update state to program pathfinder step
    setConversationState(prev => updateState(prev, {
      step: ConversationStep.PROGRAM_PATHFINDER,
    }));

    // Clear previous messages and start fresh with program pathfinder
    setMessages([
      {
        role: 'assistant',
        content: "Great! Let me help you find the perfect program(s) for your goals. I'll ask you a few questions to understand what you're looking for.\n\nLet's start: What subjects or areas are you most interested in studying?",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isProcessing) return;

    if (conversationState.currentStep === ConversationStep.PROGRAM_PATHFINDER) {
      const userMessageCount = messages.filter(m => m.role === 'user').length;
      if (userMessageCount >= 5) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: "I have enough information to recommend programs for you. Let me provide my suggestions now.",
            timestamp: new Date(),
          },
        ]);
        return;
      }
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Check if this is a commitment level response (1-10) after career selection
      // Find the last assistant message with career data
      const lastAssistantMessage = messages.findLast(m => m.role === 'assistant' && m.toolData?.selectedCareer);
      const isCommitmentResponse = /^(10|[1-9])$/.test(textToSend.trim()) &&
        lastAssistantMessage?.toolData?.selectedCareer &&
        conversationState.currentStep === ConversationStep.CAREER_PATHFINDER;

      if (isCommitmentResponse) {
        // User responded with commitment level
        const commitmentLevel = parseInt(textToSend.trim());
        const selectedCareer = lastAssistantMessage!.toolData!.selectedCareer as string;

        // Provide acknowledgment based on commitment level
        let acknowledgment = '';
        if (commitmentLevel >= 8) {
          acknowledgment = "That's great! Having a clear direction will really help us tailor your graduation plan.";
        } else if (commitmentLevel >= 5) {
          acknowledgment = "Perfect! It's good to have a direction while staying open to opportunities.";
        } else {
          acknowledgment = "That's completely fine! Exploring your options is an important part of the process.";
        }

        // Update profile with the career goal (saved to student table)
        await updateProfileForChatbotAction(user.id, {
          careerGoals: selectedCareer,
        });

        // Complete CAREER_PATHFINDER step and move to transcript check
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.CAREER_PATHFINDER,
            completedStep: ConversationStep.CAREER_PATHFINDER,
          });

          return updateState(updated, {
            step: ConversationStep.TRANSCRIPT_CHECK,
          });
        });

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `${acknowledgment} Now, let's check your transcript status.`,
            timestamp: new Date(),
          },
        ]);

        // Trigger transcript check step
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'transcript_check',
              toolData: {
                hasCourses,
                academicTerms,
              },
            },
          ]);
          setActiveTool('transcript_check');
          setIsProcessing(false);
        }, 1000);
        return;
      }

      // Send to AI if in career pathfinder mode
      if (conversationState.currentStep === ConversationStep.CAREER_PATHFINDER) {
        // Build conversation history for OpenAI
        const conversationHistory = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // Add the current user message
        conversationHistory.push({
          role: 'user',
          content: userMessage.content,
        });

        // Call OpenAI API
        const response = await fetch('/api/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: conversationHistory,
            systemPrompt: CAREER_PATHFINDER_SYSTEM_PROMPT,
            tools: [careerSuggestionsToolDefinition],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();

        // Check if AI called the suggest_careers tool
        if (data.tool_calls && data.tool_calls.length > 0) {
          const toolCall = data.tool_calls[0];
          if (toolCall.function.name === 'suggest_careers') {
            // Parse the career suggestions
            const careerSuggestions: CareerSuggestionsInput = JSON.parse(toolCall.function.arguments);

            // Add AI response and tool display (userMessage already added at line 695)
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: "Great! Based on our conversation, I've identified some career paths that align well with your interests and strengths:",
                timestamp: new Date(),
              },
              {
                role: 'tool',
                content: '',
                timestamp: new Date(),
                toolType: 'career_suggestions',
                toolData: {
                  careerSuggestions,
                },
              },
            ]);
            setActiveTool('career_suggestions');
            setIsProcessing(false);
            return;
          }
        }

        // No tool call - just show AI's message
        if (data.content) {
          // Try to parse as JSON for structured responses with quick replies
          let messageContent = data.content;
          let quickReplies: string[] | undefined;

          try {
            const parsed = JSON.parse(data.content);
            if (parsed.message) {
              messageContent = parsed.message;
              quickReplies = parsed.quickReplies;
            }
          } catch {
            // Not JSON, use as plain text
          }

          // If no quickReplies in JSON, try to extract from numbered/bulleted lists
          if (!quickReplies) {
            const listMatches = messageContent.match(/(?:^|\n)(?:\d+\.|[-•*])\s*(.+?)(?=\n|$)/g);
            if (listMatches && listMatches.length >= 2 && listMatches.length <= 6) {
              quickReplies = listMatches.map((match: string) =>
                match.replace(/^(?:\d+\.|[-•*])\s*/, '').trim()
              );
              // Remove the list from the message content
              messageContent = messageContent.replace(/(?:^|\n)(?:\d+\.|[-•*])\s*.+/g, '').trim();
            }
          }

          // If still no quickReplies, try to extract from inline options (e.g., "A, B, or C")
          if (!quickReplies) {
            // Match patterns like "office setting, remote work, or something else"
            const inlineMatch = messageContent.match(/(?:prefer|like|want|choose|select)\s+(?:an?\s+)?([^?]+?(?:,\s*(?:or\s+)?[^?,]+)+)/i);
            if (inlineMatch) {
              const optionsText = inlineMatch[1];
              // Split on comma or "or"
              const options = optionsText.split(/,\s*(?:or\s+)?|\s+or\s+/)
                .map((opt: string) => opt.trim())
                .filter((opt: string) => opt.length > 0 && opt.length < 50); // Reasonable length

              if (options.length >= 2 && options.length <= 6) {
                // Capitalize first letter of each option
                quickReplies = options.map((opt: string) =>
                  opt.charAt(0).toUpperCase() + opt.slice(1)
                );
              }
            }
          }

          // Add AI response to messages
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: messageContent,
              timestamp: new Date(),
              quickReplies,
            },
          ]);
        }
      } else if (conversationState.currentStep === ConversationStep.PROGRAM_PATHFINDER) {
        // Build conversation history for OpenAI
        const conversationHistory = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        // Add the current user message
        conversationHistory.push({
          role: 'user',
          content: userMessage.content,
        });

        // Fetch available programs for RAG context
        // TODO: Get studentType from student table
        const availablePrograms = await fetchAvailableProgramsForRAG(
          conversationState.universityId,
          'undergraduate' // TODO: Fetch from student table
        );

        // Build system prompt with RAG context
        // Career goals are now in student table, not grad plan state
        const systemPrompt = buildProgramPathfinderSystemPrompt(
          availablePrograms,
          undefined // Career goals stored in student table, optional for program pathfinder
        );

        // Call OpenAI API
        const response = await fetch('/api/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: conversationHistory,
            systemPrompt: systemPrompt,
            tools: [programSuggestionsToolDefinition],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();

        // Check if AI called the suggest_programs tool
        if (data.tool_calls && data.tool_calls.length > 0) {
          const toolCall = data.tool_calls[0];
          if (toolCall.function.name === 'suggest_programs') {
            // Parse the program suggestions
            const parsedArgs = JSON.parse(toolCall.function.arguments);
            const programSuggestions: ProgramSuggestionsInput = parsedArgs.suggestions || parsedArgs;

            // Add AI response and tool display
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: "Perfect! Based on our conversation and the programs available at your university, here are my recommendations:",
                timestamp: new Date(),
              },
              {
                role: 'tool',
                content: '',
                timestamp: new Date(),
                toolType: 'program_suggestions',
                toolData: {
                  programSuggestions,
                },
              },
            ]);
            setActiveTool('program_suggestions');
            setIsProcessing(false);
            return;
          }
        }

        // No tool call - just show AI's message
        if (data.content) {
          // Try to parse as JSON for structured responses with quick replies
          let messageContent = data.content;
          let quickReplies: string[] | undefined;

          try {
            const parsed = JSON.parse(data.content);
            if (parsed.message) {
              messageContent = parsed.message;
              quickReplies = parsed.quickReplies;
            }
          } catch {
            // Not JSON, use as plain text
          }

          // If no quickReplies in JSON, try to extract from numbered/bulleted lists
          if (!quickReplies) {
            const listMatches = messageContent.match(/(?:^|\n)(?:\d+\.|[-•*])\s*(.+?)(?=\n|$)/g);
            if (listMatches && listMatches.length >= 2 && listMatches.length <= 6) {
              quickReplies = listMatches.map((match: string) =>
                match.replace(/^(?:\d+\.|[-•*])\s*/, '').trim()
              );
              // Remove the list from the message content
              messageContent = messageContent.replace(/(?:^|\n)(?:\d+\.|[-•*])\s*.+/g, '').trim();
            }
          }

          // If still no quickReplies, try to extract from inline options (e.g., "A, B, or C")
          if (!quickReplies) {
            // Match patterns like "office setting, remote work, or something else"
            const inlineMatch = messageContent.match(/(?:prefer|like|want|choose|select)\s+(?:an?\s+)?([^?]+?(?:,\s*(?:or\s+)?[^?,]+)+)/i);
            if (inlineMatch) {
              const optionsText = inlineMatch[1];
              // Split on comma or "or"
              const options = optionsText.split(/,\s*(?:or\s+)?|\s+or\s+/)
                .map((opt: string) => opt.trim())
                .filter((opt: string) => opt.length > 0 && opt.length < 50); // Reasonable length

              if (options.length >= 2 && options.length <= 6) {
                // Capitalize first letter of each option
                quickReplies = options.map((opt: string) =>
                  opt.charAt(0).toUpperCase() + opt.slice(1)
                );
              }
            }
          }

          // Add AI response to messages
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: messageContent,
              timestamp: new Date(),
              quickReplies,
            },
          ]);
        }
      } else {
        // Not in career pathfinder mode - just echo back
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Thank you for that information.',
            timestamp: new Date(),
          },
        ]);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const _handleCancel = () => {
    router.push('/grad-plan');
  };

  const generationLoadingMessage = 'Perfect! Now let me generate your personalized graduation plan. This may take a moment...';
  const generationLoaderText = planGenerationStage === 'validating'
    ? 'Validating generation output...'
    : 'Generating your personalized graduation plan...';

  const clearPlanGenerationTimer = () => {
    if (planGenerationTimerRef.current !== null) {
      clearTimeout(planGenerationTimerRef.current);
      planGenerationTimerRef.current = null;
    }
  };

  const removeLastAssistantMessage = (messages: Message[]) => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'assistant') {
        return [...messages.slice(0, index), ...messages.slice(index + 1)];
      }
    }
    return messages;
  };

  const runPlanGeneration = async () => {
    try {
      const promptName = 'automatic_generation_mode';
      const promptTemplate = await getAiPromptAction(promptName);
      if (!promptTemplate) {
        throw new Error('Prompt template not found');
      }

      const courseData = conversationState.collectedData.selectedCourses || {};

      let takenCourses: Array<{
        code: string;
        title: string;
        credits: number;
        term: string;
        grade: string;
        status: string;
        source: string;
        fulfills: string[];
      }> = [];
      if (conversationState.collectedData.hasTranscript) {
        const userCoursesResult = await fetchUserCoursesAction(user.id);
        takenCourses = userCoursesResult.success && userCoursesResult.courses
          ? userCoursesResult.courses
              .filter(course => course.code && course.title)
              .map(course => ({
                code: course.code,
                title: course.title,
                credits: course.credits || 3,
                term: course.term || 'Unknown',
                grade: course.grade || 'Completed',
                status: 'Completed',
                source: 'Institutional',
                fulfills: [],
              }))
          : [];
      }

      const programIds = conversationState.collectedData.selectedPrograms.map(p => p.programId);
      const transformedCourseData = {
        ...courseData,
        takenCourses,
        selectionMode: 'MANUAL' as const,
        selectedPrograms: programIds,
        milestones: conversationState.collectedData.milestones || [],
        suggestedDistribution: conversationState.collectedData.creditDistributionStrategy?.suggestedDistribution,
        workStatus: conversationState.collectedData.workConstraints?.workStatus,
        created_with_transcript: conversationState.collectedData.hasTranscript ?? false,
      };

      const result = await organizeCoursesIntoSemestersAction(
        transformedCourseData,
        {
          prompt_name: promptName,
          prompt: promptTemplate,
          model: 'gpt-5-mini',
          max_output_tokens: 25_000,
        }
      );

      if (!result.success || !result.accessId) {
        throw new Error(result.message || 'Failed to generate graduation plan');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `${result.message}\n\n🎉 Your graduation plan has been saved! Redirecting you to the plan editor...`,
          timestamp: new Date(),
        },
      ]);

      setTimeout(() => {
        router.push(`/grad-plan/${result.accessId}`);
      }, 1500);
    } catch (error) {
      console.error('Error generating graduation plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setMessages([
        {
          role: 'assistant',
          content: `I encountered an error while generating your plan:\n\n**Error:** ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
          timestamp: new Date(),
        },
      ]);
      setIsProcessing(false);
    } finally {
      clearPlanGenerationTimer();
      setPlanGenerationStage('generating');
    }
  };

  const startPlanGeneration = () => {
    setMessages([
      {
        role: 'assistant',
        content: generationLoadingMessage,
        timestamp: new Date(),
      },
    ]);
    setIsProcessing(true);
    clearPlanGenerationTimer();
    setPlanGenerationStage('generating');
    planGenerationTimerRef.current = setTimeout(() => {
      setPlanGenerationStage('validating');
    }, 10000);

    setTimeout(() => {
      void runPlanGeneration();
    }, 1000);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Sticky Header with Progress Bar */}
      <div className="flex-shrink-0 bg-card border-b shadow-sm">
        {/* Progress Steps */}
        <div className="max-w-7xl mx-auto px-6 py-1 flex justify-center">
          <div className="w-full max-w-4xl">
            <ConversationProgressSteps
              currentStep={conversationState.currentStep}
              completedSteps={conversationState.completedSteps}
              onStepClick={handleStepNavigation}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1920px] mx-auto px-6 py-2 w-full min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Chat Area - Takes 3/4 on large screens */}
          <div className="lg:col-span-3 h-full min-h-0">
            <div className="border rounded-xl bg-gray-50 dark:bg-zinc-800 shadow-sm flex flex-col h-full max-h-full">
              {/* Messages Container */}
              <div className="flex-1 min-h-0 max-h-full overflow-y-auto pt-3 px-3 pb-0 space-y-2">
                {messages
                  // Hide previous messages when course selection tool is active
                  .filter((_message, index) => {
                    // If course_selection is active, only show the course selection tool and any messages after it
                    if (activeTool === 'course_selection') {
                      // Find the index of the course_selection tool message
                      const courseSelectionIndex = messages.findIndex(
                        m => m.role === 'tool' && m.toolType === 'course_selection'
                      );
                      // Only show messages from course selection onwards
                      return index >= courseSelectionIndex;
                    }
                    // Otherwise, show all messages
                    return true;
                  })
                  .map((message, index) => {
                  // Tool messages render as interactive components
                  // Only show if it's the active tool (not completed)
                  if (message.role === 'tool' && message.toolType) {
                    // Only render if this is the active tool
                    if (activeTool === message.toolType) {
                      return (
                        <div key={index} className="w-full">
                          <ToolRenderer
                            toolType={message.toolType}
                            toolData={message.toolData || {}}
                            onToolComplete={(result) => handleToolComplete(message.toolType!, result)}
                            onToolSkip={handleToolSkip}
                            onCareerPathfinderClick={handleCareerPathfinderClick}
                            onProgramPathfinderClick={handleProgramPathfinderClick}
                          />
                        </div>
                      );
                    }
                    // Don't render completed tools - they're shown in the sidebar
                    return null;
                  }

                  // Regular user/assistant messages
                  const isLastMessage = index === messages.length - 1;
                  const hasQuickReplies = message.quickReplies && message.quickReplies.length > 0;

                  // Find if this is the last user message
                  const isLastUserMessage = message.role === 'user' && (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].role === 'user') {
                        return i === index;
                      }
                    }
                    return false;
                  })();

                  // Find if this is the last assistant message
                  const isLastAssistantMessage = message.role === 'assistant' && (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].role === 'assistant') {
                        return i === index;
                      }
                    }
                    return false;
                  })();

                  // Check if this is the loading message for graduation plan generation
                  const isGeneratingPlan = message.content?.includes('Perfect! Now let me generate your personalized graduation plan');

                  return (
                    <div key={index} ref={isLastUserMessage ? lastUserMessageRef : isLastAssistantMessage ? lastAssistantMessageRef : null}>
                      <div
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {isGeneratingPlan ? (
                          // Show StuLoader for plan generation - centered in chat window
                          <div className="w-full flex justify-center items-center py-8">
                            <div className="flex flex-col items-center gap-3 text-center">
                              <StuLoader
                                variant="card"
                                text={generationLoaderText}
                                speed={2.5}
                              />
                              <p className="text-sm text-muted-foreground">
                                Your grad plan is generating. It&apos;ll take a moment, so you can stay here or leave. You&apos;ll get an email when it&apos;s done!
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                              message.role === 'user'
                                ? 'bg-[#0a1f1a] text-white'
                                : 'bg-white dark:bg-zinc-900 dark:text-white border border-border shadow-sm'
                            }`}
                          >
                            {message.content && <MarkdownMessage content={message.content} />}
                            <p
                              className={`text-xs mt-1 ${
                                message.role === 'user' ? 'text-white/60' : 'text-muted-foreground dark:text-white/60'
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick Reply Buttons - Only show on last message if not processing */}
                      {hasQuickReplies && isLastMessage && !isProcessing && !activeTool && (
                        <div className="flex justify-start mt-2">
                          <div className="flex flex-wrap gap-2 max-w-[80%]">
                            {message.quickReplies!.map((reply, replyIndex) => (
                              <Button
                                key={replyIndex}
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setInputMessage(reply);
                                  // Auto-submit the quick reply
                                  setTimeout(() => {
                                    handleSendMessage(reply);
                                  }, 100);
                                }}
                                className="text-sm py-2 px-3 h-auto"
                              >
                                {reply}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isProcessing && !messages.some(m => m.content?.includes('Perfect! Now let me generate your personalized graduation plan')) && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-zinc-900 dark:text-white border border-border shadow-sm px-3 py-2 rounded-2xl">
                      <p className="text-sm italic text-muted-foreground dark:text-white/60">Thinking...</p>
                    </div>
                  </div>
                )}

                {/* Invisible element at the bottom for auto-scroll */}
                <div ref={messagesEndRef} />

              </div>

              {/* Input Area - Always show when no active tool, pinned to bottom */}
              {!activeTool && (
                <div className="border-t bg-gray-50 dark:bg-zinc-800 pt-2 pb-2 px-3 flex-shrink-0">
                  <div className="flex gap-2 items-end">
                    <TextField
                      fullWidth
                      multiline
                      maxRows={3}
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isProcessing}
                      inputRef={inputRef}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                        },
                      }}
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isProcessing}
                      variant="primary"
                      className="h-12 px-4"
                    >
                      <Send size={20} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Sidebar - Takes 1/4 on large screens */}
          <div className="lg:col-span-1 h-full overflow-y-auto">
            <div className="border rounded-xl bg-card shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4">Grad Plan Context</h2>

              <div className="space-y-4">
                {(() => {
                  const progress = getConversationProgress(conversationState);

                  if (progress.collectedFields.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        We will keep track of your priorities. Start chatting to build your plan!
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {progress.collectedFields.map((field) => (
                        <div key={field.field} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{field.label}</p>
                              <p className="text-xs text-muted-foreground mt-1 break-words">
                                {Array.isArray(field.value) ? (
                                  field.value.filter(v => v).length > 0 ? (
                                    field.value.filter(v => v).join(', ')
                                  ) : (
                                    `${field.value.length} program${field.value.length > 1 ? 's' : ''} selected`
                                  )
                                ) : (
                                  field.value
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Current Step Indicator */}
                      {conversationState.currentStep !== ConversationStep.COMPLETE && (
                        <div className="mt-4 p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                          <p className="text-sm text-center">
                            <span className="font-semibold text-green-800 dark:text-green-600">Current Step:</span>{' '}
                            <span className="text-foreground">{progress.currentStepLabel}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
