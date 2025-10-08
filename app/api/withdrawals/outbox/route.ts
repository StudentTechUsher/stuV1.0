/**
 * Assumptions:
 * - App Router API route
 * - Query param: advisorId
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDigests } from '@/lib/mocks/outbox';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const advisorId = searchParams.get('advisorId');

  if (!advisorId) {
    return NextResponse.json(
      { error: 'Missing required param: advisorId' },
      { status: 400 }
    );
  }

  const digests = getDigests(advisorId);

  return NextResponse.json({
    digests,
  });
}
