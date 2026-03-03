'use client'

import { usePostHog } from '@/contexts/posthog-provider'

const LANDING_ORIGIN = process.env.NEXT_PUBLIC_LANDING_ORIGIN || 'https://stuplanning.com'

export function CookieConsentBanner() {
  const { analyticsConsent, setAnalyticsConsent } = usePostHog()

  if (analyticsConsent !== 'unknown') {
    return null
  }

  const submitConsent = async (consent: 'granted' | 'denied') => {
    setAnalyticsConsent(consent)

    try {
      await fetch('/api/identity/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent,
          path: window.location.pathname,
        }),
        keepalive: true,
      })
    } catch (error) {
      console.error('Failed to persist consent preference', error)
    }
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[70] rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur md:inset-x-auto md:right-6 md:max-w-md">
      <p className="font-body text-sm text-foreground">
        We use necessary cookies for secure sign-in and optional analytics cookies to improve stu.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        You can change this later in settings. See our{' '}
        <a
          className="underline underline-offset-2"
          href={`${LANDING_ORIGIN}/privacy-policy`}
        >
          Privacy Policy
        </a>
        .
      </p>
      <div className="mt-4 flex gap-2">
        <button
          className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
          onClick={() => void submitConsent('denied')}
          type="button"
        >
          Necessary Only
        </button>
        <button
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          onClick={() => void submitConsent('granted')}
          type="button"
        >
          Accept Analytics
        </button>
      </div>
    </div>
  )
}
