'use client';

import { useEffect, useState } from 'react';
import { usePostHog } from '@/contexts/posthog-provider';

/**
 * Hook to check PostHog feature flags
 * @param flagKey - The feature flag key from PostHog
 * @param defaultValue - Default value if flag is not loaded
 * @returns Current flag value
 */
export function usePostHogFeatureFlag(flagKey: string, defaultValue = false): boolean {
  const { posthog, isReady } = usePostHog();
  const [flagValue, setFlagValue] = useState(defaultValue);

  useEffect(() => {
    if (!isReady || !posthog) {
      setFlagValue(defaultValue);
      return;
    }

    // Get initial flag value
    const value = posthog.isFeatureEnabled(flagKey);
    setFlagValue(value ?? defaultValue);

    // Listen for flag changes
    const unsubscribe = posthog.onFeatureFlags(() => {
      const newValue = posthog.isFeatureEnabled(flagKey);
      setFlagValue(newValue ?? defaultValue);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [posthog, isReady, flagKey, defaultValue]);

  return flagValue;
}

/**
 * Hook to get feature flag variant (for multivariate flags)
 * @param flagKey - The feature flag key from PostHog
 * @returns Variant string or null
 */
export function usePostHogFeatureFlagVariant(flagKey: string): string | null {
  const { posthog, isReady } = usePostHog();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !posthog) {
      setVariant(null);
      return;
    }

    // Get initial variant
    const value = posthog.getFeatureFlagPayload(flagKey);
    setVariant(typeof value === 'string' ? value : null);

    // Listen for flag changes
    const unsubscribe = posthog.onFeatureFlags(() => {
      const newValue = posthog.getFeatureFlagPayload(flagKey);
      setVariant(typeof newValue === 'string' ? newValue : null);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [posthog, isReady, flagKey]);

  return variant;
}
