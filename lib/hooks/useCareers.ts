/**
 * Assumptions:
 * - Simple fetch-based hooks for PoC
 * - TODO: Replace with SWR or React Query for better caching
 */

import { useState, useEffect, useCallback } from 'react';
import type { Career } from '@/types/career';

interface UseCareerResult {
  data?: Career;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
}

interface UseCareerSearchResult {
  data: Career[];
  isLoading: boolean;
  error?: Error;
}

export function useCareer(slug: string): UseCareerResult {
  const [data, setData] = useState<Career | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => {
    setTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchCareer() {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch(`/api/careers/${slug}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (!cancelled) {
          setData(json.career);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCareer();

    return () => {
      cancelled = true;
    };
  }, [slug, trigger]);

  return { data, isLoading, error, refetch };
}

export function useCareerSearch(query: string): UseCareerSearchResult {
  const [data, setData] = useState<Career[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function fetchCareers() {
      setIsLoading(true);
      setError(undefined);

      try {
        const params = new URLSearchParams();
        if (query) {
          params.set('search', query);
        }

        const response = await fetch(`/api/careers?${params}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        if (!cancelled) {
          setData(json.careers || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCareers();

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { data, isLoading, error };
}

export async function saveCareerDraft(career: Career): Promise<Career> {
  const response = await fetch('/api/careers/save-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ career }),
  });

  if (!response.ok) {
    throw new Error('Failed to save draft');
  }

  const json = await response.json();
  return json.career;
}

export async function publishCareer(id: string): Promise<Career> {
  const response = await fetch('/api/careers/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });

  if (!response.ok) {
    throw new Error('Failed to publish career');
  }

  const json = await response.json();
  return json.career;
}
