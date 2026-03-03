import type {
  AgentContextSession,
  AgentContextSnapshot,
  ContextEvent,
  StoredContextEvent,
  TraceEvent,
  V3GenerationPhase,
} from '@/lib/chatbot/grad-plan/v3/types';

export interface ContextStore {
  createSession(args: {
    userId: string;
    conversationId: string;
    initialSnapshot?: Partial<AgentContextSnapshot>;
  }): Promise<AgentContextSession>;
  getSession(args: {
    userId: string;
    sessionId: string;
  }): Promise<AgentContextSession | null>;
  appendEvent(args: {
    userId: string;
    sessionId: string;
    event: ContextEvent;
  }): Promise<{ session: AgentContextSession; event: StoredContextEvent }>;
  listEvents(args: {
    userId: string;
    sessionId: string;
    afterId?: number;
    limit?: number;
  }): Promise<StoredContextEvent[]>;
}

export interface WorkflowRunner {
  runAutomatic(args: {
    userId: string;
    sessionId: string;
    snapshot: AgentContextSnapshot;
  }): Promise<{
    jobId: string;
    startedAt: string;
  }>;
}

export interface ModelClient {
  runPhase(args: {
    phase: V3GenerationPhase;
    model: string;
    prompt: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    output: Record<string, unknown>;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
  }>;
}

export interface RuntimeWorkflowAdapter {
  enqueueAutomaticGeneration(args: {
    userId: string;
    conversationId: string;
    sessionId: string;
    snapshot: AgentContextSnapshot;
  }): Promise<{
    jobId: string;
    reused: boolean;
  }>;
}
