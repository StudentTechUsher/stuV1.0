import { NextRequest, NextResponse } from 'next/server';
import { listAdvisorWeeklyWithdrawals, seedAll } from '@/lib/mocks/withdrawalSeed';

/**
 * GET /api/withdrawals/weekly?advisorId=...&start=...&end=...
 * Fetches weekly withdrawals for an advisor within a date range (using mock data)
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

    // Ensure mock data is seeded
    seedAll();

    // Get withdrawal rows from mock data
    const rows = listAdvisorWeeklyWithdrawals(advisorId, start, end);

    // Calculate summary statistics
    const byCollege: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    const byMajor: Record<string, number> = {};

    rows.forEach((row) => {
      const collegeId = row.student.collegeId || 'unknown';
      const departmentId = row.student.departmentId || 'unknown';
      const majorId = row.student.majorId || 'unknown';

      byCollege[collegeId] = (byCollege[collegeId] || 0) + 1;
      byDepartment[departmentId] = (byDepartment[departmentId] || 0) + 1;
      byMajor[majorId] = (byMajor[majorId] || 0) + 1;
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
  } catch (error) {
    console.error('Error fetching weekly withdrawals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
