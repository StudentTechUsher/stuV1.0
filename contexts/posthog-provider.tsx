'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import posthog from 'posthog-js';
import type { AnalyticsConsent, AnalyticsConsentState } from '@/lib/identity/constants';
import { readAnalyticsConsentFromDocument, writeAnalyticsConsentCookie } from '@/lib/identity/consent';

interface PostHogContextType {
  posthog: typeof posthog | null;
  isReady: boolean;
  analyticsConsent: AnalyticsConsentState;
  identifyUser: (userId: string, properties?: Record<string, unknown>) => void;
  captureEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  setAnalyticsConsent: (consent: AnalyticsConsent) => void;
  resetUser: () => void;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [analyticsConsent, setAnalyticsConsentState] = useState<AnalyticsConsentState>('unknown');

  useEffect(() => {
    setMounted(true);
    setAnalyticsConsentState(readAnalyticsConsentFromDocument());

    // Initialize PostHog only on client side
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (!posthogKey) {
      console.warn('PostHog key not configured - analytics disabled');
      return;
    }

    // Check if already initialized
    if (posthog.__loaded) {
      setIsReady(true);
      return;
    }

    // Initialize PostHog with FERPA-compliant settings
    posthog.init(posthogKey, {
      api_host: posthogHost,

      // FERPA COMPLIANCE: Disable automatic capture of sensitive data
      autocapture: false, // Manually control what events are captured
      capture_pageview: true, // Safe - just URLs
      capture_pageleave: true, // Safe - timing data

      // Session recording configuration - ALWAYS ON with smart PII masking
      session_recording: {
        // FERPA: Mask all input fields (text, email, password, etc.)
        maskAllInputs: true,

        // SMART PII MASKING: Mask specific elements containing student data
        // This allows UI text, buttons, and labels to be visible in recordings
        // while protecting FERPA-regulated information
        maskTextSelector: [
          // Student personally identifiable information
          '.student-name',
          '.student-email',
          '.student-id',
          '.student-phone',

          // Academic records
          '.course-grade',
          '.gpa-value',
          '.transcript-data',

          // Any element explicitly marked for masking
          '[data-ph-mask]',
          '.ph-mask',
          '.pii-data',
        ].join(', '),

        // Don't record iframes (may contain external content)
        recordCrossOriginIframes: false,

        // Additional privacy settings
        maskTextFn: (text) => {
          // Mask any text that looks like an email address
          if (/\S+@\S+\.\S+/.test(text)) {
            return '***@***.***';
          }
          return text;
        },
      },

      // Privacy settings
      opt_out_capturing_by_default: true,
      respect_dnt: true, // Respect Do Not Track browser setting

      // Performance
      loaded: (ph) => {
        console.log('PostHog initialized successfully');
        setIsReady(true);

        // Set super properties (sent with every event)
        ph.register({
          environment: process.env.NEXT_PUBLIC_ENV || 'production',
        });
      },

      // Disable features that could capture PII
      disable_session_recording: false, // Enable but with masking
      disable_surveys: true, // Surveys might collect PII
    });

    return () => {
      // Cleanup on unmount
      if (posthog.__loaded) {
        posthog.reset();
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted || !isReady) return;
    applyConsentToPostHog(analyticsConsent);
  }, [mounted, isReady, analyticsConsent]);

  const identifyUser = useCallback((userId: string, properties?: Record<string, unknown>) => {
    if (!isReady || !mounted || analyticsConsent !== 'granted') return;

    // FERPA COMPLIANCE: Only send non-PII user properties
    const safeProperties: Record<string, unknown> = {
      user_id: userId,
      // Only include safe, non-PII properties
      ...(properties && {
        university_id: properties.university_id,
        role: properties.role, // e.g., 'student', 'advisor', 'admin'
        year_in_school: properties.year_in_school,
        major_id: properties.major_id, // ID, not name
        created_at: properties.created_at,
      }),
    };

    posthog.identify(userId, safeProperties);
  }, [isReady, mounted, analyticsConsent]);

  const captureEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (!isReady || !mounted || analyticsConsent !== 'granted') return;

    // FERPA COMPLIANCE: Filter out any PII from properties
    const safeProperties = sanitizeEventProperties(properties);
    posthog.capture(eventName, safeProperties);
    persistAnonymousEvent(eventName, safeProperties);
  }, [isReady, mounted, analyticsConsent]);

  const setAnalyticsConsent = useCallback((consent: AnalyticsConsent) => {
    writeAnalyticsConsentCookie(consent);
    setAnalyticsConsentState(consent);
    if (isReady && mounted) {
      applyConsentToPostHog(consent);
    }
  }, [isReady, mounted]);

  const resetUser = useCallback(() => {
    if (!isReady || !mounted) return;
    posthog.reset();
  }, [isReady, mounted]);

  const value: PostHogContextType = {
    posthog: mounted && isReady ? posthog : null,
    isReady,
    analyticsConsent,
    identifyUser,
    captureEvent,
    setAnalyticsConsent,
    resetUser,
  };

  return (
    <PostHogContext.Provider value={value}>
      {children}
    </PostHogContext.Provider>
  );
}

function applyConsentToPostHog(consent: AnalyticsConsentState): void {
  if (!posthog.__loaded) {
    return;
  }

  if (consent === 'granted') {
    posthog.opt_in_capturing();
    return;
  }

  posthog.opt_out_capturing();
}

function persistAnonymousEvent(
  eventName: string,
  eventProperties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') {
    return
  }

  void fetch('/api/identity/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName,
      properties: eventProperties ?? {},
      path: window.location.pathname,
    }),
    keepalive: true,
  }).catch((error) => {
    console.warn('Failed to persist anonymous analytics event', error)
  })
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (context === undefined) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context;
}

/**
 * FERPA COMPLIANCE: Sanitize event properties to remove PII
 * Only allow safe property types: IDs, counts, booleans, dates
 */
function sanitizeEventProperties(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!properties) return undefined;

  const safe: Record<string, unknown> = {};
  const allowedKeys = [
    // Core
    'action',
    'category',
    'label',
    'value',
    'duration',
    'count',
    'success',
    'page_path',

    // Marketing / conversion (non-PII)
    'cta_source',
    'cta_location',
    'cta_label',
    'cta_href',
    'cta_target',
    'form_id',

    // Campaign attribution (non-PII)
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',

    // Errors
    'error_type',
    'error_code',
    'http_status',

    // Domain-safe IDs
    'university_id',
    'program_id',
    'course_id',
    'semester',
    'year',
    'tab_index',
    'button_clicked',
    'feature_flag',
    'runtime',
  ];

  for (const key of allowedKeys) {
    if (key in properties) {
      safe[key] = properties[key];
    }
  }

  return Object.keys(safe).length > 0 ? safe : undefined;
}
