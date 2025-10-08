/**
 * Assumptions:
 * - Processes all advisors and groups withdrawals by their scope
 * - Stores results in outbox for later retrieval
 */

import type { Advisor, WithdrawalRow } from '@/types/withdrawals';
import {
  seedAll,
  getAdvisors,
  listAdvisorWeeklyWithdrawals,
} from '@/lib/mocks/withdrawalSeed';
import { storeDigest } from '@/lib/mocks/outbox';

export interface AdvisorDigest {
  advisor: Advisor;
  window: {
    startISO: string;
    endISO: string;
  };
  totals: {
    count: number;
    majors: Record<string, number>;
    departments: Record<string, number>;
    colleges: Record<string, number>;
  };
  rows: WithdrawalRow[];
}

export async function runWeeklyDigest(
  startISO: string,
  endISO: string
): Promise<AdvisorDigest[]> {
  seedAll();

  const advisors = getAdvisors();
  const digests: AdvisorDigest[] = [];

  for (const advisor of advisors) {
    const rows = listAdvisorWeeklyWithdrawals(advisor.id, startISO, endISO);

    // Calculate totals
    const majors: Record<string, number> = {};
    const departments: Record<string, number> = {};
    const colleges: Record<string, number> = {};

    rows.forEach((row) => {
      majors[row.student.majorId] = (majors[row.student.majorId] || 0) + 1;
      departments[row.student.departmentId] =
        (departments[row.student.departmentId] || 0) + 1;
      colleges[row.student.collegeId] = (colleges[row.student.collegeId] || 0) + 1;
    });

    const digest: AdvisorDigest = {
      advisor,
      window: { startISO, endISO },
      totals: {
        count: rows.length,
        majors,
        departments,
        colleges,
      },
      rows,
    };

    digests.push(digest);
    storeDigest(advisor.id, digest);
  }

  return digests;
}
