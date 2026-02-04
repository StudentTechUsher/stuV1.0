import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { landingPageBg } from "./landing-data"

export type LandingHeroProps = {
  pageBg?: string
  titleLines?: string[]
  subtitle?: string
  ctaHref?: string
  ctaLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  onCtaClick?: (source: string) => void
}

export function LandingHero({
  pageBg = landingPageBg,
  titleLines = ["Clearer paths to graduation.", "For every student."],
  subtitle =
    "Launch in weeks. Integrate with Banner, DegreeWorks, Course, and more. Prove ROI within a semester, without the enterprise price tag.",
  ctaHref = "/demo",
  ctaLabel = "Request a demo",
  secondaryHref = "#product",
  secondaryLabel = "See how it works",
  onCtaClick,
}: LandingHeroProps) {
  return (
    <section
      className="border-b border-border/60 py-18 md:py-30"
      style={{ backgroundColor: pageBg }}
    >
      <div className="container mx-auto max-w-5xl px-4 md:px-10">
        <div className="flex min-h-[85vh] flex-col items-center text-center space-y-8">
          <div className="space-y-6 pt-8 md:pt-12">
            <h1 className="font-header text-[clamp(2.5rem,5.5vw,6.5rem)] font-bold leading-tight tracking-tight text-foreground">
              {titleLines.map((line) => (
                <span key={line} className="block whitespace-nowrap">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:text-xl leading-relaxed">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
            <Link href={ctaHref} onClick={() => onCtaClick?.("hero")} className="w-7/12">
              <Button className="w-full rounded-full px-16 md:px-28 py-7 text-[1.5rem] md:text-[1.75rem] font-semibold leading-tight tracking-tight">
                {ctaLabel}
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
            <Link
              href={secondaryHref}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline flex items-center gap-1"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
