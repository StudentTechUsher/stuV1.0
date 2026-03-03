import type { WorkflowRunner } from '@/lib/grad-plan/v3/interfaces';
import { v3WorkflowAdapter } from '@/lib/grad-plan/v3/workflowAdapter';

export const v3WorkflowRunner: WorkflowRunner = {
  async runAutomatic(args) {
    const conversationId = args.snapshot.meta.conversationId;
    if (!conversationId) {
      throw new Error('Cannot run automatic workflow without conversationId');
    }

    const result = await v3WorkflowAdapter.enqueueAutomaticGeneration({
      userId: args.userId,
      conversationId,
      sessionId: args.sessionId,
      snapshot: args.snapshot,
    });

    return {
      jobId: result.jobId,
      startedAt: new Date().toISOString(),
    };
  },
};
