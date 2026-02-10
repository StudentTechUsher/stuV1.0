/**
 * STU Landing Page - PUBLISHABLE VERSION
 *
 * This version has all placeholder sections removed and contains ONLY
 * real, defensible content. Safe to publish immediately.
 *
 * CURRENT STATUS: Live on production
 * ACCESSIBLE AT: / (root)
 *
 * DIFFERENCES FROM TEMPLATE:
 * - No university logo grid placeholders
 * - No product visual mockup
 * - No TODO comments
 * - All remaining content is real and verified
 * - Emojis replaced with Lucide icons
 *
 * TO SWITCH TO TEMPLATE VERSION:
 * Update app/page.tsx to import from './unified-landing-client' instead of
 * './unified-landing-client-publishable'
 */

"use client"

import { useLayoutEffect, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import {
  LandingDemoFormValues,
  LandingEndToEnd,
  LandingFaq,
  LandingFinalCta,
  LandingFooter,
  LandingHeader,
  LandingHero,
  LandingImplementation,
  LandingInstitutionTypes,
  LandingOutcomes,
  LandingPlatformOverview,
  LandingProblem,
  LandingReasons,
  LandingRoleValue,
  LandingSecurityPrivacy,
  LandingSuccessStories,
  landingPageBg,
} from "@/components/landing"
import { ServicesSection } from "@/components/landing/services-section"
import { useAnalytics } from "@/lib/hooks/useAnalytics"
import { ANALYTICS_EVENTS } from "@/lib/services/analyticsService"

type TrackingPayload = Record<string, string | number | undefined>

function trackEvent(name: string, payload: TrackingPayload = {}) {
  if (typeof window === "undefined") return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracker = (window as any)
  tracker.dataLayer?.push({ event: name, ...payload })
  tracker.gtag?.("event", name, payload)
  tracker.analytics?.track?.(name, payload)
  // Fallback console to ensure we can verify during QA
  console.log(`[track] ${name}`, payload)
}

export function UnifiedLandingClient() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { track, isReady } = useAnalytics()

  const utmProperties = useMemo(() => {
    const utm_source = searchParams.get("utm_source") || undefined
    const utm_medium = searchParams.get("utm_medium") || undefined
    const utm_campaign = searchParams.get("utm_campaign") || undefined
    const utm_content = searchParams.get("utm_content") || undefined
    const utm_term = searchParams.get("utm_term") || undefined

    return {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    }
  }, [searchParams])

  useLayoutEffect(() => {
    const htmlElement = document.documentElement
    htmlElement.style.scrollBehavior = "smooth"
    return () => {
      htmlElement.style.scrollBehavior = ""
    }
  }, [])

  const handleCtaClick = (source: string) => {
    trackEvent("cta_click", { source })
    if (isReady) {
      track(ANALYTICS_EVENTS.LANDING_CTA_CLICKED, {
        page_path: pathname,
        cta_source: source,
        ...utmProperties,
      })
    }
  }

  const handleFormSubmit = (values: LandingDemoFormValues) => {
    trackEvent("demo_form_submit", {
      source: "final_cta",
      name: values.name,
      email: values.email,
      role: values.role,
      institution: values.institution,
    })
  }

  return (
    <div
      className="flex min-h-screen flex-col text-foreground"
      style={{ backgroundColor: landingPageBg }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-zinc-900 focus:px-4 focus:py-2 focus:rounded-md focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <LandingHeader onCtaClick={handleCtaClick} />

      <main id="main-content" className="flex-1">
        <LandingHero onCtaClick={handleCtaClick} />
        <LandingProblem />
        <LandingReasons />
        <LandingRoleValue />
        <LandingPlatformOverview onCtaClick={handleCtaClick} />
        <ServicesSection />
        <LandingEndToEnd onCtaClick={handleCtaClick} />
        <LandingSuccessStories onCtaClick={handleCtaClick} />
        <LandingInstitutionTypes />
        <LandingImplementation />
        <LandingSecurityPrivacy onCtaClick={handleCtaClick} />
        <LandingOutcomes />
        <LandingFaq onCtaClick={handleCtaClick} />
        <LandingFinalCta onCtaClick={handleCtaClick} onSubmit={handleFormSubmit} />
      </main>

      <LandingFooter />
    </div>
  )
}
