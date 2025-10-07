'use client';

import * as React from 'react';
import type { ProgramProgressPayload } from '@/types/program-progress';

interface UseProgramProgressOptions {
  studentId?: string;
  planId?: string;
  // In production, this would be an API endpoint
  fetchFn?: () => Promise<ProgramProgressPayload>;
  // Enable mock data for development
  useMockData?: boolean;
}

interface UseProgramProgressReturn {
  data: ProgramProgressPayload | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing program progress data
 *
 * In production, this would fetch from an API endpoint.
 * For development/demo, it can use mock data.
 */
export function useProgramProgress({
  studentId,
  planId,
  fetchFn,
  useMockData = false,
}: UseProgramProgressOptions = {}): UseProgramProgressReturn {
  const [data, setData] = React.useState<ProgramProgressPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (useMockData) {
        // Dynamically import mock data for development
        const { mockProgramProgress, mockFetchDelay } = await import('@/lib/mocks/programProgress');
        await mockFetchDelay(800);
        setData(mockProgramProgress);
      } else if (fetchFn) {
        // Use custom fetch function if provided
        const result = await fetchFn();
        setData(result);
      } else if (studentId) {
        // Production API call would go here
        // For now, throw error to indicate API not implemented
        throw new Error('API endpoint not yet implemented. Use useMockData flag for development.');
      } else {
        throw new Error('Either studentId or useMockData flag must be provided');
      }
    } catch (err) {
      console.error('Error fetching program progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load program progress');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, planId, fetchFn, useMockData]);

  // Fetch data on mount and when dependencies change
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for managing optimistic updates for advisor actions
 */
export function useOptimisticProgressUpdate(
  data: ProgramProgressPayload | null
): [
  ProgramProgressPayload | null,
  (updater: (current: ProgramProgressPayload) => ProgramProgressPayload) => void
] {
  const [optimisticData, setOptimisticData] = React.useState<ProgramProgressPayload | null>(data);

  React.useEffect(() => {
    setOptimisticData(data);
  }, [data]);

  const updateOptimistically = React.useCallback(
    (updater: (current: ProgramProgressPayload) => ProgramProgressPayload) => {
      if (optimisticData) {
        setOptimisticData(updater(optimisticData));
      }
    },
    [optimisticData]
  );

  return [optimisticData, updateOptimistically];
}
