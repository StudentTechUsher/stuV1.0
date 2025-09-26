// Centralized environment helpers
// NOTE: Do NOT rely solely on NEXT_PUBLIC_ENV in production security logic.

export const APP_ENV = process.env.NEXT_PUBLIC_ENV || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev')
export const isDev = APP_ENV === 'dev'
export const isProd = APP_ENV === 'prod'

// Convenience wrapper for conditional dev-only code blocks
export function ifDev<T>(val: T, fallback: T | null = null) {
  return isDev ? val : fallback
}
