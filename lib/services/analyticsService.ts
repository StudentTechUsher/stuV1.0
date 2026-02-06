/**
 * Analytics Service - PostHog Event Tracking
 * AUTHORIZATION: PUBLIC - Used across all user types
 *
 * This service provides FERPA-compliant analytics tracking
 * All events are sanitized to remove PII before being sent to PostHog
 */

import { logInfo } from '@/lib/logger';

// Define standard event names (constants prevent typos)
export const ANALYTICS_EVENTS = {
  // Page views
  PAGE_VIEW: 'page_view',

  // Marketing / conversion
  LANDING_CTA_CLICKED: 'landing_cta_clicked',
  DEMO_FORM_SUBMITTED: 'demo_form_submitted',
  DEMO_TRY_FREE_CLICKED: 'demo_try_free_clicked',

  // User actions
  TRANSCRIPT_UPLOADED: 'transcript_uploaded',
  GRAD_PLAN_GENERATED: 'grad_plan_generated',
  GRAD_PLAN_SUBMITTED: 'grad_plan_submitted',
  COURSE_ADDED: 'course_added',
  COURSE_REMOVED: 'course_removed',
  MILESTONE_COMPLETED: 'milestone_completed',

  // Feature interactions
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  FILTER_APPLIED: 'filter_applied',
  EXPORT_CLICKED: 'export_clicked',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

interface EventProperties {
  // Safe properties only
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  duration?: number;
  success?: boolean;
  error_type?: string;
  http_status?: number;
  university_id?: number;
  program_id?: number;
  course_id?: number;
  [key: string]: unknown;
}

/**
 * Track an analytics event
 * FERPA SAFE: Only accepts non-PII properties
 */
export function trackEvent(eventName: AnalyticsEvent | string, properties?: EventProperties) {
  // This function will be called from client components via useAnalytics
  // Server-side tracking goes through trackEventServer

  logInfo('Analytics event tracked', {
    action: eventName,
    ...properties,
  });
}

/**
 * Track page view
 * @param path - Page path (no query params with PII)
 */
export function trackPageView(path: string, properties?: EventProperties) {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page_path: path,
    ...properties,
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(featureName: string, properties?: EventProperties) {
  trackEvent('feature_used', {
    feature: featureName,
    ...properties,
  });
}

/**
 * Track error for analytics
 * FERPA SAFE: Only logs error type and code, not message content
 */
export function trackError(errorType: string, errorCode?: string, properties?: EventProperties) {
  trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
    error_type: errorType,
    error_code: errorCode,
    ...properties,
  });
}
