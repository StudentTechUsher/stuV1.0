import { NextRequest, NextResponse } from 'next/server';
import { seedAll, listAdvisorWeeklyWithdrawals, getAdvisors } from '@/lib/mocks/withdrawalSeed';
    // Check if advisor exists
    const advisors = getAdvisors();
    const advisor = advisors.find(a => a.id === advisorId);

    if (!advisor) {
      return NextResponse.json({ error: 'Advisor not found' }, { status: 404 });
    }

    // Get withdrawal data from mock
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

    const result = {
      rows,
      summary: {
        total: rows.length,
        byCollege,
        byDepartment,
        byMajor,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
