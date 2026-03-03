import { captureServerEvent } from '@/lib/observability/posthog-server';
import type { V3GenerationPhase } from '@/lib/chatbot/grad-plan/v3/types';

export async function captureV3PhaseLatency(args: {
  userId: string;
  sessionId: string;
  phase: V3GenerationPhase;
  durationMs: number;
  status: 'ok' | 'error';
}) {
  await captureServerEvent(
    'grad_plan_v3_phase_latency',
    {
      action: 'phase_latency',
      status: args.status,
      duration: args.durationMs,
      error_code: args.status === 'error' ? 'phase_error' : undefined,
    },
    `${args.userId}:${args.sessionId}:${args.phase}`
  );
}

export async function captureV3RepairLoopMetric(args: {
  userId: string;
  sessionId: string;
  repairLoopCount: number;
}) {
  await captureServerEvent(
    'grad_plan_v3_repair_loop',
    {
      action: 'repair_loop',
      count: args.repairLoopCount,
      status: args.repairLoopCount > 0 ? 'used' : 'not_used',
    },
    `${args.userId}:${args.sessionId}`
  );
}

export async function captureV3ReconnectMetric(args: {
  userId: string;
  sessionId: string;
  reconnectCount: number;
}) {
  await captureServerEvent(
    'grad_plan_v3_reconnect',
    {
      action: 'trace_reconnect',
      count: args.reconnectCount,
      status: 'ok',
    },
    `${args.userId}:${args.sessionId}`
  );
}

export async function captureV3CompletionMetric(args: {
  userId: string;
  sessionId: string;
  success: boolean;
  failureCode?: string;
}) {
  await captureServerEvent(
    'grad_plan_v3_completion',
    {
      action: 'generation_completion',
      success: args.success,
      status: args.success ? 'completed' : 'failed',
      error_code: args.failureCode,
    },
    `${args.userId}:${args.sessionId}`
  );
}
