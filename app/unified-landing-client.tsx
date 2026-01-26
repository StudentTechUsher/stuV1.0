"use client"

import { useLayoutEffect, useState, FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CheckCircle2,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react"

type TrackingPayload = Record<string, string | number | undefined>

const pageBg = "#f7f3ec"

const painPoints = [
  "Fragmented systems between SIS, degree audit, and scheduling slow decisions.",
  "Transfer credit rules are opaque—students and advisors spend hours reconciling requirements.",
  "Course bottlenecks and limited seats delay graduation and drive excess credits.",
  "Advising teams are stretched; guidance varies by advisor and program.",
  "Leaders lack clear visibility into pathways, demand, and risk cohorts.",
]

function trackEvent(name: string, payload: TrackingPayload = {}) {
  if (typeof window === "undefined") return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracker = (window as any)
  tracker.dataLayer?.push({ event: name, ...payload })
  tracker.gtag?.("event", name, payload)
  tracker.analytics?.track?.(name, payload)
  // Fallback console to ensure we can verify during QA
  // eslint-disable-next-line no-console
  console.log(`[track] ${name}`, payload)
}

const navLinks = [
  { href: "#product", label: "Platform" },
  { href: "#solutions", label: "Solutions" },
  { href: "#case-studies", label: "Customers" },
]

const faqs = [
  {
    q: "How long does implementation take?",
    a: "Typical institutions launch an initial cohort in weeks. Timeline depends on SIS/degree audit connections and data readiness.",
  },
  {
    q: "What data do you need?",
    a: "Degree requirements, course catalog, historical schedules, and SIS access (read) to build and validate plans.",
  },
  {
    q: "How is pricing structured?",
    a: "Aligned to ROI and scale. We scope by enrolled students/advising footprint to keep it budget-friendly.",
  },
  {
    q: "Do you integrate with our SIS?",
    a: "We support common SIS vendors and can pair via secure exports if direct APIs are not available.",
  },
  {
    q: "What about security and compliance?",
    a: "SSO, role-based access, audit logging, and least-privilege data flows. Security details available on request.",
  },
  {
    q: "Do you provide training and support?",
    a: "Yes. We onboard advisors/admins with live sessions, playbooks, and ongoing success check-ins.",
  },
  {
    q: "Can students self-serve?",
    a: "Yes—students get a guided experience while advisors can adjust, approve, and lock plans.",
  },
  {
    q: "How do you handle accessibility?",
    a: "We build to WCAG standards and test for keyboard and screen reader support.",
  },
]

export function UnifiedLandingClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formStatus, setFormStatus] = useState<"idle" | "submitted">("idle")

  useLayoutEffect(() => {
    const htmlElement = document.documentElement
    htmlElement.style.scrollBehavior = "smooth"
    return () => {
      htmlElement.style.scrollBehavior = ""
    }
  }, [])

  const handleCtaClick = (source: string) => {
    trackEvent("cta_click", { source })
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    trackEvent("demo_form_submit", {
      source: "final_cta",
      name: formData.get("name")?.toString(),
      email: formData.get("email")?.toString(),
      role: formData.get("role")?.toString(),
      institution: formData.get("institution")?.toString(),
    })
    setFormStatus("submitted")
    event.currentTarget.reset()
  }

  return (
    <div
      className="flex min-h-screen flex-col text-foreground"
      style={{ backgroundColor: pageBg }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-zinc-900 focus:px-4 focus:py-2 focus:rounded-md focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header
        className="sticky top-0 z-30 border-b-2 border-border/60 backdrop-blur-md"
        style={{ backgroundColor: pageBg }}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-12">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight text-3xl">
            <Image
              src="/favicon-96x96.png"
              alt="stu. logo"
              width={56}
              height={56}
              className="rounded-md"
              priority
            />
            <span>stu.</span>
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-semibold text-foreground/70 hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/demo" onClick={() => handleCtaClick("header")}>
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg font-semibold leading-tight tracking-tight bg-foreground hover:bg-foreground/90"
                style={{ color: pageBg }}
              >
                Request a Demo
              </Button>
            </Link>
          </div>

          <button
            className="rounded-md p-2 text-foreground lg:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t-2 border-border/60 bg-white lg:hidden">
            <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:px-8">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-primary/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/demo" onClick={() => { setMobileMenuOpen(false); handleCtaClick("mobile_header") }}>
                <Button className="w-full rounded-full px-6 py-3 text-base">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section
            className="border-b border-border/60 py-18 md:py-30"
            style={{ backgroundColor: pageBg }}
          >
          <div className="container mx-auto max-w-5xl px-4 md:px-10">
            <div className="flex min-h-[85vh] flex-col items-center text-center space-y-8">
              <div className="space-y-6 pt-8 md:pt-12">
                <h1 className="font-header text-[clamp(2.5rem,5.5vw,6.5rem)] font-bold leading-tight tracking-tight text-foreground max-w-4xl mx-auto">
                  <span className="block">One system for every</span>
                  <span className="block">academic pathway.</span>
                </h1>
                <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:text-xl leading-relaxed line-clamp-2">
                  Unify degree requirements, transfer rules, and schedules. Students graduate faster. Advisors work smarter. Leaders have clarity.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
                <Link href="/demo" onClick={() => handleCtaClick("hero")} className="w-7/12">
                  <Button
                    className="w-full rounded-full px-16 md:px-28 py-7 text-[1.5rem] md:text-[1.75rem] font-semibold leading-tight tracking-tight"
                  >
                    Request a Demo
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
                <Link
                  href="#product"
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline flex items-center gap-1"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2A. Trust Logo Grid */}
        <section className="border-b border-border/60 bg-white py-12 md:py-16">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="space-y-8">
              <div className="space-y-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trusted by leading universities</p>
                <p className="text-sm text-muted-foreground">Universities across the US trust STU to streamline academic planning</p>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6">
                {/* TODO: Replace these 15 placeholder slots with actual university logos */}
                {/* Priority institutions to add: large public, small private, community college, R1 research, international if possible */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="w-full aspect-[3/2] rounded-lg border border-border/40 bg-gradient-to-br from-white to-muted/20 flex items-center justify-center hover:shadow-sm transition-shadow">
                    <div className="text-center space-y-1">
                      <span className="block text-xs text-muted-foreground font-medium">University</span>
                      <span className="block text-xs text-muted-foreground/60">{i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2B. Metrics Bar */}
        <section className="border-b border-border/60 py-10 md:py-12" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-bold text-primary mb-2">{/* TODO: 1M+ */}XX</p>
                <p className="text-sm text-muted-foreground">Students guided by STU</p>
              </div>
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-bold text-primary mb-2">{/* TODO: XX% */}XX%</p>
                <p className="text-sm text-muted-foreground">Advising time saved</p>
              </div>
              <div className="text-center">
                <p className="text-5xl md:text-6xl font-bold text-primary mb-2">{/* TODO: XX% */}XX%</p>
                <p className="text-sm text-muted-foreground">Faster time-to-degree</p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-border/60 bg-muted/30 py-18 md:py-30" id="product">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">The problem</p>
                <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                  Academic planning is fragmented, manual, and hard to govern.
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Provosts, registrars, and CIOs juggle disconnected tools, late data, and policies that are difficult to enforce consistently.
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

        {/* Role-based value */}
        <section
          className="border-b border-border/60 py-18 md:py-30"
          id="solutions"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why STU</p>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                Imagine a university where every pathway is clear.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mx-auto max-w-3xl">
                Tailored outcomes for every leader who owns student success, policy, and systems.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-3">
              {[
                { title: "For Provost & Student Success", copy: "Reduce time-to-degree and lift retention with governed, consistent pathways across every program." },
                { title: "For Registrar & Academic Affairs", copy: "Codify policies once. Keep degree audits, substitutions, and transfer rules aligned without manual rework." },
                { title: "For CIO & IT", copy: "Secure, low-friction integrations with SIS and identity. Clear data boundaries and admin controls." },
              ].map((role) => (
                <div key={role.title} className="flex flex-col gap-3 rounded-2xl border-2 border-border/60 bg-background p-8 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="text-base md:text-lg font-semibold text-primary">{role.title}</div>
                  <p className="text-base md:text-lg text-foreground leading-relaxed">{role.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform overview */}
        <section
          className="border-b border-border/60 py-18 md:py-30 bg-white"
        >
          <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Platform</p>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                One system. Three pillars that cover the journey.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Progress, Care, Explore—purpose-built for student pathways and institutional control.</p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-3">
              {[
                { header: "Progress", items: ["Planner & pathways", "Degree audit alignment", "Policy-aware schedules"] },
                { header: "Care", items: ["Risk alerts & reporting", "Advisor notes & actions", "Appointments in context"] },
                { header: "Explore", items: ["Major/what-if compare", "Transfer rule visibility", "Prospective pathways"] },
              ].map((pillar) => (
                <div key={pillar.header} className="flex flex-col gap-4 rounded-2xl border-2 border-border/60 bg-background p-8 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="text-base md:text-lg font-semibold text-primary uppercase">{pillar.header}</div>
                  <ul className="space-y-3 text-base md:text-lg text-foreground">
                    {pillar.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/demo" onClick={() => handleCtaClick(`pillar_${pillar.header.toLowerCase()}`)} className="text-sm font-semibold text-primary underline-offset-4 hover:underline inline-flex items-center gap-2 mt-2">
                    Learn about {pillar.header.toLowerCase()}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product visual */}
        <section className="border-b border-border/60 py-16 md:py-24" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-8 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Product overview</p>
              <h3 className="font-header text-[clamp(1.5rem,4vw,4.5rem)] font-bold tracking-tight mx-auto">One system. Three unified experiences.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">Students see their personalized path. Advisors get contextual insights. Administrators maintain institutional control—all in one integrated platform.</p>
            </div>
            {/* TODO: Replace entire preview area with actual dashboard screenshot or interactive demo */}
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-white to-muted/10 shadow-xl">
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3 text-sm text-muted-foreground bg-white/70 backdrop-blur-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-foreground font-medium text-xs">Dashboard • Students & Advisors</span>
              </div>
              <div className="flex min-h-[480px] items-center justify-center bg-gradient-to-b from-white to-muted/20 p-6 md:p-12">
                <div className="w-full max-w-5xl space-y-4">
                  <div className="rounded-2xl border border-border/40 bg-white p-6 md:p-8 shadow-lg space-y-6">
                    {/* Dashboard mockup sections */}
                    <div className="space-y-4">
                      <div className="h-8 w-48 rounded bg-muted/40" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="rounded-lg border border-border/40 p-4 bg-gradient-to-br from-primary/5 to-transparent">
                            <div className="h-4 w-20 rounded bg-muted/40 mb-2" />
                            <div className="h-3 w-32 rounded bg-muted/30" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-px bg-border/40" />
                    <div className="space-y-4">
                      <div className="h-6 w-40 rounded bg-muted/40" />
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-3 rounded bg-muted/30" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Professional dashboard placeholder • Replace with real product screenshot or video walkthrough
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Works best together */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-4xl space-y-6 px-4 text-center md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">End-to-end</p>
            <h3 className="font-header text-[clamp(1.2rem,3.5vw,4.5rem)] font-bold tracking-tight whitespace-nowrap text-center">Like your institution, STU works best together.</h3>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Replace fragmented planning, audit, and scheduling workflows with one system that keeps policy, demand, and student goals aligned.
            </p>
            <div className="flex justify-center pt-2">
              <Link href="/demo" onClick={() => handleCtaClick("works_together")}>
                <Button size="lg" className="rounded-full px-8 py-6 text-lg">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Success stories */}
        <section
          className="border-b border-border/60 py-18 md:py-30 bg-white"
          id="case-studies"
        >
          <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Success Stories</p>
                <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Real results from universities like yours.</h3>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Measurable outcomes that drive retention, graduation rates, and advising efficiency.</p>
              </div>
              <Link href="/demo" onClick={() => handleCtaClick("case_studies")}>
                <Button size="lg" className="rounded-full px-8 py-6 text-lg whitespace-nowrap">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Reduced time-to-degree across all programs",
                  metric: "14%",
                  metricLabel: "faster graduation",
                  quote: "STU eliminated the guesswork in pathway planning and accelerated our time-to-degree metrics.",
                  institution: "Research University",
                  type: "R1 Research"
                },
                {
                  title: "Scaled advising capacity without hiring",
                  metric: "32%",
                  metricLabel: "more students advised",
                  quote: "Advisors regained 5 hours/week. We're serving more students with the same team.",
                  institution: "State University",
                  type: "Large Public"
                },
                {
                  title: "Aligned transfer credit policies institution-wide",
                  metric: "100%",
                  metricLabel: "policy adherence",
                  quote: "Degree requirements are now consistent across all transfer pathways and credit evaluations.",
                  institution: "Community College System",
                  type: "Community College"
                },
              ].map((study) => (
                <div key={study.title} className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-white to-muted/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* TODO: Replace gradient background with actual institution campus image */}
                  <div className="w-full h-48 bg-gradient-to-br from-primary/30 via-primary/20 to-muted/30 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/5" />
                    <div className="relative flex flex-col items-center justify-center space-y-2">
                      <div className="text-5xl md:text-6xl font-bold text-primary/80">{study.metric}</div>
                      <span className="text-sm font-semibold text-foreground/80">{study.metricLabel}</span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground leading-snug">{study.title}</p>
                      <p className="text-xs text-muted-foreground mt-2">{study.type}</p>
                    </div>
                    <p className="text-base text-foreground leading-relaxed italic">"{study.quote}"</p>
                    {/* TODO: Replace with actual name and title of person quoted */}
                    <div className="pt-2 border-t border-border/40">
                      <p className="text-sm font-semibold text-foreground">{study.institution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Institution types */}
        <section className="border-b border-border/60 py-18 md:py-24 bg-white">
          <div className="container mx-auto max-w-6xl space-y-10 md:space-y-12 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Built for every campus type</p>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">STU works at scale and complexity.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">From large research universities to community colleges, Stu adapts to your institution's unique structure and policies.</p>
            </div>
            <div className="grid gap-3 md:gap-4 md:grid-cols-5">
              {[
                { icon: "🏛️", label: "Large Public", desc: "Multi-college systems" },
                { icon: "🎓", label: "Small Private", desc: "Boutique institutions" },
                { icon: "🏫", label: "Community College", desc: "Open access/transfer" },
                { icon: "🔬", label: "R1 Research", desc: "Complex requirements" },
                { icon: "🌍", label: "International", desc: "Global programs" }
              ].map((type) => (
                <button key={type.label} className="rounded-xl border border-border/60 bg-white px-4 py-5 text-center text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all space-y-2">
                  <div className="text-2xl">{type.icon}</div>
                  <div className="text-base font-semibold">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.desc}</div>
                </button>
              ))}
            </div>
            {/* TODO: Replace with real testimonial from specific institution type - include name, title, institution */}
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/8 to-white p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center text-lg">👤</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Testimonial</p>
                  <p className="text-xs text-muted-foreground">Institution type • Region</p>
                </div>
              </div>
              <p className="text-lg text-foreground leading-relaxed italic">"STU streamlined pathways across all our colleges. Implementation was smooth, and adoption has been faster than we expected."</p>
            </div>
          </div>
        </section>

        {/* Implementation */}
        <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl grid gap-12 md:gap-16 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Implementation</p>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">From launch to impact in weeks.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Dedicated success team, clear SIS integration path, and a phased rollout designed for your campus.</p>
              <ul className="space-y-4 text-base md:text-lg text-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                  <span><strong>Week 1:</strong> SIS/identity integration with least-privilege access.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                  <span><strong>Week 2-3:</strong> Map degree rules; validate against live data.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                  <span><strong>Week 4+:</strong> Pilot with advisors; scale across programs.</span>
                </li>
              </ul>
            </div>
            {/* TODO: Replace with real customer testimonial about implementation experience */}
            <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center text-lg flex-shrink-0">🎓</div>
                <p className="text-sm font-semibold text-primary">Implementation success</p>
              </div>
              <p className="text-lg text-foreground leading-relaxed italic">"Stu kept us policy-aligned from day one. Advisors trusted the plans; IT had confidence in our data flows."</p>
              <div className="pt-3 border-t border-border/40">
                <p className="text-sm font-semibold text-foreground">Title, Name</p>
                <p className="text-xs text-muted-foreground">University Name, Region</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & privacy */}
        <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-10 md:space-y-12 px-4 md:px-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Security & Privacy</p>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Enterprise-ready controls.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">SSO, least-privilege access, and auditability for every role.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2">
                  <span className="text-lg">🔒</span>
                  <span className="text-sm font-semibold">SOC 2 Type II</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2">
                  <span className="text-lg">🛡️</span>
                  <span className="text-sm font-semibold">FERPA Compliant</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2">
                  <span className="text-lg">♿</span>
                  <span className="text-sm font-semibold">WCAG 2.1 AA</span>
                </div>
              </div>
              <Link href="/security" className="text-sm font-semibold text-primary underline-offset-4 hover:underline inline-flex items-center gap-2 pt-2">
                View Trust Center
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-2">
              {[
                "Safe and secure by design",
                "Protects student privacy",
                "Accessibility commitments",
                "Audit logs & role controls",
              ].map((item) => (
                <div key={item} className="rounded-xl border-2 border-border/60 bg-background p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-base md:text-lg text-foreground font-medium">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Results metric */}
        <section className="border-b border-border/60 py-18 md:py-30 bg-gradient-to-b from-white to-muted/20" style={{ backgroundColor: undefined }}>
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="space-y-12 text-center">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Results you can measure</p>
                <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Impact at scale.</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 px-8 py-8">
                  <p className="text-5xl md:text-6xl font-bold text-primary mb-3">{/* TODO: 1M+ */}XX</p>
                  <p className="text-base md:text-lg text-muted-foreground font-medium">Students guided by STU</p>
                </div>
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 px-8 py-8">
                  <p className="text-5xl md:text-6xl font-bold text-primary mb-3">{/* TODO: XX% */}XX%</p>
                  <p className="text-base md:text-lg text-muted-foreground font-medium">Faster time-to-degree</p>
                </div>
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 px-8 py-8">
                  <p className="text-5xl md:text-6xl font-bold text-primary mb-3">{/* TODO: XX% */}XX%</p>
                  <p className="text-base md:text-lg text-muted-foreground font-medium">Advising efficiency gain</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* In the news */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-10 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">In the news</p>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Featured in leading higher ed publications.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Industry recognition for innovation in academic planning.</p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-3">
              {[
                {
                  pub: "Chronicle of Higher Ed",
                  quote: "Stu is modernizing how universities handle degree planning.",
                  url: "#"
                },
                {
                  pub: "EdTech Magazine",
                  quote: "A breakthrough approach to academic advising at scale.",
                  url: "#"
                },
                {
                  pub: "Inside Higher Ed",
                  quote: "Institutions see measurable improvements in time-to-degree.",
                  url: "#"
                },
              ].map((item, idx) => (
                <div key={idx} className="rounded-2xl border-l-4 border-l-primary border border-border/60 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  {/* TODO: Replace logo placeholder with actual publication logos */}
                  <div className="w-16 h-10 rounded border border-border/40 bg-muted/20 flex items-center justify-center mb-4">
                    <span className="text-xs font-bold text-muted-foreground/70">Logo</span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">{item.pub}</p>
                  <p className="text-sm italic text-foreground mb-4 leading-relaxed">"{item.quote}"</p>
                  {/* TODO: Add real article URLs */}
                  <Link href={item.url} className="text-xs font-semibold text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                    Read article
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="border-b border-border/60 py-18 md:py-30 bg-white"
          id="faq"
        >
          <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
            <div className="space-y-4 md:w-2/3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Procurement-ready answers.</h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Short, direct responses to the most common enterprise questions.</p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-2">
              {faqs.map((item) => (
                <div key={item.q} className="rounded-xl border-2 border-border/60 bg-background p-6 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-lg font-semibold text-foreground">{item.q}</p>
                  <p className="mt-3 text-base text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link href="/demo" onClick={() => handleCtaClick("faq")}>
                <Button size="lg" className="rounded-full px-8 py-6 text-lg">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="mailto:hello@stuplanning.com"
                className="text-base font-semibold text-primary underline-offset-4 hover:underline"
              >
                Prefer email? hello@stuplanning.com
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          className="py-18 md:py-30 border-b border-border/60"
          id="demo"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-5xl grid gap-12 md:gap-16 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Get started</p>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">See STU in action.</h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                We'll customize the demo to your institution's degree structure, advising model, and technical landscape. Enterprise-grade planning, designed for university leaders.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
                  <span className="text-sm font-medium text-foreground">30–45 min</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
                  <span className="text-sm font-medium text-foreground">Live or recorded</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
                  <span className="text-sm font-medium text-foreground">No prep required</span>
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-white p-4 text-sm text-foreground space-y-2">
                {/* TODO: Embed Calendly scheduling link if available - for now show email alternative */}
                <p className="font-medium">Prefer scheduling directly?</p>
                <Link href="mailto:hello@stuplanning.com" className="text-primary font-semibold underline-offset-4 hover:underline">
                  Email hello@stuplanning.com
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-lg">
              <form className="space-y-4" onSubmit={handleFormSubmit}>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">Name</span>
                    <input
                      required
                      name="name"
                      type="text"
                      className="mt-1 w-full rounded-lg border border-border/60 bg-white px-4 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">Work email</span>
                    <input
                      required
                      name="email"
                      type="email"
                      className="mt-1 w-full rounded-lg border border-border/60 bg-white px-4 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="you@university.edu"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">Role / department</span>
                    <input
                      required
                      name="role"
                      type="text"
                      className="mt-1 w-full rounded-lg border border-border/60 bg-white px-4 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Registrar, CIO, Advising, etc."
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">Institution</span>
                    <input
                      required
                      name="institution"
                      type="text"
                      className="mt-1 w-full rounded-lg border border-border/60 bg-white px-4 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="University name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">Timeline / priority (optional)</span>
                    <textarea
                      name="timeline"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-border/60 bg-white px-4 py-2 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="e.g., evaluate this term, pilot next term"
                    />
                  </label>
                </div>
                <Button type="submit" className="w-full rounded-full py-3 text-base font-semibold" onClick={() => handleCtaClick("demo_form_cta")}>
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {formStatus === "submitted" && (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                    Thank you! We'll be in touch shortly.
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer id="footer" className="border-t-2 border-border/60 bg-white py-12 md:py-16">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-8">
          <div className="flex items-center gap-2 font-bold text-2xl text-foreground">
            <Image src="/favicon-96x96.png" alt="stu. logo" width={32} height={32} className="rounded-md" />
            <span>stu.</span>
          </div>
          <div className="flex items-center gap-6 text-base text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/security" className="hover:text-foreground transition-colors">
              Security
            </Link>
            <Link href="mailto:hello@stuplanning.com" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Stu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
