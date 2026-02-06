import { landingReasons, landingPageBg } from "./landing-data"
import type { LandingReasonCard } from "./landing-data"

export type LandingReasonsProps = {
  items?: LandingReasonCard[]
  pageBg?: string
}

export function LandingReasons({
  items = landingReasons,
  pageBg = landingPageBg,
}: LandingReasonsProps) {
  return (
    <section className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden border-b border-border/60 py-18 md:py-30 bg-white">
      <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Why schools choose stu.
            </span>
          </div>
          <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
            Built for higher ed institutions.
          </h2>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-sm"
            >
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
