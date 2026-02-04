import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import {
  landingSecurityBadges,
  landingSecurityHighlights,
  landingPageBg,
} from "./landing-data"
import type { LandingSecurityBadge } from "./landing-data"

export type LandingSecurityPrivacyProps = {
  badges?: LandingSecurityBadge[]
  highlights?: string[]
  pageBg?: string
  ctaHref?: string
  onCtaClick?: (source: string) => void
}

export function LandingSecurityPrivacy({
  badges = landingSecurityBadges,
  highlights = landingSecurityHighlights,
  pageBg = landingPageBg,
  ctaHref = "/security",
  onCtaClick,
}: LandingSecurityPrivacyProps) {
  return (
    <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
      <div className="container mx-auto max-w-6xl space-y-10 md:space-y-12 px-4 md:px-8">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Security & Privacy
            </span>
          </div>
          <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Trust and governance built in.</h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Role-based access, least-privilege data flows, and auditability—designed for institutional confidence.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2"
              >
                <badge.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{badge.label}</span>
              </div>
            ))}
          </div>
          <Link
            href={ctaHref}
            onClick={() => onCtaClick?.("security")}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline inline-flex items-center gap-2 pt-2"
          >
            View Trust Center
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          {highlights.map((item) => (
            <div key={item} className="rounded-xl border-2 border-border/60 bg-background p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-base md:text-lg text-foreground font-medium">{item}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
