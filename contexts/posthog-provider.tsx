'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import posthog from 'posthog-js';

interface PostHogContextType {
  posthog: typeof posthog | null;
  isReady: boolean;
  identifyUser: (userId: string, properties?: Record<string, unknown>) => void;
  captureEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  resetUser: () => void;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

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

      // Session recording configuration
      session_recording: {
        // FERPA: Mask all text inputs by default
        maskAllInputs: true,
        maskTextSelector: '*', // Mask all text content
        recordCrossOriginIframes: false, // Don't record iframes
      },

      // Privacy settings
      opt_out_capturing_by_default: false,
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

  const identifyUser = useCallback((userId: string, properties?: Record<string, unknown>) => {
    if (!isReady || !mounted) return;

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
  }, [isReady, mounted]);

  const captureEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (!isReady || !mounted) return;

    // FERPA COMPLIANCE: Filter out any PII from properties
    const safeProperties = sanitizeEventProperties(properties);
    posthog.capture(eventName, safeProperties);
  }, [isReady, mounted]);

  const resetUser = useCallback(() => {
    if (!isReady || !mounted) return;
    posthog.reset();
  }, [isReady, mounted]);

  const value: PostHogContextType = {
    posthog: mounted && isReady ? posthog : null,
    isReady,
    identifyUser,
    captureEvent,
    resetUser,
  };

  return (
    <PostHogContext.Provider value={value}>
      {children}
    </PostHogContext.Provider>
  );
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
    'action',
    'category',
    'label',
    'value',
    'duration',
    'count',
    'success',
    'error_type',
    'error_code',
    'http_status',
    'page_path',
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
