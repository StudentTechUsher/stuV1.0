export const ANON_ID_COOKIE_NAME = 'stu_anon_id'
export const ANALYTICS_CONSENT_COOKIE_NAME = 'stu_analytics_consent'

export const ANON_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2 // 2 years
export const ANALYTICS_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

export type AnalyticsConsent = 'granted' | 'denied'
export type AnalyticsConsentState = AnalyticsConsent | 'unknown'
