import type { ContextStore } from '@/lib/grad-plan/v3/interfaces';
import {
  appendV3ContextEvent,
  createOrGetV3Session,
  getV3Session,
  listV3ContextEvents,
} from '@/lib/services/gradPlanV3ContextService';

export const v3ContextStore: ContextStore = {
  async createSession(args) {
    const { session } = await createOrGetV3Session({
      userId: args.userId,
      conversationId: args.conversationId,
      initialSnapshot: args.initialSnapshot,
    });
    return session;
  },

  async getSession(args) {
    return await getV3Session({
      userId: args.userId,
      sessionId: args.sessionId,
    });
  },

  async appendEvent(args) {
    const result = await appendV3ContextEvent({
      userId: args.userId,
      sessionId: args.sessionId,
      eventType: args.event.type,
      payload: args.event.payload,
      eventId: args.event.id,
      actor: args.event.actor,
      createdAt: args.event.createdAt,
      idempotencyKey: args.event.idempotencyKey ?? undefined,
    });

    if (!result) {
      throw new Error('Session not found');
    }

    return {
      session: result.session,
      event: result.event,
    };
  },

  async listEvents(args) {
    return await listV3ContextEvents({
      userId: args.userId,
      sessionId: args.sessionId,
      afterId: args.afterId,
      limit: args.limit,
    });
  },
};
