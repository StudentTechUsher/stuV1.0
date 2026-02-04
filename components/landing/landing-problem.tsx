import { CheckCircle2 } from "lucide-react"
import { landingPainPoints, landingPageBg } from "./landing-data"

export type LandingProblemProps = {
  painPoints?: string[]
  pageBg?: string
}

export function LandingProblem({
  painPoints = landingPainPoints,
  pageBg = landingPageBg,
}: LandingProblemProps) {
  return (
    <section className="border-b border-border/60 bg-muted/30 py-18 md:py-30" id="product">
      <div className="container mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-foreground px-4 py-2">
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: pageBg }}
              >
                The problem
              </span>
            </div>
            <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
              Academic planning is complex, fragmented, and hard to govern.
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Institutions juggle disconnected tools, uneven processes, and policies that are difficult to apply
              consistently across programs.
            </p>
          </div>
          <div className="grid gap-3 rounded-xl border-2 border-border/60 bg-background p-6 shadow-sm">
            {painPoints.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm text-foreground">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
