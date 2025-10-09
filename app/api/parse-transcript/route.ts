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

    // 🔹 Call your FastAPI worker
    const workerResponse = await fetch(`${WORKER_URL}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: 'transcripts',
        path,
        user_id: targetUserId,
      }),
    });

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
