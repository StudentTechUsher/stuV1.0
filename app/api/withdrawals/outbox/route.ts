import { NextRequest, NextResponse } from 'next/server';
import {
  fetchWithdrawalOutbox,
  WithdrawalFetchError,
} from '@/lib/services/withdrawalService';
import { logError } from '@/lib/logger';

/**
 * GET /api/withdrawals/outbox?advisorId=...
 * Fetches pending withdrawal notifications for an advisor
 * AUTHORIZATION: ADVISORS ONLY
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const advisorId = searchParams.get('advisorId');

    if (!advisorId) {
      return NextResponse.json(
        { error: 'Missing required param: advisorId' },
        { status: 400 }
      );
    }

    const digests = await fetchWithdrawalOutbox(advisorId);

    return NextResponse.json({ digests });
  } catch (error) {
    if (error instanceof WithdrawalFetchError) {
      logError('Failed to fetch withdrawal outbox', error, {
        action: 'fetch_withdrawal_outbox',
      });
      return NextResponse.json(
        { error: 'Failed to fetch outbox' },
        { status: 500 }
      );
    }

    logError('Unexpected error fetching outbox', error, {
      action: 'fetch_withdrawal_outbox',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
