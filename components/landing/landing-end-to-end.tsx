import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { landingPageBg } from "./landing-data"

export type LandingEndToEndProps = {
  pageBg?: string
  ctaHref?: string
  ctaLabel?: string
  onCtaClick?: (source: string) => void
}

export function LandingEndToEnd({
  pageBg = landingPageBg,
  ctaHref = "/demo",
  ctaLabel = "Request a demo",
  onCtaClick,
}: LandingEndToEndProps) {
  return (
    <section
      className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden border-b border-border/60 py-16 md:py-20"
      style={{ backgroundColor: pageBg }}
    >
      <div className="container mx-auto max-w-4xl space-y-6 px-4 text-center md:px-8">
        <div className="inline-flex rounded-full bg-foreground px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
            End-to-end
          </span>
        </div>
        <h3 className="font-header text-[clamp(1.2rem,3.5vw,4.5rem)] font-bold tracking-tight text-center mx-auto">
          Clarity works best when everything connects.
        </h3>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          stu. unifies planning, audit alignment, and schedules so policy, demand, and student goals stay in sync.
        </p>
        <div className="flex justify-center pt-2">
          <Link href={ctaHref} onClick={() => onCtaClick?.("works_together")}>
            <Button size="lg" className="rounded-full px-8 py-6 text-lg">
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
