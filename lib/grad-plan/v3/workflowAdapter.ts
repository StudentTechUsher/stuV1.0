import {
  createOrReuseV3GenerationJob,
  triggerV3GenerationJob,
} from '@/lib/services/gradPlanV3GenerationJobService';
import type { RuntimeWorkflowAdapter } from '@/lib/grad-plan/v3/interfaces';

export const v3WorkflowAdapter: RuntimeWorkflowAdapter = {
  async enqueueAutomaticGeneration(args) {
    const { job, reused } = await createOrReuseV3GenerationJob({
      userId: args.userId,
      sessionId: args.sessionId,
      inputPayload: {},
    });

    void triggerV3GenerationJob(job.id);

    return {
      jobId: job.id,
      reused,
    };
  },
};
