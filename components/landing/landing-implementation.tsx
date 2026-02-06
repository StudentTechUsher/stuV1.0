import { CheckCircle2 } from "lucide-react"
import { landingImplementationSteps, landingPageBg } from "./landing-data"
import type { LandingImplementationStep } from "./landing-data"

export type LandingImplementationProps = {
  steps?: LandingImplementationStep[]
  pageBg?: string
}

export function LandingImplementation({
  steps = landingImplementationSteps,
  pageBg = landingPageBg,
}: LandingImplementationProps) {
  return (
    <section
      className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden border-b border-border/60 py-18 md:py-30"
      style={{ backgroundColor: pageBg }}
    >
      <div className="container mx-auto max-w-6xl grid gap-12 md:gap-16 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="space-y-6">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Implementation
            </span>
          </div>
          <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">From pilot to impact in weeks.</h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            A phased rollout, clear data requirements, and a success team that keeps implementation calm and
            predictable.
          </p>
          <ul className="space-y-4 text-base md:text-lg text-foreground">
            {steps.map((step) => (
              <li key={step.title} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                <span>
                  <strong>{step.title}</strong> {step.copy}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
