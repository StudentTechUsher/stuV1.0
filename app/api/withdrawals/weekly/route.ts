/**
 * Assumptions:
 * - App Router API route
 * - Query params: advisorId, start, end
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedAll, listAdvisorWeeklyWithdrawals } from '@/lib/mocks/withdrawalSeed';
import type { WithdrawalRow } from '@/types/withdrawals';

export async function GET(request: NextRequest) {
  seedAll();

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

  const rows = listAdvisorWeeklyWithdrawals(advisorId, start, end);

  // Calculate summary
  const byCollege: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byMajor: Record<string, number> = {};

  rows.forEach((row: WithdrawalRow) => {
    byCollege[row.student.collegeId] = (byCollege[row.student.collegeId] || 0) + 1;
    byDepartment[row.student.departmentId] =
      (byDepartment[row.student.departmentId] || 0) + 1;
    byMajor[row.student.majorId] = (byMajor[row.student.majorId] || 0) + 1;
  });

  return NextResponse.json({
    rows,
    summary: {
      total: rows.length,
      byCollege,
      byDepartment,
      byMajor,
    },
  });
}
