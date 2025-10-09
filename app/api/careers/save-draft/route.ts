import { NextRequest, NextResponse } from 'next/server';
import { saveCareerDraft, CareerSaveError } from '@/lib/services/careerService';
import { logError } from '@/lib/logger';
import type { Career } from '@/types/career';

/**
 * POST /api/careers/save-draft
 * Saves a career as a draft
 * AUTHORIZATION: ADVISORS AND ABOVE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const career: Career = body.career;

    if (!career || !career.id) {
      return NextResponse.json(
        { error: 'Invalid career data' },
        { status: 400 }
      );
    }

    const saved = await saveCareerDraft(career);

    return NextResponse.json({ career: saved });
  } catch (error) {
    if (error instanceof CareerSaveError) {
      logError('Failed to save career draft', error, {
        action: 'save_career_draft',
      });
      return NextResponse.json(
        { error: 'Failed to save draft' },
        { status: 500 }
      );
    }

    logError('Unexpected error saving career draft', error, {
      action: 'save_career_draft',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
