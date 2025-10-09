import { NextRequest, NextResponse } from 'next/server';
import {
  publishCareer,
  CareerNotFoundError,
  CareerSaveError,
} from '@/lib/services/careerService';
import { logError } from '@/lib/logger';

/**
 * POST /api/careers/publish
 * Publishes a draft career (makes it publicly visible)
 * AUTHORIZATION: ADVISORS AND ABOVE
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json({ error: 'Missing career slug' }, { status: 400 });
    }

    const published = await publishCareer(slug);

    return NextResponse.json({ career: published });
  } catch (error) {
    if (error instanceof CareerNotFoundError) {
      return NextResponse.json({ error: 'Career not found' }, { status: 404 });
    }

    if (error instanceof CareerSaveError) {
      logError('Failed to publish career', error, {
        action: 'publish_career',
      });
      return NextResponse.json(
        { error: 'Failed to publish career' },
        { status: 500 }
      );
    }

    logError('Unexpected error publishing career', error, {
      action: 'publish_career',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
