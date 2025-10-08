/**
 * Assumptions:
 * - Uses native fetch with SWR-like pattern (for simplicity)
 * - Returns data, loading state, error, and refetch function
 */

import { useState, useEffect, useCallback } from 'react';
import type { WithdrawalRow } from '@/types/withdrawals';

interface Summary {
  total: number;
  byCollege: Record<string, number>;
  byDepartment: Record<string, number>;
  byMajor: Record<string, number>;
}

interface WeeklyWithdrawalsData {
  rows: WithdrawalRow[];
  summary: Summary;
}

interface UseWeeklyWithdrawalsResult {
  data: WeeklyWithdrawalsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWeeklyWithdrawals(
  advisorId: string,
  startISO: string,
  endISO: string
): UseWeeklyWithdrawalsResult {
  const [data, setData] = useState<WeeklyWithdrawalsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => {
    setTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          advisorId,
          start: startISO,
          end: endISO,
        });

        const response = await fetch(`/api/withdrawals/weekly?${params}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [advisorId, startISO, endISO, trigger]);

  return { data, isLoading, error, refetch };
}
