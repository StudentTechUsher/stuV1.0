'use client';

import { useCallback } from 'react';
import { usePostHog } from '@/contexts/posthog-provider';
import { ANALYTICS_EVENTS, type AnalyticsEvent } from '@/lib/services/analyticsService';

interface EventProperties {
  [key: string]: unknown;
}

/**
 * Hook for tracking analytics events from client components
 * Automatically uses PostHog when available
 */
export function useAnalytics() {
  const { captureEvent, isReady } = usePostHog();

  const track = useCallback((eventName: AnalyticsEvent | string, properties?: EventProperties) => {
    if (!isReady) return;
    captureEvent(eventName, properties);
  }, [captureEvent, isReady]);

  const trackPageView = useCallback((path: string, properties?: EventProperties) => {
    if (!isReady) return;
    captureEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      page_path: path,
      ...properties,
    });
  }, [captureEvent, isReady]);

  const trackError = useCallback((errorType: string, errorCode?: string, properties?: EventProperties) => {
    if (!isReady) return;
    captureEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error_type: errorType,
      error_code: errorCode,
      ...properties,
    });
  }, [captureEvent, isReady]);

  return {
    track,
    trackPageView,
    trackError,
    isReady,
  };
}
