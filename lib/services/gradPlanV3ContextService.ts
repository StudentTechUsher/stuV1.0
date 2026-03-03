import 'server-only';

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redactV3TracePayload } from '@/lib/grad-plan/v3/redaction';
import {
  applyContextEvent,
  createInitialAgentContextSnapshot,
  deriveV3SessionStatus,
  migrateAgentContextSnapshot,
} from '@/lib/chatbot/grad-plan/v3/reducer';
import {
  AGENT_CONTEXT_SCHEMA_VERSION,
  type AgentContextSession,
  type AgentContextSnapshot,
  type ContextEvent,
  type ContextEventUnion,
  type ContextEventPayloadMap,
  type ContextEventType,
  type StoredContextEvent,
  type TraceEvent,
  type TraceEventLevel,
  type TraceEventScope,
  isContextEventType,
} from '@/lib/chatbot/grad-plan/v3/types';

type SessionRow = {
  id: string;
  user_id: string;
  conversation_id: string;
  status: AgentContextSession['status'];
  schema_version: number;
  snapshot_json: AgentContextSnapshot;
  last_event_id: number;
  created_at: string;
  updated_at: string;
};

type ContextEventRow = {
  id: number;
  session_id: string;
  user_id: string;
  event_id: string;
  schema_version: number;
  event_type: string;
  actor: ContextEvent['actor'];
  payload_json: Record<string, unknown>;
  idempotency_key: string | null;
  ts: string;
};

type TraceRow = {
  id: number;
  session_id: string;
  user_id: string;
  trace_id: string;
  event_type: TraceEventScope;
  phase: TraceEvent['phase'];
  level: TraceEventLevel;
  message: string;
  payload_json: Record<string, unknown> | null;
  redacted: boolean;
  ts: string;
};

function toSession(row: SessionRow): AgentContextSession {
  const snapshot = migrateAgentContextSnapshot(row.snapshot_json);
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    status: row.status,
    snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEventId: row.last_event_id ?? 0,
  };
}

function toStoredEvent(row: ContextEventRow): StoredContextEvent {
  const eventType = row.event_type;
  if (!isContextEventType(eventType)) {
    throw new Error(`Unsupported context event type: ${eventType}`);
  }

  return {
    sequenceId: row.id,
    id: row.event_id,
    sessionId: row.session_id,
    schemaVersion: row.schema_version,
    type: eventType,
    payload: row.payload_json as ContextEvent['payload'],
    actor: row.actor,
    createdAt: row.ts,
    idempotencyKey: row.idempotency_key,
  };
}

function toTraceEvent(row: TraceRow): TraceEvent {
  return {
    id: row.trace_id,
    sessionId: row.session_id,
    sequenceId: row.id,
    ts: row.ts,
    level: row.level,
    scope: row.event_type,
    phase: row.phase,
    message: row.message,
    payload: row.payload_json,
    redacted: row.redacted,
  };
}

async function getSessionRowByConversation(userId: string, conversationId: string): Promise<SessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SessionRow | null;
}

async function getSessionRowById(userId: string, sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SessionRow | null;
}

async function getContextEventByEventId(sessionId: string, eventId: string): Promise<ContextEventRow | null> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_context_events')
    .select('*')
    .eq('session_id', sessionId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ContextEventRow | null;
}

