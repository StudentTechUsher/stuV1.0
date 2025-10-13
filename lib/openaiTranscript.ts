// lib/openaiTranscript.ts
// Server-side OpenAI integration for parsing transcript PDFs

import { logError } from './logger';

// OpenAI API response types
interface OpenAIMessage {
  role: 'assistant' | 'user' | 'system';
  content: Array<{
    text: {
      value: string;
    };
  }>;
}

interface OpenAIMessagesResponse {
  data: OpenAIMessage[];
}

export type ParsedCourse = {
  term: string | null;
  subject: string;
  number: string;
  title: string | null;
  credits: number | null;
  grade: string | null;
  confidence: number | null;
};

/**
 * Upload PDF to OpenAI Files API
 * Docs: https://platform.openai.com/docs/api-reference/files/create
 */
export async function uploadPdfToOpenAI(
  pdfBuffer: Buffer,
  filename: string
): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Create FormData for multipart upload
  const formData = new FormData();
  // Convert Buffer to Uint8Array with a proper ArrayBuffer for Blob compatibility
  const uint8Array = new Uint8Array(pdfBuffer);
  const blob = new Blob([uint8Array], { type: 'application/pdf' });
  formData.append('file', blob, filename);
  formData.append('purpose', 'assistants'); // Required: purpose for file upload

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    await response.text(); // Consume response body
    logError('OpenAI file upload failed', new Error('Upload failed'), {
      httpStatus: response.status,
      action: 'openai_file_upload',
    });
    throw new Error(`OpenAI file upload failed: ${response.status}`);
  }

  const result = await response.json();
  return result.id; // Returns file_id like "file-abc123"
}

/**
 * Extract courses from PDF using OpenAI Assistants API with file search
 * Docs: https://platform.openai.com/docs/assistants/tools/file-search
 */
export async function extractCoursesWithOpenAI(
  fileId: string
): Promise<ParsedCourse[]> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2', // Required for Assistants API
  };

  const systemPrompt = `You are a transcript parser. Extract each completed or in-progress course from the transcript PDF. For each course, extract: term (e.g., 'Fall 2024'), subject (e.g., 'CS'), number (e.g., '142'), title, credits (decimal), grade (letter or null), and confidence 0–1. Return ONLY a valid JSON array with this exact structure: [{"term":"Fall 2024","subject":"CS","number":"142","title":"Intro to Programming","credits":3,"grade":"A","confidence":0.95}]. Use null for missing fields. Ignore duplicates and administrative lines.`;

  // 1. Create Assistant with file_search tool
  const assistantResponse = await fetch('https://platform.openai.com/v1/assistants', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: systemPrompt,
      tools: [{ type: 'file_search' }],
    }),
  });

  if (!assistantResponse.ok) {
    await assistantResponse.text(); // Consume response body
    logError('OpenAI assistant creation failed', new Error('Assistant creation failed'), {
      httpStatus: assistantResponse.status,
      action: 'openai_create_assistant',
    });
    throw new Error(`Failed to create assistant: ${assistantResponse.status}`);
  }

  const assistant = await assistantResponse.json();
  const assistantId = assistant.id;

  try {
    // 2. Create Thread with attached file
    const threadResponse = await fetch('https://platform.openai.com/v1/threads', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Extract all courses from the attached transcript PDF and return as JSON array.',
            attachments: [
              {
                file_id: fileId,
                tools: [{ type: 'file_search' }],
              },
            ],
          },
        ],
      }),
    });

    if (!threadResponse.ok) {
      await threadResponse.text(); // Consume response body
      logError('OpenAI thread creation failed', new Error('Thread creation failed'), {
        httpStatus: threadResponse.status,
        action: 'openai_create_thread',
      });
      throw new Error(`Failed to create thread: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;

    // 3. Run Assistant
    const runResponse = await fetch(`https://platform.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runResponse.ok) {
      await runResponse.text(); // Consume response body
      logError('OpenAI run creation failed', new Error('Run creation failed'), {
        httpStatus: runResponse.status,
        action: 'openai_create_run',
      });
      throw new Error(`Failed to create run: ${runResponse.status}`);
    }

    const run = await runResponse.json();
    const runId = run.id;

    // 4. Poll for completion (max 60 seconds)
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const statusResponse = await fetch(`https://platform.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers,
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status');
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run did not complete. Status: ${runStatus}`);
    }

    // 5. Get messages
    const messagesResponse = await fetch(`https://platform.openai.com/v1/threads/${threadId}/messages`, {
      headers,
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to retrieve messages');
    }

    const messages: OpenAIMessagesResponse = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: OpenAIMessage) => msg.role === 'assistant');

    if (!assistantMessage || !assistantMessage.content || !assistantMessage.content[0]) {
      throw new Error('No assistant response found');
    }

    const content = assistantMessage.content[0].text.value;

    // Parse JSON from response
    let parsed: ParsedCourse[];
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // CRITICAL: Do NOT log 'content' - it contains PII from transcript (student names, grades, courses)
      logError('Failed to parse OpenAI JSON response', e, {
        action: 'openai_parse_json',
      });
      throw new Error('Failed to parse OpenAI JSON response');
    }

    return parsed;
  } finally {
    // Cleanup: Delete assistant
    await fetch(`https://platform.openai.com/v1/assistants/${assistantId}`, {
      method: 'DELETE',
      headers,
    }).catch(err => logError('Failed to delete OpenAI assistant', err, {
      action: 'openai_delete_assistant',
    }));
  }
}
