'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2 } from 'lucide-react';
import TextField from '@mui/material/TextField';
import MarkdownMessage from '@/components/chatbot/MarkdownMessage';
import { StuLoader } from '@/components/ui/StuLoader';
import ToolRenderer, { type ToolType } from '@/components/chatbot-tools/ToolRenderer';
import ToolCallCard from '@/components/chatbot-tools/ToolCallCard';
import AgentStatusBar from '@/components/grad-plan/agentic/AgentStatusBar';
import AgentActivityPanel from '@/components/grad-plan/agentic/AgentActivityPanel';
import AgentChecksPanel from '@/components/grad-plan/agentic/AgentChecksPanel';
import AgentControls from '@/components/grad-plan/agentic/AgentControls';
import ResumeConversationPanel from '@/components/grad-plan/agentic/ResumeConversationPanel';
import StepNavigatorPanel from '@/components/grad-plan/agentic/StepNavigatorPanel';
import {
  ConversationStep,
  type ConversationState,
  type ConversationMetadata,
} from '@/lib/chatbot/grad-plan/types';
import {
  createInitialState,
  getConversationProgress,
  getStepLabel,
  updateState,
} from '@/lib/chatbot/grad-plan/stateManager';
import {
  generateConversationId,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
  listConversationMetadata,
  upsertConversationMetadata,
} from '@/lib/chatbot/grad-plan/statePersistence';
import { navigateToStep } from '@/lib/chatbot/grad-plan/stepNavigation';
import { shouldRequestProfileUpdate } from '@/lib/chatbot/tools/profileUpdateTool';
import { clientLogger } from '@/lib/client-logger';
import { createToolCallPart, generateToolCallId, getToolMeta } from '@/lib/chatbot/grad-plan/toolRegistry';
import {
  updateProfileForChatbotAction,
  fetchUserCoursesAction,
  getAiPromptAction,
  organizeCoursesIntoSemestersAction,
  ensureStudentRecordAction,
} from '@/lib/services/server-actions';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';
import { useGradPlanOrchestration, type StudentProfile } from '@/lib/hooks/useGradPlanOrchestration';

// ============================================================================
// Helper Functions
// ============================================================================

const resolveStudentType = (value: unknown): 'undergraduate' | 'honor' | 'graduate' => {
  if (value === 'honor' || value === 'graduate' || value === 'undergraduate') {
    return value;
  }
  if (value === 'honors') {
    return 'honor';
  }
  return 'undergraduate';
};

const buildConversationSummary = (state: ConversationState) => {
  const parts: string[] = [];
  const programCount = state.collectedData.selectedPrograms?.length ?? 0;
  if (programCount > 0) {
    parts.push(`${programCount} program${programCount === 1 ? '' : 's'}`);
  }
  const credits = state.collectedData.totalSelectedCredits || 0;
  if (credits > 0) {
    parts.push(`${credits} credits`);
  }
  if (state.collectedData.hasTranscript) {
    parts.push('Transcript attached');
  }
  return parts.length > 0 ? parts.join(' · ') : 'In progress';
};

// ============================================================================
// Props
// ============================================================================

interface CreatePlanClientV2Props {
  user: User;
  studentProfile: StudentProfile;
  hasCourses: boolean;
  hasActivePlan: boolean;
  academicTerms: AcademicTermsConfig;
}

// ============================================================================
// Component
// ============================================================================

