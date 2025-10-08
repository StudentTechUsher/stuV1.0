/**
 * Assumptions:
 * - POST /api/careers/save-draft saves a career as draft
 * - Returns the updated career
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveCareerDraft } from '@/lib/mocks/careers.seed';
import type { Career } from '@/types/career';

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

    const saved = saveCareerDraft(career);

    return NextResponse.json({ career: saved });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save draft', details: String(error) },
      { status: 500 }
    );
  }
}
