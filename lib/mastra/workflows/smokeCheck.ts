import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

let didRunSmokeCheck = false;
let cachedError: Error | null = null;

export async function runMastraWorkflowSmokeCheck(): Promise<void> {
  if (didRunSmokeCheck) {
    if (cachedError) throw cachedError;
    return;
  }
  didRunSmokeCheck = true;

  try {
    const pingStep = createStep({
      id: 'ping',
      inputSchema: z.object({ ok: z.boolean() }),
      outputSchema: z.object({ ok: z.boolean() }),
      execute: async ({ inputData }) => inputData,
    });

    const workflow = createWorkflow({
      id: 'mastra-smoke-check',
      inputSchema: z.object({ ok: z.boolean() }),
      outputSchema: z.object({ ok: z.boolean() }),
    })
      .then(pingStep)
      .commit();

    const run = await workflow.createRun();
    const result = await run.start({
      inputData: { ok: true },
    });

    if (result.status !== 'success') {
      const failureMessage = 'error' in result && result.error instanceof Error
        ? result.error.message
        : 'Mastra smoke check failed';
      throw new Error(failureMessage);
    }
  } catch (error) {
    cachedError = error instanceof Error ? error : new Error('Mastra smoke check failed');
    throw cachedError;
  }
}
