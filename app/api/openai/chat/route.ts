import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from 'yup';
import {
  VALIDATION_OPTIONS,
  chatCompletionSchema,
  type ChatCompletionInput,
} from '@/lib/validation/schemas';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let parsed: ChatCompletionInput;
    try {
      parsed = await chatCompletionSchema.validate(body, VALIDATION_OPTIONS);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: 'Invalid request body', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    const {
      messages,
      max_tokens: maxTokens = 500,
      temperature = 0.7,
    } = parsed;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      await response.text(); // Consume response body, don't log (may contain user messages)
      logError('OpenAI chat API error', new Error('OpenAI request failed'), {
        httpStatus: response.status,
        action: 'openai_chat',
      });
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      content: data.choices[0]?.message?.content || 'No response generated',
      usage: data.usage,
    });

  } catch (error) {
    // Do NOT log error details - may contain user chat messages with PII
    logError('OpenAI chat API error', error, {
      action: 'openai_chat_api',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
