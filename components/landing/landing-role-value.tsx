import { landingRoleCards, landingPageBg } from "./landing-data"
import type { LandingRoleCard } from "./landing-data"

export type LandingRoleValueProps = {
  roles?: LandingRoleCard[]
  pageBg?: string
}

export function LandingRoleValue({
  roles = landingRoleCards,
  pageBg = landingPageBg,
}: LandingRoleValueProps) {
  return (
    <section
      className="border-b border-border/60 py-18 md:py-30"
      id="solutions"
      style={{ backgroundColor: pageBg }}
    >
      <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Why stu.
            </span>
          </div>
          <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
            Imagine a campus where every student&apos;s pathway is clear.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mx-auto max-w-3xl">
            stu. reduces cognitive load for students, gives advisors time back, and gives leaders visibility into
            progress and demand.
          </p>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.title}
              className="flex flex-col gap-3 rounded-2xl border-2 border-border/60 bg-background p-8 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="text-base md:text-lg font-semibold text-primary">{role.title}</div>
              <p className="text-base md:text-lg text-foreground leading-relaxed">{role.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
