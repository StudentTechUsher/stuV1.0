'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Send, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import TextField from '@mui/material/TextField';
import ConversationProgressSteps from '@/components/chatbot/ConversationProgressSteps';
import ToolRenderer, { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import {
  ConversationState,
  ConversationStep,
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

  const handleToolComplete = async (toolType: ToolType, result: unknown) => {
    setIsProcessing(true);
    setActiveTool(null);

    try {
      if (toolType === 'profile_update') {
        const profileData = result as { estGradDate?: string | null; estGradSem?: string | null; careerGoals?: string | null };

        // Update profile via server action
        const updateResult = await updateProfileForChatbotAction(user.id, profileData);

        if (updateResult.success) {
          // Add success message
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Great! I\'ve updated your profile information. Now let\'s move on to the next step.',
              timestamp: new Date(),
            },
          ]);

          // Update conversation state
          setConversationState(prev => {
            const updated = updateState(prev, {
              step: ConversationStep.PROFILE_SETUP,
              data: {
                estGradDate: profileData.estGradDate ?? null,
                estGradSem: profileData.estGradSem ?? null,
                careerGoals: profileData.careerGoals ?? null,
              },
              completedStep: ConversationStep.PROFILE_SETUP,
            });

            // Move to next step
            return updateState(updated, {
              step: getNextStep(updated),
            });
          });

          // Trigger transcript check step
          setTimeout(() => {
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: 'Great! Now let\'s check your transcript status.',
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
            setIsProcessing(false);
          }, 1000);
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

        // Add confirmation message
        const confirmationMessage = getProgramSelectionConfirmationMessage(
          programData.studentType,
          selectedPrograms.length
        );

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Extract program IDs by type for course selection
        const majorMinorIds = selectedPrograms
          .filter(p => p.programType === 'major' || p.programType === 'minor')
          .map(p => p.programId);
        const genEdIds = selectedPrograms
          .filter(p => p.programType === 'general_education')
          .map(p => p.programId);

        // Skip course method selection and go directly to manual course selection
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Now let\'s select the specific courses you\'ll take to fulfill your program requirements.',
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
              },
            },
          ]);
          setActiveTool('course_selection');
          setIsProcessing(false);
        }, 1000);
      } else if (toolType === 'course_selection') {
        const courseData = result as CourseSelectionInput;

        // Count total courses
        const totalCourses = countTotalCourses(courseData);
        const programCount = courseData.programs.length;

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

            // Transform courseData to match the expected schema
            const programIds = conversationState.collectedData.selectedPrograms.map(p => p.programId);
            const transformedCourseData = {
              ...courseData,
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
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: 'I encountered an error while generating your plan. Please try again or contact support.',
                timestamp: new Date(),
              },
            ]);
            setIsProcessing(false);
          }
        }, 1000);

      } else if (toolType === 'additional_concerns') {
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

            // Transform courseData to match the expected schema
            const programIds = conversationState.collectedData.selectedPrograms.map(p => p.programId);
            const transformedCourseData = {
              ...courseData,
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
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: 'I encountered an error while generating your plan. Please try again or contact support.',
                timestamp: new Date(),
              },
            ]);
            setIsProcessing(false);
          }
        }, 1000);

      } else if (toolType === 'career_suggestions') {
        const careerSelection = result as { selectedCareer: string };

        // Update conversation state with career goal
        setConversationState(prev => {
          const updated = updateState(prev, {
            step: ConversationStep.CAREER_PATHFINDER,
            data: {
              careerGoals: careerSelection.selectedCareer,
            },
            completedStep: ConversationStep.CAREER_PATHFINDER,
          });

          // Move back to profile setup step to continue
          return updateState(updated, {
            step: ConversationStep.PROFILE_SETUP,
          });
        });

        // Add confirmation message
        const confirmationMessage = getCareerSelectionConfirmationMessage(careerSelection.selectedCareer);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Re-show profile update form with the career goal populated
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: "Now, let's complete your profile information.",
              timestamp: new Date(),
            },
            {
              role: 'tool',
              content: '',
              timestamp: new Date(),
              toolType: 'profile_update',
              toolData: {
                currentValues: {
                  ...studentProfile,
                  career_goals: careerSelection.selectedCareer,
                },
              },
            },
          ]);
          setActiveTool('profile_update');
          setIsProcessing(false);
        }, 1000);

      } else if (toolType === 'program_suggestions') {
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

  const handleCareerPathfinderClick = () => {
    // Hide the profile update form
    setActiveTool(null);

    // Update state to career pathfinder step
    setConversationState(prev => updateState(prev, {
      step: ConversationStep.CAREER_PATHFINDER,
    }));

    // Add the initial career pathfinder message
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: CAREER_PATHFINDER_INITIAL_MESSAGE,
        timestamp: new Date(),
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

    // Add the initial program pathfinder message (will be dynamic when integrated with RAG)
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: "Great! Let me help you find the perfect program(s) for your goals. I'll ask you a few questions to understand what you're looking for.\n\nLet's start: What subjects or areas are you most interested in studying?",
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
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
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: data.content,
              timestamp: new Date(),
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
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: data.content,
              timestamp: new Date(),
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
    <div className="min-h-screen bg-background">
      {/* Sticky Header with Progress Bar */}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm">
        {/* Header */}
        <div className="border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="gap-2"
                >
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Create Graduation Plan</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="max-w-7xl mx-auto px-6 flex justify-center">
          <div className="w-full max-w-4xl">
            <ConversationProgressSteps
              currentStep={conversationState.currentStep}
              completedSteps={conversationState.completedSteps}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area - Takes 2/3 on large screens */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl bg-card shadow-sm flex flex-col h-[calc(100vh-200px)]">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  return (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-[#0a1f1a] text-white'
                            : 'bg-white border border-border shadow-sm'
                        }`}
                      >
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
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
                    </div>
                  );
                })}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-border shadow-sm px-4 py-3 rounded-2xl">
                      <p className="text-sm italic text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t p-4 bg-background">
                {activeTool ? (
                  <div className="text-center py-2">
                  </div>
                ) : (
                  <>
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
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                          },
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isProcessing}
                        className="h-12 px-4 bg-[#0a1f1a] hover:bg-[#043322]"
                      >
                        <Send size={20} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Sidebar - Takes 1/3 on large screens */}
          <div className="lg:col-span-1">
            <div className="border rounded-xl bg-card shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Collected Information</h2>

              <div className="space-y-4">
                {(() => {
                  const progress = getConversationProgress(conversationState);

                  if (progress.collectedFields.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground">
                        No information collected yet. Start chatting to build your plan!
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

                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                          Answers are locked for the duration of this chat.
                        </p>
                      </div>

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

                {/* Progress Summary */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Overall Progress
                    </span>
                    <span className="text-sm font-semibold text-[var(--primary)]">
                      {getConversationProgress(conversationState).completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-[var(--primary)] h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${getConversationProgress(conversationState).completionPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
