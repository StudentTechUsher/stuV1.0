import { NextRequest } from 'next/server';
import { getVerifiedUser } from '@/lib/supabase/auth';
import { GetAiPrompt } from '@/lib/services/aiDbService';
import {
  DEFAULT_ACTIVE_FEEDBACK_PROMPT,
  injectActiveFeedbackPromptValues,
  loadActiveFeedbackExampleStructure,
} from '@/lib/grad-plan/activeFeedbackPrompt';

const VALID_PHASES = new Set(['major_skeleton', 'gen_ed_fill', 'elective_balance']);

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      input,
      phase,
      promptName,
      model,
      max_output_tokens,
    } = body ?? {};

    if (!input || typeof input !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Input payload is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!phase || !VALID_PHASES.has(phase)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing phase' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const promptRecordName = typeof promptName === 'string' ? promptName : 'active_feedback_mode';
    const basePrompt = await GetAiPrompt(promptRecordName);
    const serializedInput = JSON.stringify(input, null, 2);
    const exampleStructureJson = await loadActiveFeedbackExampleStructure();

    const promptText = injectActiveFeedbackPromptValues({
      basePrompt: basePrompt || DEFAULT_ACTIVE_FEEDBACK_PROMPT,
      phase,
      serializedInput,
      exampleStructureJson,
    });

    const resolvedModel = typeof model === 'string' ? model : 'gpt-5-mini';
    const isNewModel = resolvedModel.includes('gpt-5')
      || resolvedModel.includes('gpt-4.1')
      || resolvedModel.includes('o3')
      || resolvedModel.includes('o4');
    const maxTokensKey = isNewModel ? 'max_completion_tokens' : 'max_tokens';

    const requestBody: Record<string, unknown> = {
      model: resolvedModel,
      messages: [
        {
          role: 'user',
          content: promptText,
        },
      ],
      temperature: 1,
      stream: true,
    };

    requestBody[maxTokensKey] = typeof max_output_tokens === 'number' ? max_output_tokens : 18_000;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return new Response(
        JSON.stringify({ error: `OpenAI request failed: ${errorText}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Active feedback streaming API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process active feedback request',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

