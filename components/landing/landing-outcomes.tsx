import { landingOutcomes, landingPageBg } from "./landing-data"

export type LandingOutcomesProps = {
  outcomes?: string[]
  pageBg?: string
}

export function LandingOutcomes({
  outcomes = landingOutcomes,
  pageBg = landingPageBg,
}: LandingOutcomesProps) {
  return (
    <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
      <div className="container mx-auto max-w-6xl px-4 md:px-8">
        <div className="space-y-12 text-center">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-foreground px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
                Outcomes that matter
              </span>
            </div>
            <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">What we help you measure</h3>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              stu. gives leaders the visibility they need to prove impact and improve student success.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {outcomes.map((outcome) => (
              <div key={outcome} className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
                <p className="font-semibold text-foreground">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
