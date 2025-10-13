import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';
import {
  VALIDATION_OPTIONS,
  chatCompletionSchema,
  type ChatCompletionInput,
} from '@/lib/validation/schemas';
import { chatCompletion, OpenAIChatError } from '@/lib/services/openaiService';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return handleChatCompletion(request);
}

async function handleChatCompletion(request: NextRequest) {
  try {
    const body = await request.json();
    let parsed: ChatCompletionInput;

    try {
      parsed = await chatCompletionSchema.validate(body, VALIDATION_OPTIONS);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: 'Invalid request body', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { messages, max_tokens, temperature } = parsed;

    // Call chat completion using service layer
    const result = await chatCompletion(messages, { max_tokens, temperature });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OpenAIChatError) {
      if (error.message.includes('not configured')) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }

      // Do NOT log error details - may contain user chat messages with PII
      logError('OpenAI chat API error', error, {
        action: 'openai_chat',
      });
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
    }

    // Do NOT log error details - may contain user chat messages with PII
    logError('Unexpected error in OpenAI chat', error, {
      action: 'openai_chat_api',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}