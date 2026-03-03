/**
 * Grad Plan Orchestration Hook
 *
 * React hook that owns all orchestration state and provides handlers.
 * Both the production CreatePlanClient and test pages can consume this hook.
 */

'use client';

import { useState, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import type React from 'react';
import type { User } from '@supabase/supabase-js';
import type { ToolType } from '@/components/chatbot-tools/ToolRenderer';
import type {
  ConversationState,
  ConversationStep,
  AgentStatus,
  AgentLogItem,
  AgentCheck,
  ChatMessage,
  ToolResult,
} from '@/lib/chatbot/grad-plan/types';
import { createInitialState, updateState } from '@/lib/chatbot/grad-plan/stateManager';
import {
  computeStepTransition,
  computeSkipTransition,
  type StepConnectorContext,
  type StepTransition,
} from '@/lib/chatbot/grad-plan/stepConnector';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';
import {
  createToolCallPart,
  createToolResultPart,
  generateToolCallId,
  getToolMeta,
  isToolCallPart,
  isToolResultPart,
} from '@/lib/chatbot/grad-plan/toolRegistry';

// ============================================================================
// Types
// ============================================================================

export interface StudentProfile {
  id: string;
  university_id: number;
  student_type?: 'undergraduate' | 'honor' | 'graduate' | null;
  est_grad_date?: string | null;
  admission_year?: number | null;
  is_transfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
}

export interface GradPlanOrchestrationConfig {
  // Required context
  user: User;
  studentProfile: StudentProfile;
  hasCourses: boolean;
  hasActivePlan: boolean;
  academicTerms: AcademicTermsConfig;

  // Optional behavior flags
  mockMode?: boolean; // Skip real API calls
  executeSideEffects?: boolean; // false = log only
  initialState?: ConversationState;

  // Optional callbacks
  onPlanGenerationStart?: () => void;
}

export interface GradPlanOrchestrationReturn {
  // State
  conversationState: ConversationState;
  messages: ChatMessage[];
  activeTool: ToolType | null;
  activeToolData: Record<string, unknown>;
  isProcessing: boolean;
  agentStatus: AgentStatus;
  agentLogs: AgentLogItem[];
  agentChecks: AgentCheck[];

  // State setters (for V2 composition)
  setConversationState: React.Dispatch<React.SetStateAction<ConversationState>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType | null>>;
  setActiveToolData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setAgentStatus: React.Dispatch<React.SetStateAction<AgentStatus>>;

  // Handlers
  handleToolComplete: (toolType: ToolType, result: unknown) => Promise<void>;
  handleToolSkip: () => void;
  handleStepNavigation: (step: ConversationStep) => void;

  // Test helpers
  injectState: (state: Partial<ConversationState>) => void;
  injectToolResult: (toolType: ToolType, result: unknown) => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGradPlanOrchestration(
  config: GradPlanOrchestrationConfig
): GradPlanOrchestrationReturn {
  const {
    user,
    studentProfile,
    hasCourses,
    hasActivePlan,
    academicTerms,
    mockMode = false,
    executeSideEffects = true,
    initialState,
    onPlanGenerationStart,
  } = config;

  // State
  const [conversationState, setConversationState] = useState<ConversationState>(
    initialState ||
      createInitialState(
        `conv-${Date.now()}`,
        user.id,
        studentProfile.university_id
      )
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [activeToolData, setActiveToolData] = useState<Record<string, unknown>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [agentLogs, setAgentLogs] = useState<AgentLogItem[]>([]);
  const [agentChecks, setAgentChecks] = useState<AgentCheck[]>([]);

  // Refs to track message IDs
  const messageIdCounter = useRef(0);

  // Helper: Generate message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg-${messageIdCounter.current}`;
  }, []);

  // Helper: Push agent log
  const pushAgentLog = useCallback((log: Omit<AgentLogItem, 'id' | 'ts'>) => {
    const newLog: AgentLogItem = {
      id: `log-${Date.now()}-${Math.random()}`,
      ts: new Date().toISOString(),
      ...log,
    };
    setAgentLogs(prev => [...prev, newLog]);
  }, []);

  // Helper: Upsert agent check
  const upsertAgentCheck = useCallback((check: AgentCheck) => {
    setAgentChecks(prev => {
      const existing = prev.findIndex(c => c.id === check.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = check;
        return updated;
      }
      return [...prev, check];
    });
  }, []);

  // Build context for step connector
  const buildContext = useCallback((): StepConnectorContext => {
    return {
      studentProfile: {
        id: studentProfile.id,
        university_id: studentProfile.university_id,
        student_type: studentProfile.student_type,
        est_grad_date: studentProfile.est_grad_date,
        admission_year: studentProfile.admission_year,
        is_transfer: studentProfile.is_transfer,
      },
      hasCourses,
      academicTerms,
      userId: user.id,
    };
  }, [studentProfile, hasCourses, academicTerms, user.id]);

  // Apply a step transition
  const applyTransition = useCallback(
    async (
      transition: StepTransition,
      _toolType: ToolType,
      options?: { toolResult?: ToolResult }
    ) => {
      const nextToolMeta = transition.nextTool ? getToolMeta(transition.nextTool) : null;
      const nextToolCallId =
        transition.nextTool && nextToolMeta?.mode === 'parts' ? generateToolCallId() : null;

      // 1. Apply state update
      const stateUpdate = {
        ...transition.stateUpdate,
        pendingToolCall: nextToolCallId,
      };
      if (options?.toolResult) {
        stateUpdate.lastToolResult = options.toolResult;
      }
      setConversationState(prev => updateState(prev, stateUpdate));

      // 2. Add confirmation message
      if (transition.confirmationMessage) {
        const newMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: transition.confirmationMessage,
          timestamp: new Date(),
          decisionMeta: transition.decisionMeta,
          showFeedback: transition.showFeedback,
        };
        setMessages(prev => {
          let updated = [...prev];

          // Remove welcome message if requested
          if (transition.removeWelcomeMessage && updated.length > 0) {
            updated = updated.slice(1);
          }

          // Remove last assistant message if requested
          if (transition.removeLastAssistantMessage) {
            const lastAssistantIndex = updated.findLastIndex(m => m.role === 'assistant');
            if (lastAssistantIndex >= 0) {
              updated.splice(lastAssistantIndex, 1);
            }
          }

          return [...updated, newMessage];
        });
      }

      // 3. Upsert agent check
      if (transition.agentCheck) {
        upsertAgentCheck(transition.agentCheck);
      }

      // 4. Execute side effects
      for (const effect of transition.sideEffects) {
        if (executeSideEffects && !mockMode) {
          await executeSideEffect(effect);
        } else {
          console.log('[Mock/Test Mode] Would execute side effect:', effect);
        }
      }

      // 5. Set next tool after delay
      if (transition.nextTool) {
        setTimeout(() => {
          if (nextToolMeta?.mode === 'parts' && nextToolCallId) {
            setMessages(prev => [
              ...prev,
              {
                id: generateMessageId(),
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                parts: [
                  createToolCallPart(
                    transition.nextTool!,
                    transition.nextToolData || {},
                    nextToolCallId
                  ),
                ],
              },
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                id: generateMessageId(),
                role: 'tool',
                content: '',
                timestamp: new Date(),
                toolType: transition.nextTool!,
                toolData: transition.nextToolData,
              },
            ]);
          }
          setActiveTool(transition.nextTool);
          setActiveToolData({
            ...transition.nextToolData,
            toolCallId: nextToolCallId,
          });
          setIsProcessing(false);
        }, transition.delayMs);
      } else {
        setActiveTool(null);
        setActiveToolData({});
        setIsProcessing(false);
      }
    },
    [generateMessageId, upsertAgentCheck, executeSideEffects, mockMode]
  );

  // Execute a side effect
  const executeSideEffect = async (effect: StepTransition['sideEffects'][0]) => {
    switch (effect.type) {
      case 'fetch_student_type':
        try {
          const response = await fetch('/api/student/planning-data');
          if (response.ok) {
            const data = await response.json();
            // Update context with new student type
            console.log('Fetched student type:', data?.data?.student_type);
          }
        } catch (error) {
          console.error('Failed to fetch student type', error);
        }
        break;

      case 'fetch_program_names':
        try {
          const { programIds, universityId } = effect;
          const response = await fetch(
            `/api/programs/batch?ids=${programIds.join(',')}&universityId=${universityId}`
          );
          if (response.ok) {
            const programs = await response.json();
            console.log('Fetched program names:', programs);
            // TODO: Update state with enriched program names
          }
        } catch (error) {
          console.error('Failed to fetch program names', error);
        }
        break;

      case 'update_profile':
        try {
          const { userId, updates } = effect;
          const response = await fetch('/api/student/planning-data', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });
          if (!response.ok) {
            throw new Error('Failed to update profile');
          }
          console.log('Updated profile:', updates);
        } catch (error) {
          console.error('Failed to update profile', error);
        }
        break;

      case 'start_plan_generation':
        if (onPlanGenerationStart) {
          onPlanGenerationStart();
        }
        console.log('Starting plan generation...');
        break;

      default:
        console.warn('Unknown side effect type:', effect);
    }
  };

  const findLatestToolCallId = useCallback(
    (toolName: ToolType): string | null => {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        const parts = messages[i].parts;
        if (!parts) continue;
        const callPart = [...parts]
          .reverse()
          .find(
            part =>
              isToolCallPart(part) &&
              part.toolName === toolName
          );
        if (callPart) {
          return callPart.toolCallId;
        }
      }
      return null;
    },
    [messages]
  );

  const appendToolResultToMessages = useCallback(
    (
      toolName: ToolType,
      toolCallId: string,
      result: unknown,
      isError = false
    ) => {
      setMessages(prev => {
        let updated = false;
        const next = prev.map(message => {
          if (!message.parts) return message;

          const hasCall = message.parts.some(
            part => isToolCallPart(part) && part.toolCallId === toolCallId
          );
          if (!hasCall) return message;

          const existingResultIndex = message.parts.findIndex(
            part => isToolResultPart(part) && part.toolCallId === toolCallId
          );
          const nextParts = [...message.parts];
          const newResultPart = createToolResultPart(
            toolName,
            toolCallId,
            result,
            isError
          );

          if (existingResultIndex >= 0) {
            nextParts[existingResultIndex] = newResultPart;
          } else {
            nextParts.push(newResultPart);
          }

          updated = true;
          return {
            ...message,
            parts: nextParts,
          };
        });

        if (!updated) {
          return [
            ...prev,
            {
              id: generateMessageId(),
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              parts: [
                createToolCallPart(toolName, {}, toolCallId),
                createToolResultPart(toolName, toolCallId, result, isError),
              ],
            },
          ];
        }

        return next;
      });
    },
    [generateMessageId]
  );

  // Handle tool completion
  const handleToolComplete = useCallback(
    async (toolType: ToolType, result: unknown) => {
      setIsProcessing(true);
      pushAgentLog({
        type: 'tool',
        label: `Completed ${toolType.replace(/_/g, ' ')}`,
        status: 'ok',
      });

      try {
        const context = buildContext();
        const transition = computeStepTransition(
          toolType,
          result as never,
          conversationState,
          context
        );

        const toolCallId =
          conversationState.pendingToolCall || findLatestToolCallId(toolType);
        const toolMeta = getToolMeta(toolType);

        if (toolMeta?.mode === 'parts' && toolCallId) {
          appendToolResultToMessages(toolType, toolCallId, result);
        }

        const toolResult: ToolResult = {
          toolName: toolType,
          success: true,
          data: result,
          timestamp: new Date(),
          toolCallId: toolCallId || undefined,
        };

        await applyTransition(transition, toolType, { toolResult });
      } catch (error) {
        console.error('Error handling tool completion', error, {
          action: 'handleToolComplete',
          toolType,
        });
        setMessages(prev => [
          ...prev,
          {
            id: generateMessageId(),
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
      }
    },
    [
      conversationState,
      buildContext,
      applyTransition,
      pushAgentLog,
      generateMessageId,
      appendToolResultToMessages,
      findLatestToolCallId,
    ]
  );

  // Handle tool skip
  const handleToolSkip = useCallback(() => {
    setActiveTool(null);
    const skippedTool = activeTool || messages.findLast(m => m.role === 'tool')?.toolType;
    if (!skippedTool) return;

    const context = buildContext();
    const transition = computeSkipTransition(
      skippedTool as ToolType,
      conversationState,
      context
    );

    const toolCallId =
      conversationState.pendingToolCall || findLatestToolCallId(skippedTool as ToolType);
    const toolMeta = getToolMeta(skippedTool as ToolType);

    if (toolMeta?.mode === 'parts' && toolCallId) {
      appendToolResultToMessages(skippedTool as ToolType, toolCallId, { skipped: true }, true);
    }

    const toolResult: ToolResult = {
      toolName: skippedTool as ToolType,
      success: false,
      error: 'skipped',
      timestamp: new Date(),
      toolCallId: toolCallId || undefined,
    };

    void applyTransition(transition, skippedTool as ToolType, { toolResult });
  }, [
    activeTool,
    messages,
    conversationState,
    buildContext,
    applyTransition,
    appendToolResultToMessages,
    findLatestToolCallId,
  ]);

  // Handle step navigation
  const handleStepNavigation = useCallback((step: ConversationStep) => {
    setConversationState(prev =>
      updateState(prev, {
        step,
      })
    );
  }, []);

  // Test helper: Inject state
  const injectState = useCallback((partialState: Partial<ConversationState>) => {
    setConversationState(prev => ({
      ...prev,
      ...partialState,
    }));
  }, []);

  // Test helper: Inject tool result (same as handleToolComplete but for testing)
  const injectToolResult = useCallback(
    async (toolType: ToolType, result: unknown) => {
      return handleToolComplete(toolType, result);
    },
    [handleToolComplete]
  );

  return {
    // State
    conversationState,
    messages,
    activeTool,
    activeToolData,
    isProcessing,
    agentStatus,
    agentLogs,
    agentChecks,

    // State setters (for V2 composition)
    setConversationState,
    setMessages,
    setActiveTool,
    setActiveToolData,
    setIsProcessing,
    setAgentStatus,

    // Handlers
    handleToolComplete,
    handleToolSkip,
    handleStepNavigation,

    // Test helpers
    injectState,
    injectToolResult,
  };
}
