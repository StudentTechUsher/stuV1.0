/**
 * GET /api/gpa/context
 * Fetches GPA calculator context for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { logError } from '@/lib/logger';
import {
  getGpaCalculatorContext,
  NoTranscriptError,
  GPACalculationError,
} from '@/lib/services/gpaService';

/**
 * Get GPA calculator context
 * Includes current GPA, completed credits, and remaining courses
 */
async function handleGetContext(_request: NextRequest) {
  try {
    // Create server-side Supabase client with user's session from cookies
    const supabase = await createServerSupabase();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch GPA context
    const context = await getGpaCalculatorContext(supabase, user.id);

    return NextResponse.json(context);
  } catch (error) {
    if (error instanceof NoTranscriptError) {
      // Redirect to transcript sync
      return NextResponse.json(
        { error: 'No transcript synced', redirect: '/dashboard/academic-history' },
        { status: 302 }
      );
    }

    if (error instanceof GPACalculationError) {
      logError('GPA context calculation error', error, {
        action: 'get_gpa_context_api',
      });
      return NextResponse.json(
        { error: 'Failed to calculate GPA context' },
        { status: 500 }
      );
    }

    logError('Unexpected error in GET /api/gpa/context', error, {
      action: 'get_gpa_context_api',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleGetContext(request);
}
