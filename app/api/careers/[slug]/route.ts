import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCareerBySlug,
  CareerNotFoundError,
  CareerFetchError,
} from '@/lib/services/careerService';
import { logError } from '@/lib/logger';

/**
 * GET /api/careers/[slug]
 * Returns a single career by slug
 * AUTHORIZATION: PUBLIC
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const career = await fetchCareerBySlug(params.slug);
    return NextResponse.json({ career });
  } catch (error) {
    if (error instanceof CareerNotFoundError) {
      return NextResponse.json({ error: 'Career not found' }, { status: 404 });
    }

    if (error instanceof CareerFetchError) {
      logError('Failed to fetch career by slug', error, {
        action: 'fetch_career_by_slug',
      });
      return NextResponse.json(
        { error: 'Failed to fetch career' },
        { status: 500 }
      );
    }

    logError('Unexpected error fetching career', error, {
      action: 'fetch_career_by_slug',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
