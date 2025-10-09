import { NextRequest, NextResponse } from 'next/server';
import {
  runWeeklyWithdrawalDigest,
  WithdrawalFetchError,
} from '@/lib/services/withdrawalService';
import { logError, logInfo } from '@/lib/logger';

/**
 * POST /api/withdrawals/run-weekly-job
 * Triggers the weekly withdrawal digest job
 * AUTHORIZATION: SYSTEM/CRON ONLY
 */
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

    const result = await runWeeklyWithdrawalDigest();

    logInfo('Weekly withdrawal digest completed', {
      action: 'weekly_withdrawal_digest',
      startDate: startISO,
      endDate: endISO,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof WithdrawalFetchError) {
      logError('Failed to run weekly withdrawal digest', error, {
        action: 'run_weekly_digest',
      });
      return NextResponse.json(
        { error: 'Failed to run weekly job' },
        { status: 500 }
      );
    }

    logError('Unexpected error running weekly digest', error, {
      action: 'run_weekly_digest',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
