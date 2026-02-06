import { landingInstitutionTypes, landingPageBg } from "./landing-data"
import type { LandingInstitutionType } from "./landing-data"

export type LandingInstitutionTypesProps = {
  types?: LandingInstitutionType[]
  pageBg?: string
}

export function LandingInstitutionTypes({
  types = landingInstitutionTypes,
  pageBg = landingPageBg,
}: LandingInstitutionTypesProps) {
  return (
    <section className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden border-b border-border/60 py-18 md:py-24 bg-white">
      <div className="container mx-auto max-w-6xl space-y-10 md:space-y-12 px-4 md:px-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Built for every campus type
            </span>
          </div>
          <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
            Designed for complexity—across every campus type.
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            stu. adapts to your programs, policies, and transfer reality—without adding complexity for students or
            staff.
          </p>
        </div>
        <div className="grid gap-3 md:gap-4 md:grid-cols-5">
          {types.map((type) => (
            <button
              key={type.label}
              className="rounded-xl border border-border/60 bg-white px-4 py-5 text-center text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all space-y-2"
            >
              <div className="flex justify-center">
                <type.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-base font-semibold">{type.label}</div>
              <div className="text-xs text-muted-foreground">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
