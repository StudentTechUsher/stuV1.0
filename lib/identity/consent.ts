import {
  ANALYTICS_CONSENT_COOKIE_NAME,
  ANALYTICS_CONSENT_MAX_AGE_SECONDS,
  type AnalyticsConsent,
  type AnalyticsConsentState,
} from './constants'

function parseCookieString(cookieString: string): Record<string, string> {
  return cookieString
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex === -1) {
        return accumulator
      }

      const key = decodeURIComponent(entry.slice(0, separatorIndex).trim())
      const value = decodeURIComponent(entry.slice(separatorIndex + 1).trim())
      accumulator[key] = value
      return accumulator
    }, {})
}

export function parseAnalyticsConsentValue(value: string | null | undefined): AnalyticsConsentState {
  if (value === 'granted' || value === 'denied') {
    return value
  }
  return 'unknown'
}

export function readAnalyticsConsentFromDocument(): AnalyticsConsentState {
  if (typeof document === 'undefined') {
    return 'unknown'
  }
  const cookies = parseCookieString(document.cookie || '')
  return parseAnalyticsConsentValue(cookies[ANALYTICS_CONSENT_COOKIE_NAME])
}

export function writeAnalyticsConsentCookie(consent: AnalyticsConsent): void {
  if (typeof document === 'undefined') {
    return
  }

  const cookieParts = [
    `${ANALYTICS_CONSENT_COOKIE_NAME}=${consent}`,
    'Path=/',
    `Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ]

  if (window.location.protocol === 'https:') {
    cookieParts.push('Secure')
  }

  document.cookie = cookieParts.join('; ')
}
