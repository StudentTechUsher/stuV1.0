/**
 * Assumptions:
 * - App Router API route
 * - Body params: startISO, endISO
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyDigest } from '@/lib/jobs/withdrawalDigest';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startISO, endISO } = body;

    if (!startISO || !endISO) {
      return NextResponse.json(
        { error: 'Missing required params: startISO, endISO' },
        { status: 400 }
      );
    }

    const digests = await runWeeklyDigest(startISO, endISO);

    return NextResponse.json({
      success: true,
      digestsGenerated: digests.length,
      message: `Generated ${digests.length} advisor digest(s)`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to run weekly job', details: String(error) },
      { status: 500 }
    );
  }
}
