import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { landingPageBg } from "./landing-data"

export type LandingSuccessStoriesProps = {
  pageBg?: string
  ctaHref?: string
  ctaLabel?: string
  onCtaClick?: (source: string) => void
}

export function LandingSuccessStories({
  pageBg = landingPageBg,
  ctaHref = "/demo",
  ctaLabel = "Request a demo",
  onCtaClick,
}: LandingSuccessStoriesProps) {
  return (
    <section className="border-b border-border/60 py-18 md:py-30 bg-white" id="case-studies">
      <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-foreground px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
                Success Stories
              </span>
            </div>
            <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
              Outcomes institutions can stand behind.
            </h3>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Retention, time-to-degree, and advising efficiency—measured and reported with clarity.
            </p>
          </div>
          <Link href={ctaHref} onClick={() => onCtaClick?.("case_studies")}>
            <Button size="lg" className="rounded-full px-8 py-6 text-lg whitespace-nowrap">
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="space-y-6">
          <p className="text-center text-muted-foreground">
            Our customers report measurable improvements in retention, time-to-degree, and advising efficiency.
            Request a demo to see case studies and ROI data relevant to your institution.
          </p>
        </div>
      </div>
    </section>
  )
}
