import { NextRequest, NextResponse } from 'next/server';
import { chatCompletionWithTools, type ChatCompletionWithToolsResponse } from '@/lib/services/openaiService';
import { getVerifiedUser } from '@/lib/supabase/auth';

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

/**
 * POST /api/chatbot
 * Handles chatbot conversation messages with OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getVerifiedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { messages, systemPrompt, tools } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Build messages array with system prompt
    const chatMessages: OpenAIChatMessage[] = [];

    if (systemPrompt) {
      chatMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation messages
    chatMessages.push(...messages);

    // Map tool definitions if provided
    const openAITools = tools?.map((tool: unknown) => {
      // Tool is already in OpenAI format from frontend
      return tool;
    });

    // Call OpenAI
    const response: ChatCompletionWithToolsResponse = await chatCompletionWithTools(
      chatMessages,
      openAITools,
      {
        max_tokens: 1000,
        temperature: 0.7,
      }
    );

    return NextResponse.json({
      success: true,
      content: response.content,
      tool_calls: response.tool_calls,
      finish_reason: response.finish_reason,
      usage: response.usage,
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process chat message'
      },
      { status: 500 }
    );
  }
}
