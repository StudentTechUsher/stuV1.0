import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAdvisorWeeklyWithdrawals,
  WithdrawalFetchError,
  AdvisorNotFoundError,
} from '@/lib/services/withdrawalService';
import { logError } from '@/lib/logger';

/**
 * GET /api/withdrawals/weekly?advisorId=...&start=...&end=...
 * Fetches weekly withdrawals for an advisor within a date range
 * AUTHORIZATION: ADVISORS ONLY
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const advisorId = searchParams.get('advisorId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!advisorId || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required params: advisorId, start, end' },
        { status: 400 }
      );
    }

    const result = await fetchAdvisorWeeklyWithdrawals(advisorId, start, end);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdvisorNotFoundError) {
      return NextResponse.json({ error: 'Advisor not found' }, { status: 404 });
    }

    if (error instanceof WithdrawalFetchError) {
      logError('Failed to fetch weekly withdrawals', error, {
        action: 'fetch_weekly_withdrawals',
      });
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      );
    }

    logError('Unexpected error fetching withdrawals', error, {
      action: 'fetch_weekly_withdrawals',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