async function getContextEventByIdempotencyKey(
  sessionId: string,
  idempotencyKey: string
): Promise<ContextEventRow | null> {
  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_context_events')
    .select('*')
    .eq('session_id', sessionId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ContextEventRow | null;
}

export async function createOrGetV3Session(args: {
  userId: string;
  conversationId: string;
  initialSnapshot?: Partial<AgentContextSnapshot>;
}): Promise<{ session: AgentContextSession; reused: boolean }> {
  const existing = await getSessionRowByConversation(args.userId, args.conversationId);
  if (existing) {
    return {
      session: toSession(existing),
      reused: true,
    };
  }

  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const snapshot = createInitialAgentContextSnapshot({
    ...args.initialSnapshot,
    meta: {
      sessionId,
      conversationId: args.conversationId,
      createdAt: now,
      updatedAt: now,
    },
  });

  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_sessions')
    .insert({
      id: sessionId,
      user_id: args.userId,
      conversation_id: args.conversationId,
      status: 'active',
      schema_version: AGENT_CONTEXT_SCHEMA_VERSION,
      snapshot_json: snapshot,
      last_event_id: 0,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    const conflict = error?.message.includes('grad_plan_v3_sessions_user_conversation_key');
    if (conflict) {
      const conflicted = await getSessionRowByConversation(args.userId, args.conversationId);
      if (conflicted) {
        return {
          session: toSession(conflicted),
          reused: true,
        };
      }
    }

    throw new Error(error?.message || 'Failed to create v3 session');
  }

  const session = toSession(data as SessionRow);
  await appendV3TraceEvent({
    sessionId: session.id,
    userId: session.userId,
    eventType: 'system',
    level: 'info',
    message: 'Session created',
    payload: {
      conversationId: session.conversationId,
      schemaVersion: session.snapshot.schemaVersion,
    },
  });

  return {
    session,
    reused: false,
  };
}

export async function getV3Session(args: {
  userId: string;
  sessionId: string;
}): Promise<AgentContextSession | null> {
  const row = await getSessionRowById(args.userId, args.sessionId);
  return row ? toSession(row) : null;
}

export async function listV3ContextEvents(args: {
  userId: string;
  sessionId: string;
  afterId?: number;
  limit?: number;
}): Promise<StoredContextEvent[]> {
  const session = await getV3Session(args);
  if (!session) return [];

  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_context_events')
    .select('*')
    .eq('session_id', args.sessionId)
    .gt('id', args.afterId ?? 0)
    .order('id', { ascending: true })
    .limit(args.limit ?? 200);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toStoredEvent(row as ContextEventRow));
}

export async function appendV3ContextEvent(args: {
  userId: string;
  sessionId: string;
  eventType: ContextEventType;
  payload: ContextEventPayloadMap[ContextEventType];
  eventId?: string;
  actor?: ContextEvent['actor'];
  createdAt?: string;
  idempotencyKey?: string;
}): Promise<{ session: AgentContextSession; event: StoredContextEvent; reused: boolean } | null> {
  const sessionRow = await getSessionRowById(args.userId, args.sessionId);
  if (!sessionRow) return null;

  const safeEventId = args.eventId?.trim() || randomUUID();
  const safeIdempotencyKey = args.idempotencyKey?.trim() || null;

  const existingByEventId = await getContextEventByEventId(args.sessionId, safeEventId);
  if (existingByEventId) {
    return {
      session: toSession(sessionRow),
      event: toStoredEvent(existingByEventId),
      reused: true,
    };
  }

  if (safeIdempotencyKey) {
    const existingByIdempotency = await getContextEventByIdempotencyKey(args.sessionId, safeIdempotencyKey);
    if (existingByIdempotency) {
      return {
        session: toSession(sessionRow),
        event: toStoredEvent(existingByIdempotency),
        reused: true,
      };
    }
  }

  const insertedTs = args.createdAt || new Date().toISOString();
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('grad_plan_v3_context_events')
    .insert({
      session_id: args.sessionId,
      user_id: args.userId,
      event_id: safeEventId,
      schema_version: AGENT_CONTEXT_SCHEMA_VERSION,
      event_type: args.eventType,
      actor: args.actor ?? 'user',
      payload_json: args.payload,
      idempotency_key: safeIdempotencyKey,
      ts: insertedTs,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || 'Failed to append context event');
  }

  const storedEvent = toStoredEvent(inserted as ContextEventRow);
  const nextSnapshot = applyContextEvent(migrateAgentContextSnapshot(sessionRow.snapshot_json), {
    ...storedEvent,
    payload: args.payload,
  } as ContextEventUnion);

  const now = new Date().toISOString();
  const nextStatus = deriveV3SessionStatus(nextSnapshot);
  const { data: updatedRow, error: updateError } = await supabaseAdmin
    .from('grad_plan_v3_sessions')
    .update({
      status: nextStatus,
      schema_version: nextSnapshot.schemaVersion,
      snapshot_json: {
        ...nextSnapshot,
        meta: {
          ...nextSnapshot.meta,
          sessionId: sessionRow.id,
          conversationId: sessionRow.conversation_id,
          updatedAt: now,
        },
      },
      last_event_id: storedEvent.sequenceId,
      updated_at: now,
    })
    .eq('id', sessionRow.id)
    .eq('user_id', sessionRow.user_id)
    .select('*')
    .single();

  if (updateError || !updatedRow) {
    throw new Error(updateError?.message || 'Failed to update v3 session snapshot');
  }

  await appendV3TraceEvent({
    sessionId: args.sessionId,
    userId: args.userId,
    eventType: 'context_event',
    phase: nextSnapshot.generation.phase,
    level: 'info',
    message: `Context event: ${args.eventType}`,
    payload: {
      eventType: args.eventType,
      actor: args.actor ?? 'user',
      payload: args.payload,
      sequenceId: storedEvent.sequenceId,
    },
    traceId: `ctx-${storedEvent.sequenceId}`,
  });

  return {
    session: toSession(updatedRow as SessionRow),
    event: storedEvent,
    reused: false,
  };
}

export async function appendV3TraceEvent(args: {
  sessionId: string;
  userId: string;
  eventType: TraceEventScope;
  phase?: TraceEvent['phase'];
  level: TraceEventLevel;
  message: string;
  payload?: Record<string, unknown> | null;
  traceId?: string;
}): Promise<TraceEvent | null> {
  const traceId = args.traceId?.trim() || randomUUID();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('grad_plan_v3_trace_events')
    .select('*')
    .eq('session_id', args.sessionId)
    .eq('trace_id', traceId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return toTraceEvent(existing as TraceRow);
  }

  const redactedPayload = redactV3TracePayload(args.payload ?? null);

  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_trace_events')
    .insert({
      session_id: args.sessionId,
      user_id: args.userId,
      trace_id: traceId,
      event_type: args.eventType,
      phase: args.phase ?? null,
      level: args.level,
      message: args.message,
      payload_json: redactedPayload,
      redacted: true,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to append trace event');
  }

  return toTraceEvent(data as TraceRow);
}

export async function listV3TraceEvents(args: {
  userId: string;
  sessionId: string;
  afterId?: number;
  limit?: number;
}): Promise<TraceEvent[]> {
  const session = await getV3Session({
    userId: args.userId,
    sessionId: args.sessionId,
  });

  if (!session) return [];

  const { data, error } = await supabaseAdmin
    .from('grad_plan_v3_trace_events')
    .select('*')
    .eq('session_id', args.sessionId)
    .gt('id', args.afterId ?? 0)
    .order('id', { ascending: true })
    .limit(args.limit ?? 500);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toTraceEvent(row as TraceRow));
}
