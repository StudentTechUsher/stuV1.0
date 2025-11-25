'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Send, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import TextField from '@mui/material/TextField';
import MarkdownMessage from '@/components/chatbot/MarkdownMessage';
import { StuLoader } from '@/components/ui/StuLoader';
import ConversationProgressSteps from '@/components/chatbot/ConversationProgressSteps';
import ToolRenderer, { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import {
  ConversationState,
  ConversationStep,
  CourseSelection,
} from '@/lib/chatbot/grad-plan/types';
import {
  createInitialState,
  updateState,
  getConversationProgress,
} from '@/lib/chatbot/grad-plan/stateManager';
import {
  generateConversationId,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
} from '@/lib/chatbot/grad-plan/statePersistence';
import { getNextStep } from '@/lib/chatbot/grad-plan/conversationState';
import { shouldRequestProfileUpdate } from '@/lib/chatbot/tools/profileUpdateTool';
import { getStudentTypeConfirmationMessage } from '@/lib/chatbot/tools/studentTypeTool';
import { getProgramSelectionConfirmationMessage, type ProgramSelectionInput } from '@/lib/chatbot/tools/programSelectionTool';
import { getCourseSelectionConfirmationMessage, countTotalCourses, type CourseSelectionInput } from '@/lib/chatbot/tools/courseSelectionTool';
import { getAdditionalConcernsConfirmationMessage, type AdditionalConcernsInput } from '@/lib/chatbot/tools/additionalConcernsTool';
import { CAREER_PATHFINDER_INITIAL_MESSAGE, getCareerSelectionConfirmationMessage, type CareerSuggestionsInput, CAREER_PATHFINDER_SYSTEM_PROMPT, careerSuggestionsToolDefinition } from '@/lib/chatbot/tools/careerSuggestionsTool';
import { type ProgramSuggestionsInput, programSuggestionsToolDefinition, buildProgramPathfinderSystemPrompt, fetchAvailableProgramsForRAG } from '@/lib/chatbot/tools/programSuggestionsTool';
import { updateProfileForChatbotAction, fetchUserCoursesAction, getAiPromptAction, organizeCoursesIntoSemestersAction } from '@/lib/services/server-actions';

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
}

