import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { landingPillars, landingPageBg } from "./landing-data"
import type { LandingPillar } from "./landing-data"

export type LandingPlatformOverviewProps = {
  pillars?: LandingPillar[]
  pageBg?: string
  ctaHref?: string
  onCtaClick?: (source: string) => void
}

export function LandingPlatformOverview({
  pillars = landingPillars,
  pageBg = landingPageBg,
  ctaHref = "/demo",
  onCtaClick,
}: LandingPlatformOverviewProps) {
  return (
    <section className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden border-b border-border/60 py-18 md:py-30 bg-white">
      <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Platform
            </span>
          </div>
          <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
            Built to improve completion—at institutional scale.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            stu. turns complex requirements and real-life constraints into guided plans students can follow, advisors
            can trust, and leaders can govern.
          </p>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.header}
              className="flex flex-col gap-4 rounded-2xl border-2 border-border/60 bg-background p-8 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="text-base md:text-lg font-semibold text-primary uppercase">{pillar.header}</div>
              <ul className="space-y-3 text-base md:text-lg text-foreground">
                {pillar.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                onClick={() => onCtaClick?.(`pillar_${pillar.header.toLowerCase()}`)}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline inline-flex items-center gap-2 mt-2"
              >
                Learn about {pillar.linkText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
