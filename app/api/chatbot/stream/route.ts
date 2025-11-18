import { NextRequest } from 'next/server';
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
 * POST /api/chatbot/stream
 * Handles streaming chatbot responses with OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getVerifiedUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { messages, systemPrompt, tools } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
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
    const openAITools = tools?.map((tool: unknown) => tool);

    const requestBody: Record<string, unknown> = {
      model: 'gpt-4o-mini',
      messages: chatMessages,
      max_tokens: 4000,
      temperature: 0.7,
      stream: true, // Enable streaming
    };

    // Add tools if provided
    if (openAITools && openAITools.length > 0) {
      requestBody.tools = openAITools;
      requestBody.tool_choice = 'auto';
    }

    // Call OpenAI with streaming
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

    // Return the stream directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chatbot streaming API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process chat message'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
