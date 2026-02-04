import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { landingFaqs, landingPageBg } from "./landing-data"
import type { LandingFaq } from "./landing-data"

export type LandingFaqProps = {
  faqs?: LandingFaq[]
  pageBg?: string
  ctaHref?: string
  ctaLabel?: string
  onCtaClick?: (source: string) => void
  email?: string
}

export function LandingFaq({
  faqs = landingFaqs,
  pageBg = landingPageBg,
  ctaHref = "/demo",
  ctaLabel = "Request a demo",
  onCtaClick,
  email = "hello@stuplanning.com",
}: LandingFaqProps) {
  return (
    <section className="border-b border-border/60 py-18 md:py-30 bg-white" id="faq">
      <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
        <div className="space-y-4 md:w-2/3">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              FAQ
            </span>
          </div>
          <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
            Answers for evaluation and procurement.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Short, direct responses to common questions from academic and IT leaders.
          </p>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border-2 border-border/60 bg-background p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-lg font-semibold text-foreground">{item.q}</p>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Link href={ctaHref} onClick={() => onCtaClick?.("faq")}>
            <Button size="lg" className="rounded-full px-8 py-6 text-lg">
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link
            href={`mailto:${email}`}
            className="text-base font-semibold text-primary underline-offset-4 hover:underline"
          >
            Prefer email? {email}
          </Link>
        </div>
      </div>
    </section>
  )
}
