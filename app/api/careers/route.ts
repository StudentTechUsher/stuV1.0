import { NextRequest, NextResponse } from 'next/server';
import { fetchCareers, CareerFetchError } from '@/lib/services/careerService';
import { logError } from '@/lib/logger';

/**
 * GET /api/careers?search=...
 * Returns all published careers or filters by search query
 * AUTHORIZATION: PUBLIC
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const searchQuery = searchParams.get('search') || undefined;

    const careers = await fetchCareers(searchQuery);

    return NextResponse.json({ careers });
  } catch (error) {
    if (error instanceof CareerFetchError) {
      logError('Failed to fetch careers', error, {
        action: 'fetch_careers',
      });
      return NextResponse.json(
        { error: 'Failed to fetch careers' },
        { status: 500 }
      );
    }

    logError('Unexpected error fetching careers', error, {
      action: 'fetch_careers',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
