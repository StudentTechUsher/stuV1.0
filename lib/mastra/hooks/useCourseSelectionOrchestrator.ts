/**
 * React Hook for Course Selection Orchestrator
 *
 * Provides a clean API for components to interact with the course selection flow
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CourseSelectionOrchestrator } from '../courseSelectionOrchestrator';
import {
  CourseSelectionSessionInput,
  AgentConversationState,
  AgentMessageContent,
  SchedulerEvent,
} from '../types';

/**
 * Message in the conversation thread
 */
export interface ConversationMessage {
  id: string;
  type: 'agent' | 'user';
  content: AgentMessageContent | string;
  timestamp: Date;
}

/**
 * Hook state
 */
interface OrchestratorState {
  isInitialized: boolean;
  isProcessing: boolean;
  messages: ConversationMessage[];
  currentState: AgentConversationState | null;
  error: Error | null;
}

/**
 * Hook for managing course selection orchestrator
 */
export function useCourseSelectionOrchestrator(input?: CourseSelectionSessionInput) {
  const orchestratorRef = useRef<CourseSelectionOrchestrator | null>(null);
  const [state, setState] = useState<OrchestratorState>({
    isInitialized: false,
    isProcessing: false,
    messages: [],
    currentState: null,
    error: null,
  });

  /**
   * Initialize orchestrator with session input
   */
  const initialize = useCallback(
    async (sessionInput: CourseSelectionSessionInput) => {
      try {
        setState((prev) => ({ ...prev, isProcessing: true, error: null }));

        // Create orchestrator
        orchestratorRef.current = new CourseSelectionOrchestrator(sessionInput);

        // Get welcome message
        const welcomeMessage = await orchestratorRef.current.start();

        setState({
          isInitialized: true,
          isProcessing: false,
          messages: [
            {
              id: crypto.randomUUID(),
              type: 'agent',
              content: welcomeMessage,
              timestamp: new Date(),
            },
          ],
          currentState: orchestratorRef.current.getState(),
          error: null,
        });
      } catch (error) {
        console.error('Error initializing orchestrator:', error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
      }
    },
    []
  );

  /**
   * Send user input to orchestrator
   */
  const sendMessage = useCallback(
    async (userInput: string | { sectionId?: number; action?: string }) => {
      if (!orchestratorRef.current) {
        console.error('Orchestrator not initialized');
        return;
      }

      try {
        setState((prev) => ({ ...prev, isProcessing: true, error: null }));

        // Add user message to thread
        const userMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          type: 'user',
          content: typeof userInput === 'string' ? userInput : JSON.stringify(userInput),
          timestamp: new Date(),
        };

        // Process input and get agent response
        const agentResponse = await orchestratorRef.current.processUserInput(userInput);

        // Add agent message to thread
        const agentMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          type: 'agent',
          content: agentResponse,
          timestamp: new Date(),
        };

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          messages: [...prev.messages, userMessage, agentMessage],
          currentState: orchestratorRef.current!.getState(),
        }));
      } catch (error) {
        console.error('Error processing message:', error);
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
      }
    },
    []
  );

  /**
   * Select a section (primary or backup)
   */
  const selectSection = useCallback(
    async (sectionId: number) => {
      await sendMessage({ sectionId });
    },
    [sendMessage]
  );

  /**
   * Respond to waitlist confirmation
   */
  const respondToWaitlist = useCallback(
    async (accept: boolean) => {
      await sendMessage({ action: accept ? 'yes' : 'no' });
    },
    [sendMessage]
  );

  /**
   * Skip current course
   */
  const skipCourse = useCallback(async () => {
    if (!orchestratorRef.current) {
      return;
    }

    try {
      setState((prev) => ({ ...prev, isProcessing: true }));

      const response = await orchestratorRef.current.skipCurrentCourse();

      const agentMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        type: 'agent',
        content: response,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        messages: [...prev.messages, agentMessage],
        currentState: orchestratorRef.current!.getState(),
      }));
    } catch (error) {
      console.error('Error skipping course:', error);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, []);

  /**
   * Reset orchestrator (start over)
   */
  const reset = useCallback(async () => {
    if (!orchestratorRef.current) {
      return;
    }

    try {
      orchestratorRef.current.reset();
      const welcomeMessage = await orchestratorRef.current.start();

      setState({
        isInitialized: true,
        isProcessing: false,
        messages: [
          {
            id: crypto.randomUUID(),
            type: 'agent',
            content: welcomeMessage,
            timestamp: new Date(),
          },
        ],
        currentState: orchestratorRef.current.getState(),
        error: null,
      });
    } catch (error) {
      console.error('Error resetting orchestrator:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, []);

  /**
   * Get current calendar events
   */
  const getCalendarEvents = useCallback((): SchedulerEvent[] => {
    if (!orchestratorRef.current) {
      return [];
    }
    return orchestratorRef.current.getCalendarEvents();
  }, []);

  /**
   * Get progress indicator text
   */
  const getProgressIndicator = useCallback((): string => {
    if (!orchestratorRef.current) {
      return '';
    }
    return orchestratorRef.current.getProgressIndicator();
  }, [state.currentState]); // Re-compute when state changes

  /**
   * Auto-initialize if input provided
   */
  useEffect(() => {
    if (input && !state.isInitialized && !orchestratorRef.current) {
      initialize(input);
    }
  }, [input, state.isInitialized, initialize]);

  return {
    // State
    isInitialized: state.isInitialized,
    isProcessing: state.isProcessing,
    messages: state.messages,
    currentState: state.currentState,
    error: state.error,

    // Actions
    initialize,
    sendMessage,
    selectSection,
    respondToWaitlist,
    skipCourse,
    reset,

    // Getters
    getCalendarEvents,
    getProgressIndicator,
  };
}

/**
 * Hook return type (for TypeScript users)
 */
export type UseCourseSelectionOrchestratorReturn = ReturnType<typeof useCourseSelectionOrchestrator>;