export default function CreatePlanClientV2({
  user,
  studentProfile,
  hasCourses,
  hasActivePlan,
  academicTerms,
}: CreatePlanClientV2Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ============================================================================
  // Hook Consumption
  // ============================================================================

  const {
    conversationState,
    messages,
    activeTool,
    activeToolData,
    isProcessing,
    agentStatus,
    agentLogs,
    agentChecks,
    handleToolComplete,
    handleToolSkip,
    // Setters from Step 1
    setMessages,
    setActiveTool,
    setActiveToolData,
    setIsProcessing,
    setAgentStatus,
    setConversationState,
  } = useGradPlanOrchestration({
    user,
    studentProfile,
    hasCourses,
    hasActivePlan,
    academicTerms,
    onPlanGenerationStart: () => startPlanGeneration(),
  });

  const enqueueToolMessage = (toolType: ToolType, toolData: Record<string, unknown>) => {
    const toolMeta = getToolMeta(toolType);
    if (toolMeta?.mode === 'parts') {
      const toolCallId = generateToolCallId();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          parts: [createToolCallPart(toolType, toolData, toolCallId)],
        },
      ]);
      setConversationState(prev =>
        updateState(prev, {
          pendingToolCall: toolCallId,
        })
      );
      setActiveToolData({ ...toolData, toolCallId });
    } else {
      setMessages(prev => [
        ...prev,
        {
          role: 'tool',
          content: '',
          timestamp: new Date(),
          toolType,
          toolData,
        },
      ]);
      setConversationState(prev =>
        updateState(prev, {
          pendingToolCall: null,
        })
      );
      setActiveToolData(toolData);
    }
    setActiveTool(toolType);
  };

  // ============================================================================
  // Additional V2 State
  // ============================================================================

  const [inputMessage, setInputMessage] = useState('');
  const [planGenerationStage, setPlanGenerationStage] = useState<'generating' | 'validating'>('generating');
  const [resumeItems, setResumeItems] = useState<ConversationMetadata[]>([]);
  const [awaitingApprovalStep, setAwaitingApprovalStep] = useState<ConversationStep | undefined>(undefined);
  const [agentLastUpdated, setAgentLastUpdated] = useState<string>(new Date().toISOString());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const planGenerationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================================================
  // Initialization Effect
  // ============================================================================

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
      ]);
      enqueueToolMessage('profile_check', {
        userId: user.id,
        hasActivePlan,
      });
      setIsProcessing(false);
    };

    void initializeConversation();

    return () => {
      isMounted = false;
    };
  }, [
    messages.length,
    studentProfile,
    hasActivePlan,
    user.id,
    setMessages,
    setActiveTool,
    setIsProcessing,
    enqueueToolMessage,
  ]);

  // ============================================================================
  // Persistence Effects
  // ============================================================================

  useEffect(() => {
    saveStateToLocalStorage(conversationState);
    const summary = buildConversationSummary(conversationState);
    const status: ConversationMetadata['status'] =
      agentStatus === 'paused'
        ? 'paused'
        : agentStatus === 'error'
        ? 'error'
        : agentStatus === 'complete'
        ? 'complete'
        : 'active';
    upsertConversationMetadata({
      conversationId: conversationState.conversationId,
      lastUpdated: new Date().toISOString(),
      currentStep: conversationState.currentStep,
      summary,
      status,
    });
  }, [conversationState, agentStatus]);

  // Load saved state on mount from URL param
  useEffect(() => {
    const conversationId = searchParams.get('id');
    if (conversationId) {
      const saved = loadStateFromLocalStorage(conversationId);
      if (saved) {
        setConversationState(saved);
        setMessages([
          {
            role: 'assistant',
            content: `Resumed your saved session at the **${getStepLabel(saved.currentStep)}** step.`,
            timestamp: new Date(),
          },
        ]);
        setActiveTool(null);
        setIsProcessing(false);
        setAwaitingApprovalStep(undefined);
      }
    }

    // Load resume items
    const items = listConversationMetadata();
    setResumeItems(items);
  }, [searchParams, setConversationState, setMessages, setActiveTool, setIsProcessing]);

  // ============================================================================
  // Scroll & Focus Effects
  // ============================================================================

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

  // ============================================================================
  // Full Step Navigation
  // ============================================================================

  const handleStepNavigation = (targetStep: ConversationStep) => {
    // Navigate to the target step (this also resets dependent steps)
    const updatedState = navigateToStep(conversationState, targetStep);
    setConversationState(updatedState);

    // Close any active tools
    setActiveTool(null);
    setIsProcessing(true);

    const currentStudentType =
      updatedState.collectedData.studentType ?? resolveStudentType(studentProfile.student_type);

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
      switch (targetStep) {
        case ConversationStep.PROFILE_CHECK:
          enqueueToolMessage('profile_check', {
            userId: user.id,
          });
          break;

        case ConversationStep.TRANSCRIPT_CHECK:
          enqueueToolMessage('transcript_check', {
            hasCourses,
            academicTerms,
          });
          break;

        case ConversationStep.PROGRAM_SELECTION:
          enqueueToolMessage('program_selection', {
            studentType: currentStudentType,
            universityId: updatedState.universityId,
            studentAdmissionYear: studentProfile.admission_year,
            studentIsTransfer: studentProfile.is_transfer,
            selectedGenEdProgramId: updatedState.collectedData.selectedGenEdProgramId,
            profileId: user.id,
          });
          break;

        case ConversationStep.COURSE_SELECTION: {
          const selectedPrograms = updatedState.collectedData.selectedPrograms || [];
          const majorMinorIds = selectedPrograms
            .filter(p => p.programType === 'major' || p.programType === 'minor' || p.programType === 'honors')
            .map(p => p.programId);
          const genEdIds = selectedPrograms
            .filter(p => p.programType === 'general_education')
            .map(p => p.programId);

          enqueueToolMessage('course_selection', {
            studentType: currentStudentType,
            universityId: updatedState.universityId,
            selectedProgramIds: majorMinorIds,
            genEdProgramIds: genEdIds,
            userId: user.id,
            hasTranscript: updatedState.collectedData.hasTranscript ?? false,
          });
          break;
        }

        case ConversationStep.CREDIT_DISTRIBUTION: {
          const totalCredits = updatedState.collectedData.totalSelectedCredits || 0;

          enqueueToolMessage('credit_distribution', {
            totalCredits,
            studentType: currentStudentType,
            universityId: updatedState.universityId,
            academicTerms,
          });
          break;
        }

        case ConversationStep.MILESTONES_AND_CONSTRAINTS:
          enqueueToolMessage('milestones_and_constraints', {
            distribution: updatedState.collectedData.creditDistributionStrategy?.suggestedDistribution,
            studentType: currentStudentType,
          });
          break;

        case ConversationStep.GENERATING_PLAN:
          enqueueToolMessage('generate_plan_confirmation', {});
          break;

        default:
          break;
      }

      setIsProcessing(false);
    }, 500);
  };

  // ============================================================================
  // Plan Generation
  // ============================================================================

  const generationLoadingMessage = 'Perfect! Now let me generate your personalized graduation plan. This may take a moment...';
  const generationLoaderText =
    planGenerationStage === 'validating'
      ? 'Validating generation output...'
      : 'Generating your personalized graduation plan...';

  const clearPlanGenerationTimer = () => {
    if (planGenerationTimerRef.current !== null) {
      clearTimeout(planGenerationTimerRef.current);
      planGenerationTimerRef.current = null;
    }
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
        takenCourses =
          userCoursesResult.success && userCoursesResult.courses
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
        studentType:
          conversationState.collectedData.studentType ?? resolveStudentType(studentProfile.student_type),
        selectionMode: 'MANUAL' as const,
        selectedPrograms: programIds,
        milestones: conversationState.collectedData.milestones || [],
        suggestedDistribution:
          conversationState.collectedData.creditDistributionStrategy?.suggestedDistribution,
        workStatus: conversationState.collectedData.workConstraints?.workStatus,
        created_with_transcript: conversationState.collectedData.hasTranscript ?? false,
      };

      const result = await organizeCoursesIntoSemestersAction(transformedCourseData, {
        prompt_name: promptName,
        prompt: promptTemplate,
        model: 'gpt-5-mini',
        max_output_tokens: 25_000,
      });

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
      clientLogger.error('Error generating graduation plan', error, { action: 'startPlanGeneration' });
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

  // ============================================================================
  // Agent Controls
  // ============================================================================

  const handleAgentPause = () => {
    setAgentStatus('paused');
  };

  const handleAgentResume = () => {
    setAgentStatus('running');
  };

  const handleAgentCancel = () => {
    setAgentStatus('error');
    setIsProcessing(false);
    setActiveTool(null);
  };

  const handleAgentApprove = () => {
    setAgentStatus('running');
    setAwaitingApprovalStep(undefined);
  };

  const handleAgentReject = () => {
    setAgentStatus('paused');
    setAwaitingApprovalStep(undefined);
  };

  // ============================================================================
  // Resume / New Conversation
  // ============================================================================

  const handleResumeConversation = (conversationId: string) => {
    const saved = loadStateFromLocalStorage(conversationId);
    if (!saved) return;
    setConversationState(saved);
    setMessages([
      {
        role: 'assistant',
        content: `Resumed your saved session at the **${getStepLabel(saved.currentStep)}** step.`,
        timestamp: new Date(),
      },
    ]);
    setActiveTool(null);
    setIsProcessing(false);
    setAwaitingApprovalStep(undefined);
    router.push(`/grad-plan/createV2?id=${conversationId}`);
  };

  const handleStartNewConversation = () => {
    const conversationId = generateConversationId();
    const initial = createInitialState(conversationId, user.id, studentProfile.university_id);
    setConversationState(initial);
    setMessages([]);
    setActiveTool(null);
    setIsProcessing(false);
    setAwaitingApprovalStep(undefined);
    router.push('/grad-plan/createV2');
  };

  // ============================================================================
  // Message Sending (Stubbed for Phase 1)
  // ============================================================================

  const handleSendMessage = (_messageText?: string) => {
    // Phase 1: Just add user message. Pathfinder AI not wired.
    // TODO: Wire up pathfinder AI in later phase
  };

  // ============================================================================
  // Derived State
  // ============================================================================

  const conversationSummary = buildConversationSummary(conversationState);
  const isAgentReadOnly = agentStatus === 'paused' || agentStatus === 'awaiting_approval' || agentStatus === 'error';
  const activeToolMeta = activeTool ? getToolMeta(activeTool) : null;

  // ============================================================================
  // JSX
  // ============================================================================

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Sticky Header with Progress Bar */}
      <div className="flex-shrink-0 bg-card border-b shadow-sm">
        <AgentStatusBar
          status={agentStatus}
          currentStepLabel={getStepLabel(conversationState.currentStep)}
          summary={conversationSummary}
          lastUpdated={agentLastUpdated}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1920px] mx-auto px-6 py-2 w-full min-h-0 overflow-hidden">
        <ResumeConversationPanel
          items={resumeItems}
          activeConversationId={conversationState.conversationId}
          onResume={handleResumeConversation}
          onStartNew={handleStartNewConversation}
        />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Chat Area - Takes 3/4 on large screens */}
          <div className="lg:col-span-3 h-full min-h-0">
            <div className="border rounded-xl bg-gray-50 dark:bg-zinc-800 shadow-sm flex flex-col h-full max-h-full">
              {/* Messages Container */}
              <div className="flex-1 min-h-0 max-h-full overflow-y-auto pt-3 px-3 pb-0 space-y-2">
                {messages.map((message, index) => {
                  // Tool messages render as interactive components
                  // Only show if it's the active tool (not completed)
                  if (message.role === 'tool' && message.toolType) {
                    if (activeTool === message.toolType) {
                      return (
                        <div key={index} className="w-full">
                          <ToolRenderer
                            toolType={message.toolType as ToolType}
                            toolData={message.toolData || {}}
                            onToolComplete={result => handleToolComplete(message.toolType as ToolType, result)}
                            onToolSkip={handleToolSkip}
                            readOnly={isAgentReadOnly}
                            requiresApproval={agentStatus === 'awaiting_approval'}
                            onApprove={handleAgentApprove}
                            onReject={handleAgentReject}
                            agentStatus={agentStatus}
                            variant="versionB"
                          />
                        </div>
                      );
                    }
                    return null;
                  }

                  // Find if this is the last user message
                  const isLastUserMessage =
                    message.role === 'user' &&
                    (() => {
                      for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'user') {
                          return i === index;
                        }
                      }
                      return false;
                    })();

                  // Find if this is the last assistant message
                  const isLastAssistantMessage =
                    message.role === 'assistant' &&
                    (() => {
                      for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'assistant') {
                          return i === index;
                        }
                      }
                      return false;
                    })();

                  // Check if this is the loading message for graduation plan generation
                  const isGeneratingPlan = message.content?.includes(
                    'Perfect! Now let me generate your personalized graduation plan'
                  );

                  return (
                    <div
                      key={index}
                      ref={
                        isLastUserMessage
                          ? lastUserMessageRef
                          : isLastAssistantMessage
                          ? lastAssistantMessageRef
                          : null
                      }
                    >
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {isGeneratingPlan ? (
                          <div className="w-full flex justify-center items-center py-8">
                            <div className="flex flex-col items-center gap-3 text-center">
                              <StuLoader variant="card" text={generationLoaderText} speed={2.5} />
                              <p className="text-sm text-muted-foreground">
                                Your grad plan is generating. It&apos;ll take a moment, so you can stay here or
                                leave. You&apos;ll get an email when it&apos;s done!
                              </p>
                            </div>
                          </div>
                        ) : (
                          message.content && (
                            <div
                              className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                                message.role === 'user'
                                  ? 'bg-[#0a1f1a] text-white'
                                  : 'bg-white dark:bg-zinc-900 dark:text-white border border-border shadow-sm'
                              }`}
                            >
                              <MarkdownMessage
                                content={message.content}
                                decisionMeta={message.decisionMeta}
                                showFeedback={message.showFeedback}
                                feedbackReasons={message.feedbackReasons}
                              />
                              <p
                                className={`text-xs mt-1 ${
                                  message.role === 'user'
                                    ? 'text-white/60'
                                    : 'text-muted-foreground dark:text-white/60'
                                }`}
                              >
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      {message.parts?.length ? (
                        <div className="mt-3 space-y-3">
                          {message.parts
                            .filter(part => part.type === 'tool-call')
                            .map(part => {
                              const toolName = part.toolName as ToolType;
                              const toolMeta = getToolMeta(toolName);
                              const resultPart = message.parts?.find(
                                candidate =>
                                  candidate.type === 'tool-result' &&
                                  candidate.toolCallId === part.toolCallId
                              );
                              const isActive =
                                activeTool === toolName &&
                                activeToolData?.toolCallId === part.toolCallId;
                              const status = resultPart
                                ? resultPart.isError
                                  ? 'error'
                                  : 'complete'
                                : isActive
                                ? 'active'
                                : 'queued';
                              const summary = resultPart
                                ? resultPart.isError
                                  ? 'Skipped or needs attention.'
                                  : toolMeta?.summaryBuilder?.(resultPart.result) || 'Completed.'
                                : isActive
                                ? 'In progress...'
                                : 'Waiting to start.';

                              return (
                                <ToolCallCard
                                  key={part.toolCallId}
                                  label={toolMeta?.label || part.toolName}
                                  status={status}
                                  summary={summary}
                                >
                                  {toolMeta?.kind === 'user' && isActive ? (
                                    <ToolRenderer
                                      toolType={toolName}
                                      toolData={(activeToolData || {}) as Record<string, unknown>}
                                      onToolComplete={result => handleToolComplete(toolName, result)}
                                      onToolSkip={handleToolSkip}
                                      readOnly={isAgentReadOnly}
                                      requiresApproval={agentStatus === 'awaiting_approval'}
                                      onApprove={handleAgentApprove}
                                      onReject={handleAgentReject}
                                      agentStatus={agentStatus}
                                      variant="versionB"
                                    />
                                  ) : null}
                                </ToolCallCard>
                              );
                            })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {!activeTool && (
                <div className="flex-shrink-0 p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <TextField
                      fullWidth
                      multiline
                      maxRows={4}
                      placeholder="Type a message..."
                      value={inputMessage}
                      onChange={e => setInputMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isProcessing || isAgentReadOnly}
                      inputRef={inputRef}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                        },
                      }}
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isProcessing || isAgentReadOnly}
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
            <div className="space-y-4">
              <StepNavigatorPanel
                currentStep={conversationState.currentStep}
                completedSteps={conversationState.completedSteps}
                onStepClick={handleStepNavigation}
              />
              <AgentActivityPanel items={agentLogs} />
              <AgentChecksPanel checks={agentChecks} />
              <AgentControls
                status={agentStatus}
                onPause={handleAgentPause}
                onResume={handleAgentResume}
                onCancel={handleAgentCancel}
                onApprove={handleAgentApprove}
                onReject={handleAgentReject}
                awaitingApproval={agentStatus === 'awaiting_approval'}
              />
              <div className="border rounded-xl bg-card shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-2">Active Tool</h2>
                <p className="text-sm text-muted-foreground">
                  {activeToolMeta ? activeToolMeta.label : 'No active tool right now.'}
                </p>
                {activeToolMeta && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Status: {isProcessing ? 'Running' : agentStatus === 'paused' ? 'Paused' : 'Ready'}
                  </div>
                )}
              </div>
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
                        {progress.collectedFields.map(field => (
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

                        {conversationState.currentStep !== ConversationStep.COMPLETE && (
                          <div className="mt-4 p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                            <p className="text-sm text-center">
                              <span className="font-semibold text-green-800 dark:text-green-600">
                                Current Step:
                              </span>{' '}
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
    </div>
  );
}
