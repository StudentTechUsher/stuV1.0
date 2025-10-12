/**
 * API endpoint to trigger transcript parsing for any logged-in user.
 * Automatically builds the correct file path based on user UUID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';

// Fallback to localhost if not set
const WORKER_URL = process.env.TRANSCRIPT_PARSER_URL || 'http://localhost:8787';

interface ParseRequest {
  path: string; // uploaded file name (e.g. "1759292125898_Record_Summary.pdf")
  userId?: string;
}

/**
 * Handles fetch errors and returns appropriate error responses
 */
function handleFetchError(fetchError: unknown): NextResponse {
  if (!(fetchError instanceof Error)) {
    return NextResponse.json(
      {
        error: 'Failed to connect to transcript parser',
        details: 'Unknown connection error',
      },
      { status: 503 }
    );
  }

  const errorMessage = fetchError.message.toLowerCase();

  if (errorMessage.includes('econnrefused') || errorMessage.includes('fetch failed')) {
    console.error('❌ Transcript parser service is not running');
    return NextResponse.json(
      {
        error: 'Transcript parsing service unavailable',
        details: 'The transcript parser service is currently not running. Please ensure the FastAPI worker is started.',
        suggestion: 'Start the parser: cd transcript-parser && uvicorn app.main:app --reload --port 8787',
      },
      { status: 503 }
    );
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    console.error('❌ Transcript parser service timed out');
    return NextResponse.json(
      {
        error: 'Transcript parsing timed out',
        details: 'The transcript parser took too long to respond. The file may be too large or the service may be overloaded.',
        suggestion: 'Try again with a smaller file or wait a moment and retry.',
      },
      { status: 504 }
    );
  }

  console.error('❌ Worker fetch error:', fetchError);
  return NextResponse.json(
    {
      error: 'Failed to connect to transcript parser',
      details: fetchError.message,
    },
    { status: 503 }
  );
}

/**
 * Calls the FastAPI worker to parse the transcript
 */
async function callWorkerService(path: string, userId: string): Promise<Response> {
  return fetch(`${WORKER_URL}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket: 'transcripts',
      path,
      user_id: userId,
    }),
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseRequest = await request.json();
    let { path } = body;
    const { userId } = body;

    if (!path) {
      return NextResponse.json(
        { error: 'Missing required field: path' },
        { status: 400 }
      );
    }

    // 🔹 Get authenticated user from Supabase
    const supabase = await createSupabaseServerComponentClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const targetUserId = userId || user.id;

    // 🔹 Ensure path includes the user folder prefix
    // Example: "1759292125898_Record_Summary.pdf" → "<uuid>/1759292125898_Record_Summary.pdf"
    if (!path.startsWith(targetUserId)) {
      path = `${targetUserId}/${path}`;
    }

    console.log('🧠 Parsing transcript for user:', targetUserId);
    console.log('📄 Full file path:', path);
    console.log('🔗 Worker URL:', WORKER_URL);

    // 🔹 Call your FastAPI worker with timeout
    let workerResponse: Response;
    try {
      workerResponse = await callWorkerService(path, targetUserId);
    } catch (fetchError) {
      return handleFetchError(fetchError);
    }

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error('Worker service error:', errorText);
      return NextResponse.json(
        { error: 'Failed to parse transcript', details: errorText },
        { status: workerResponse.status }
      );
    }

    const parseReport = await workerResponse.json();

    return NextResponse.json({
      success: true,
      report: parseReport,
    });
  } catch (error) {
    console.error('❌ Parse transcript error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