export default function CreatePlanClient({
  user,
  studentProfile,
  hasCourses,
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation on mount
  useEffect(() => {
    if (messages.length === 0) {
      // Check profile status for messaging
      const profileCheck = shouldRequestProfileUpdate(studentProfile);

      // Always show the profile form - it will be auto-populated if data exists
      const welcomeMessage = profileCheck.needsUpdate
        ? `Hi! I'm here to help you create your graduation plan. Let's start by setting up your profile information.${
            profileCheck.hasValues
              ? ' I see you have some information already - please review and update if needed.'
              : ''
          }`
        : `Hi! I'm here to help you create your graduation plan. Let's start by confirming your profile information looks correct.`;

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
          toolType: 'profile_update',
          toolData: {
            currentValues: {
              est_grad_date: studentProfile.est_grad_date,
              est_grad_sem: studentProfile.est_grad_sem,
              career_goals: studentProfile.career_goals,
            },
          },
        },
      ]);
      setActiveTool('profile_update');
    }
  }, [messages.length, studentProfile]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveStateToLocalStorage(conversationState);
  }, [conversationState]);

  // Auto-scroll when messages change
  // If AI just responded, scroll to show last user message at top
  // Otherwise scroll to bottom
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // If last message is from assistant and we have a user message ref, scroll to it
    if (lastMessage.role === 'assistant' && lastUserMessageRef.current) {
      lastUserMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const handleToolComplete = async (toolType: ToolType, result: unknown) => {
    setIsProcessing(true);

    try {
      if (toolType === 'profile_update') {
        const profileData = result as { estGradDate?: string | null; estGradSem?: string | null; careerGoals?: string | null; isGraduationOnly?: boolean };

        // Check if this is just graduation info (step 1) or complete profile (with career)
        const isGraduationOnly = profileData.isGraduationOnly === true;

        // Update profile via server action
        const updateResult = await updateProfileForChatbotAction(user.id, profileData);

        if (updateResult.success) {
          if (isGraduationOnly) {
            // Just completed graduation info - complete PROFILE_SETUP step
            setConversationState(prev => {
              const updated = updateState(prev, {
                step: ConversationStep.PROFILE_SETUP,
                data: {
                  estGradDate: profileData.estGradDate ?? null,
                  estGradSem: profileData.estGradSem ?? null,
                },
                completedStep: ConversationStep.PROFILE_SETUP,
              });

              // Move to CAREER_SELECTION step
              return updateState(updated, {
                step: ConversationStep.CAREER_SELECTION,
              });
            });

            // Don't close tool or show message - form stays open for career selection
            setIsProcessing(false);
          } else {
            // Completed career selection - complete CAREER_SELECTION step
            setActiveTool(null); // Close the profile form

            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: 'Great! I\'ve saved your career goals. Now let\'s check your transcript status.',
                timestamp: new Date(),
              },
            ]);

            setConversationState(prev => {
              const updated = updateState(prev, {
                data: {
                  careerGoals: profileData.careerGoals ?? null,
                },
                completedStep: ConversationStep.CAREER_SELECTION,
              });

              // Move to next step
              return updateState(updated, {
                step: ConversationStep.TRANSCRIPT_CHECK,
              });
            });

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
                  },
                },
              ]);
              setActiveTool('transcript_check');
              setIsProcessing(false);
            }, 1000);
          }
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `Sorry, there was an error updating your profile: ${updateResult.error || 'Unknown error'}. Please try again.`,
              timestamp: new Date(),
            },
          ]);
          setIsProcessing(false);
        }
      } else if (toolType === 'transcript_check') {
        setActiveTool(null);
        const transcriptData = result as { hasTranscript: boolean; wantsToUpload: boolean; wantsToUpdate?: boolean };

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
        const nextMessage = transcriptData.wantsToUpload
          ? 'Great! Your transcript has been uploaded. Now let\'s determine what type of student you are.'
          : 'Okay, we can proceed without a transcript. Now let\'s determine what type of student you are.';

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: nextMessage,
            timestamp: new Date(),
          },
        ]);

        // Trigger student type selection
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'student_type',
              toolData: {},
            },
          ]);
          setActiveTool('student_type');
          setIsProcessing(false);
        }, 1000);
      } else if (toolType === 'student_type') {
        setActiveTool(null);
        const studentTypeData = result as { studentType: 'undergraduate' | 'graduate' };

        // Update conversation state
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.STUDENT_TYPE,
            data: {
              studentType: studentTypeData.studentType,
            },
            completedStep: ConversationStep.STUDENT_TYPE,
          });

          // Move to next step
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Add confirmation message
        const confirmationMessage = getStudentTypeConfirmationMessage(studentTypeData.studentType);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Trigger program selection
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'program_selection',
              toolData: {
                studentType: studentTypeData.studentType,
                universityId: studentProfile.university_id,
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

        // Clear messages and go directly to course selection tool
        setTimeout(() => {
          setMessages([
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
            },
            completedStep: ConversationStep.COURSE_SELECTION,
          });

          // Finally mark ADDITIONAL_CONCERNS as complete (skipping it)
          return updateState(withSelection, {
            step: ConversationStep.ADDITIONAL_CONCERNS,
            completedStep: ConversationStep.ADDITIONAL_CONCERNS,
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

        // Skip additional concerns and go directly to plan generation
        setTimeout(async () => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Perfect! Now let me generate your personalized graduation plan. This may take a moment...',
              timestamp: new Date(),
            },
          ]);

          try {
            // Get the prompt from database
            const promptTemplate = await getAiPromptAction('organize_grad_plan');
            if (!promptTemplate) {
              throw new Error('Prompt template not found');
            }

            // Fetch user's taken courses from database
            const userCoursesResult = await fetchUserCoursesAction(user.id);
            const takenCourses = userCoursesResult.success && userCoursesResult.courses
              ? userCoursesResult.courses
                  .filter(course => course.code && course.title) // Only include valid courses
                  .map(course => ({
                    code: course.code,
                    title: course.title,
                    credits: course.credits || 3,
                    term: course.term || 'Unknown',
                    grade: course.grade || 'Completed',
                    status: 'Completed',
                    source: 'Institutional',
                    fulfills: []
                  }))
              : [];

            // Transform courseData to match the expected schema
            const programIds = conversationState.collectedData.selectedPrograms.map(p => p.programId);
            const transformedCourseData = {
              ...courseData,
              takenCourses,
              selectionMode: 'MANUAL' as const,
              selectedPrograms: programIds,
            };

            // Call the existing organize courses server action
            const result = await organizeCoursesIntoSemestersAction(
              transformedCourseData,
              {
                prompt_name: 'organize_grad_plan',
                prompt: promptTemplate,
                model: 'gpt-5-mini',
                max_output_tokens: 25_000,
              }
            );

            if (!result.success || !result.accessId) {
              throw new Error(result.message || 'Failed to generate graduation plan');
            }

            // Display success message
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: `${result.message}\n\n🎉 Your graduation plan has been saved! Redirecting you to the plan editor...`,
                timestamp: new Date(),
              },
            ]);

            // Navigate to the grad plan page after a brief delay
            setTimeout(() => {
              router.push(`/grad-plan/${result.accessId}`);
            }, 1500);
          } catch (error) {
            console.error('Error generating graduation plan:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: `I encountered an error while generating your plan:\n\n**Error:** ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
                timestamp: new Date(),
              },
            ]);
            setIsProcessing(false);
          }
        }, 1000);

      } else if (toolType === 'additional_concerns') {
        setActiveTool(null);
        const concernsData = result as AdditionalConcernsInput;

        // Update conversation state
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.ADDITIONAL_CONCERNS,
            data: {
              additionalConcerns: concernsData.hasAdditionalConcerns
                ? JSON.stringify(concernsData)
                : null,
            },
            completedStep: ConversationStep.ADDITIONAL_CONCERNS,
          });

          // Move to next step (GENERATING_PLAN)
          return updateState(updated, {
            step: getNextStep(updated),
          });
        });

        // Add confirmation message
        const confirmationMessage = getAdditionalConcernsConfirmationMessage(concernsData);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Trigger plan generation
        setTimeout(async () => {
          try {
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: 'Perfect! Now let me generate your personalized graduation plan. This may take a moment...',
                timestamp: new Date(),
              },
            ]);

            // Get the prompt from database
            const promptTemplate = await getAiPromptAction('organize_grad_plan');
            if (!promptTemplate) {
              throw new Error('Prompt template not found');
            }

            // Get course data from conversation state
            const courseData = conversationState.collectedData.selectedCourses || {};

            // Fetch user's taken courses from database
            const userCoursesResult = await fetchUserCoursesAction(user.id);
            const takenCourses = userCoursesResult.success && userCoursesResult.courses
              ? userCoursesResult.courses
                  .filter(course => course.code && course.title) // Only include valid courses
                  .map(course => ({
                    code: course.code,
                    title: course.title,
                    credits: course.credits || 3,
                    term: course.term || 'Unknown',
                    grade: course.grade || 'Completed',
                    status: 'Completed',
                    source: 'Institutional',
                    fulfills: []
                  }))
              : [];

            // Transform courseData to match the expected schema
            const programIds = conversationState.collectedData.selectedPrograms.map(p => p.programId);
            const transformedCourseData = {
              ...courseData,
              takenCourses,
              selectionMode: 'MANUAL' as const,
              selectedPrograms: programIds,
            };

            // Call the existing organize courses server action
            const result = await organizeCoursesIntoSemestersAction(
              transformedCourseData,
              {
                prompt_name: 'organize_grad_plan',
                prompt: promptTemplate,
                model: 'gpt-5-mini',
                max_output_tokens: 25_000,
              }
            );

            if (!result.success || !result.accessId) {
              throw new Error(result.message || 'Failed to generate graduation plan');
            }

            // Display success message
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: `${result.message}\n\n🎉 Your graduation plan has been saved! Redirecting you to the plan editor...`,
                timestamp: new Date(),
              },
            ]);

            // Navigate to the grad plan page after a brief delay
            setTimeout(() => {
              router.push(`/grad-plan/${result.accessId}`);
            }, 1500);
          } catch (error) {
            console.error('Error generating graduation plan:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: `I encountered an error while generating your plan:\n\n**Error:** ${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
                timestamp: new Date(),
              },
            ]);
            setIsProcessing(false);
          }
        }, 1000);

      } else if (toolType === 'career_suggestions') {
        setActiveTool(null);
        const careerSelection = result as { selectedCareer: string };

        // Update conversation state with career goal - stay in CAREER_PATHFINDER for commitment question
        setConversationState(prev => updateState(prev, {
          step: ConversationStep.CAREER_PATHFINDER,
          data: {
            careerGoals: careerSelection.selectedCareer,
          },
        }));

        // Add confirmation message with commitment level question
        const confirmationMessage = `Perfect! I've recorded **${careerSelection.selectedCareer}** as your career goal.

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
          },
        ]);

        // Store the selected career temporarily
        setConversationState(prev => updateState(prev, {
          data: {
            careerGoals: careerSelection.selectedCareer,
          },
        }));

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
                studentType: conversationState.collectedData.studentType || 'undergraduate',
                universityId: conversationState.universityId,
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

    if (lastToolMessage?.toolType === 'profile_update') {
      // Mark profile setup as complete with current values
      setConversationState(prev => {
        const updated = updateState(prev, {
          step: ConversationStep.PROFILE_SETUP,
          data: {
            estGradDate: studentProfile.est_grad_date || null,
            estGradSem: studentProfile.est_grad_sem || null,
            careerGoals: studentProfile.career_goals || null,
          },
          completedStep: ConversationStep.PROFILE_SETUP,
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
          },
        },
      ]);
      setActiveTool('transcript_check');
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
      const isCommitmentResponse = /^(10|[1-9])$/.test(textToSend.trim()) &&
        conversationState.collectedData.careerGoals &&
        conversationState.currentStep === ConversationStep.CAREER_PATHFINDER;

      if (isCommitmentResponse) {
        // User responded with commitment level
        const commitmentLevel = parseInt(textToSend.trim());

        // Provide acknowledgment based on commitment level
        let acknowledgment = '';
        if (commitmentLevel >= 8) {
          acknowledgment = "That's great! Having a clear direction will really help us tailor your graduation plan.";
        } else if (commitmentLevel >= 5) {
          acknowledgment = "Perfect! It's good to have a direction while staying open to opportunities.";
        } else {
          acknowledgment = "That's completely fine! Exploring your options is an important part of the process.";
        }

        // Update profile with the career goal
        await updateProfileForChatbotAction(user.id, {
          careerGoals: conversationState.collectedData.careerGoals,
        });

        // Complete CAREER_SELECTION step and move to transcript check
        setConversationState(prev => {
          const updated = updateState(prev, {
            data: {
              careerGoals: conversationState.collectedData.careerGoals,
            },
            completedStep: ConversationStep.CAREER_SELECTION,
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
        const availablePrograms = await fetchAvailableProgramsForRAG(
          conversationState.universityId,
          conversationState.collectedData.studentType || 'undergraduate'
        );

        // Build system prompt with RAG context
        const systemPrompt = buildProgramPathfinderSystemPrompt(
          availablePrograms,
          conversationState.collectedData.careerGoals || undefined
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

  const handleCancel = () => {
    router.push('/grad-plan');
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
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-2 w-full min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-full">
          {/* Chat Area - Takes 3/4 on large screens */}
          <div className="lg:col-span-3 h-full min-h-0">
            <div className="border rounded-xl bg-gray-50 shadow-sm flex flex-col h-full max-h-full">
              {/* Messages Container */}
              <div className="flex-1 min-h-0 max-h-full overflow-y-auto pt-3 px-3 pb-0 space-y-2">
                {messages.map((message, index) => {
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

                  // Check if this is the loading message for graduation plan generation
                  const isGeneratingPlan = message.content?.includes('Perfect! Now let me generate your personalized graduation plan');

                  return (
                    <div key={index} ref={isLastUserMessage ? lastUserMessageRef : null}>
                      <div
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {isGeneratingPlan ? (
                          // Show StuLoader for plan generation
                          <div className="max-w-[80%] px-3 py-2">
                            <StuLoader
                              variant="card"
                              text="Generating your personalized graduation plan..."
                              speed={2.5}
                            />
                          </div>
                        ) : (
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                              message.role === 'user'
                                ? 'bg-[#0a1f1a] text-white'
                                : 'bg-white border border-border shadow-sm'
                            }`}
                          >
                            {message.content && <MarkdownMessage content={message.content} />}
                            <p
                              className={`text-xs mt-1 ${
                                message.role === 'user' ? 'text-white/60' : 'text-muted-foreground'
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
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setInputMessage(reply);
                                  // Auto-submit the quick reply
                                  setTimeout(() => {
                                    handleSendMessage(reply);
                                  }, 100);
                                }}
                                className="bg-white hover:bg-gray-50 text-sm py-2 px-3 h-auto"
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
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-border shadow-sm px-3 py-2 rounded-2xl">
                      <p className="text-sm italic text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}

                {/* Invisible element at the bottom for auto-scroll */}
                <div ref={messagesEndRef} />

              </div>

              {/* Input Area - Always show when no active tool, pinned to bottom */}
              {!activeTool && (
                <div className="border-t bg-gray-50 pt-2 pb-2 px-3 flex-shrink-0">
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
                      className="h-12 px-4 bg-[#0a1f1a] hover:bg-[#043322]"
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
                            <span className="font-semibold text-[var(--primary)]">Current Step:</span>{' '}
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
