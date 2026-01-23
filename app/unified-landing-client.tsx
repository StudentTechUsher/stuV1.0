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
  const tracker = (window as any)
  tracker.dataLayer?.push({ event: name, ...payload })
  tracker.gtag?.("event", name, payload)
  tracker.analytics?.track?.(name, payload)
  // Fallback console to ensure we can verify during QA
  // eslint-disable-next-line no-console
  console.log(`[track] ${name}`, payload)
}

const navLinks = [
  { href: "#product", label: "Product" },
  { href: "#solutions", label: "Solutions" },
  { href: "#case-studies", label: "Success Stories" },
  { href: "#faq", label: "Resources" },
  { href: "#footer", label: "Company" },
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
        className="sticky top-0 z-30 border-b border-border/60 backdrop-blur"
        style={{ backgroundColor: pageBg }}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-12">
          <Link href="/" className="flex items-center gap-4 font-bold tracking-tight text-4xl">
            <Image
              src="/favicon-96x96.png"
              alt="stu. logo"
              width={64}
              height={64}
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
                className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/demo" onClick={() => handleCtaClick("header")}>
              <Button
                size="lg"
                className="rounded-full px-10 py-7 text-[1.35rem] font-semibold leading-tight tracking-tight bg-foreground hover:bg-foreground/90"
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
          <div className="border-t border-border/60 bg-background lg:hidden">
            <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:px-8">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
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
            className="border-b border-border/60 py-20 md:py-28"
            style={{ backgroundColor: pageBg }}
          >
          <div className="container mx-auto max-w-5xl px-4 md:px-10">
            <div className="flex min-h-[85vh] flex-col items-center text-center space-y-8">
              <div className="space-y-4 pt-6">
                <h1 className="font-header text-[clamp(1.6rem,5vw,6.75rem)] md:text-[clamp(4rem,5vw,7rem)] font-bold leading-[1.05] tracking-tight text-foreground text-balance">
                  <span className="block leading-tight">Make every student’s path</span>
                  <span className="block leading-tight">to graduation clear.</span>
                </h1>
                <p className="mx-auto max-w-3xl text-xl text-muted-foreground md:text-2xl text-balance">
                  STU maps degree requirements, transfer credits, and schedules into a clear path—so students graduate faster and institutions improve retention.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Link href="/demo" onClick={() => handleCtaClick("hero")}>
                  <Button
                    size="lg"
                    className="rounded-full px-20 md:px-24 py-7 text-[1.35rem] font-semibold leading-tight tracking-tight min-w-[280px] md:min-w-[350px]"
                  >
                    Request a Demo
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
                <Link
                  href="#product"
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  See how it works
                </Link>
              </div>
              <div className="w-full pt-28">
                <div className="overflow-hidden rounded-3xl border border-border/60" style={{ backgroundColor: pageBg }}>
                  <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 text-sm font-semibold text-foreground/80">
                    <span>Product Preview (replace with screenshot/video)</span>
                    <span className="text-primary">TODO: Embed real asset</span>
                  </div>
                  <div className="flex h-[320px] flex-col items-center justify-center px-6 py-10 md:h-[380px]">
                    <div className="w-full max-w-3xl rounded-2xl border border-dashed border-border/70 bg-white/80 p-6 text-center text-sm text-muted-foreground">
                      Minimal placeholder frame. Swap with your clean dashboard or scheduling preview.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-b border-border/60 bg-background py-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Trusted by forward-looking institutions</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1">TODO: Replace logos</span>
                  <span className="rounded-full bg-muted px-3 py-1">University Logo</span>
                  <span className="rounded-full bg-muted px-3 py-1">University Logo</span>
                  <span className="rounded-full bg-muted px-3 py-1">University Logo</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="rounded-lg border border-border/70 px-4 py-3 text-left">
                  <p className="text-xs text-muted-foreground">Mapped students</p>
                  <p className="text-lg font-semibold">TODO: X,000+</p>
                </div>
                <div className="rounded-lg border border-border/70 px-4 py-3 text-left">
                  <p className="text-xs text-muted-foreground">Advising time saved</p>
                  <p className="text-lg font-semibold">TODO: Y%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-border/60 bg-muted/40 py-16" id="product">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary uppercase tracking-wide">The problem</p>
                <h2 className="font-header text-3xl font-bold tracking-tight md:text-4xl">
                  Academic planning is fragmented, manual, and hard to govern.
                </h2>
                <p className="text-lg text-muted-foreground">
                  Provosts, registrars, and CIOs juggle disconnected tools, late data, and policies that are difficult to enforce consistently.
                </p>
              </div>
              <div className="grid gap-3 rounded-xl border border-border/70 bg-background p-6 shadow-sm">
                {painPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-primary" />
                    <p className="text-sm text-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Solution pillars */}
        {/* Trusted by */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-6 px-4 md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center">Trusted by</p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="rounded-full border border-border/60 px-4 py-2 bg-white/70">
                  University Logo
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Role-based value */}
        <section
          className="border-b border-border/60 py-20 md:py-24"
          id="solutions"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-6xl space-y-10 px-4 md:px-8">
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Why STU</p>
              <h2 className="font-header text-3xl font-bold tracking-tight md:text-4xl">
                Imagine a university where every pathway is clear.
              </h2>
              <p className="text-lg text-muted-foreground">
                Tailored outcomes for every leader who owns student success, policy, and systems.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "For Provost & Student Success", copy: "Reduce time-to-degree and lift retention with governed, consistent pathways across every program." },
                { title: "For Registrar & Academic Affairs", copy: "Codify policies once. Keep degree audits, substitutions, and transfer rules aligned without manual rework." },
                { title: "For CIO & IT", copy: "Secure, low-friction integrations with SIS and identity. Clear data boundaries and admin controls." },
              ].map((role) => (
                <div key={role.title} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
                  <div className="text-sm font-semibold text-primary">{role.title}</div>
                  <p className="text-sm text-foreground">{role.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform overview */}
        <section
          className="border-b border-border/60 py-20 md:py-24"
          id="product"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-6xl space-y-10 px-4 md:px-8">
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Platform</p>
              <h2 className="font-header text-3xl font-bold tracking-tight md:text-4xl">
                One system. Three pillars that cover the journey.
              </h2>
              <p className="text-lg text-muted-foreground">Progress, Care, Explore—purpose-built for student pathways and institutional control.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { header: "Progress", items: ["Planner & pathways", "Degree audit alignment", "Policy-aware schedules"] },
                { header: "Care", items: ["Risk alerts & reporting", "Advisor notes & actions", "Appointments in context"] },
                { header: "Explore", items: ["Major/what-if compare", "Transfer rule visibility", "Prospective pathways"] },
              ].map((pillar) => (
                <div key={pillar.header} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
                  <div className="text-sm font-semibold text-primary uppercase">{pillar.header}</div>
                  <ul className="space-y-2 text-sm text-foreground">
                    {pillar.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/demo" onClick={() => handleCtaClick(`pillar_${pillar.header.toLowerCase()}`)} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                    Learn about {pillar.header.toLowerCase()}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Works best together */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-5xl space-y-4 px-4 text-center md:px-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">End-to-end</p>
            <h3 className="font-header text-3xl font-bold tracking-tight md:text-4xl">Like your institution, STU works best together.</h3>
            <p className="text-lg text-muted-foreground">
              Replace fragmented planning, audit, and scheduling workflows with one system that keeps policy, demand, and student goals aligned.
            </p>
            <div className="flex justify-center">
              <Link href="/demo" onClick={() => handleCtaClick("works_together")}>
                <Button size="lg" className="rounded-full px-8 py-3 text-base">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Product visual */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-6 px-4 md:px-8">
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Product preview</p>
              <h3 className="font-header text-3xl font-bold tracking-tight md:text-4xl">One clean view for students, advisors, and admins.</h3>
              <p className="text-lg text-muted-foreground">Swap this frame with your latest dashboard or scheduling walkthrough.</p>
            </div>
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-white/70 shadow-lg">
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3 text-sm text-muted-foreground">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-foreground font-semibold">Product Preview (replace with screenshot/video)</span>
              </div>
              <div className="flex h-[400px] items-center justify-center bg-muted/30 p-8 md:h-[460px]">
                <div className="w-full max-w-4xl rounded-2xl border border-dashed border-border/70 bg-background/90 p-8 text-center text-sm text-muted-foreground">
                  Placeholder preview area. Use a single, clean hero screenshot.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Easy to get started + testimonial */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl grid gap-8 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Implementation</p>
              <h3 className="font-header text-3xl font-bold tracking-tight md:text-4xl">We make it easy to get started.</h3>
              <p className="text-lg text-muted-foreground">Dedicated launch support, clear data boundaries, and a step-by-step rollout plan.</p>
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />Connect SIS/identity with least-privilege access.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />Map degree rules once; validate against live data.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />Pilot with advisors; scale to programs fast.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-primary">Implementation spotlight</p>
              <p className="text-lg text-foreground">“Stu kept us policy-aligned from day one. Advisors trusted the plans; IT trusted the data flows.”</p>
              <p className="text-sm text-muted-foreground">Project Manager, University Partner (placeholder)</p>
              <p className="text-xs text-muted-foreground">TODO: Replace with real quote and attribution.</p>
            </div>
          </div>
        </section>

        {/* Security & privacy */}
        <section className="border-b border-border/60 py-12 md:py-16" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl grid gap-6 px-4 md:grid-cols-2 md:px-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Security & Privacy</p>
              <h3 className="font-header text-2xl font-bold tracking-tight md:text-3xl">Enterprise-ready controls.</h3>
              <p className="text-lg text-muted-foreground">SSO, least-privilege access, and auditability for every role.</p>
              <Link href="/security" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                View Trust Center (placeholder)
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                "Safe and secure by design",
                "Protects student privacy",
                "Accessibility commitments",
                "Audit logs & role controls",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-border/70 bg-background p-4 text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Results metric */}
        <section className="border-b border-border/60 py-14 md:py-18" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-5xl px-4 text-center md:px-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Results you can measure</p>
            <h3 className="font-header text-3xl font-bold tracking-tight md:text-4xl">Impact at scale.</h3>
            <p className="mt-3 text-lg text-muted-foreground">Replace this with your real impact metric.</p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-6 py-4 shadow-sm">
              <span className="text-4xl font-bold text-primary">TODO</span>
              <span className="text-sm text-muted-foreground">students guided with STU pathways</span>
            </div>
          </div>
        </section>

        {/* Institution types */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-8 px-4 md:px-8">
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Institution fit</p>
              <h3 className="font-header text-3xl font-bold tracking-tight md:text-4xl">See what STU can do for your campus.</h3>
              <p className="text-lg text-muted-foreground">Pick your profile—content placeholders until real stories are ready.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-5 text-sm font-semibold text-foreground">
              {["Large Public", "Small Private", "Community College", "R1", "International"].map((label) => (
                <div key={label} className="rounded-full border border-border/70 bg-background px-4 py-2 text-center">
                  {label}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
              <p className="text-sm font-semibold text-primary">Placeholder testimonial</p>
              <p className="text-lg text-foreground mt-2">“STU streamlined pathways for our institution type.”</p>
              <p className="text-sm text-muted-foreground">Role, Institution (placeholder)</p>
              <p className="text-xs text-muted-foreground mt-2">TODO: Swap with real testimonial per institution type.</p>
            </div>
          </div>
        </section>

        {/* Success stories */}
        <section
          className="border-b border-border/60 py-20 md:py-24"
          id="case-studies"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-6xl space-y-8 px-4 md:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Success Stories</p>
                <h3 className="font-header text-3xl font-bold tracking-tight md:text-4xl">Proof your stakeholders will ask for.</h3>
                <p className="text-lg text-muted-foreground">Add short case studies with outcome headlines.</p>
              </div>
              <Link href="/demo" onClick={() => handleCtaClick("case_studies")}>
                <Button size="lg" className="rounded-full px-7">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                "How University A reduced excess credits",
                "How College B improved time-to-degree",
                "How Institution C scaled advisor capacity",
                "How University D aligned transfer pathways",
              ].map((title) => (
                <div key={title} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background p-6 shadow-sm">
                  <p className="text-base font-semibold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground">TODO: add metric and link.</p>
                  <Link href="/demo" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                    View story (placeholder)
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* In the news */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-5xl space-y-6 px-4 text-center md:px-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">In the news</p>
            <div className="grid gap-4 md:grid-cols-3">
              {["“Placeholder press quote.”", "“Another placeholder quote.”", "“Keep section once real PR exists.”"].map((quote, idx) => (
                <div key={idx} className="rounded-2xl border border-border/70 bg-background p-5 text-sm text-muted-foreground shadow-sm">
                  {quote}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">TODO: Replace or hide until real press is available.</p>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="border-b border-border/60 py-20 md:py-24"
          id="faq"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-6xl space-y-8 px-4 md:px-8">
            <div className="space-y-3 md:w-2/3">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">FAQ</p>
              <h2 className="font-header text-3xl font-bold tracking-tight md:text-4xl">Procurement-ready answers.</h2>
              <p className="text-lg text-muted-foreground">Short, direct responses to the most common enterprise questions.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((item) => (
                <div key={item.q} className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
                  <p className="text-base font-semibold">{item.q}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/demo" onClick={() => handleCtaClick("faq")}>
                <Button className="rounded-full px-7">
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="mailto:hello@stuplanning.com"
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Prefer email? hello@stuplanning.com
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          className="py-20 md:py-24"
          id="demo"
          style={{ backgroundColor: pageBg }}
        >
          <div className="container mx-auto max-w-5xl grid gap-10 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">A better path starts here</p>
              <h2 className="font-header text-3xl font-bold tracking-tight md:text-4xl">Request a demo.</h2>
              <p className="text-lg text-muted-foreground">
                We’ll tailor the walkthrough to your degree requirements, advising workflows, and SIS landscape. No student signup flows—this page is for university leaders.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="rounded-full bg-muted px-3 py-1">Live or recorded demo</span>
                <span className="rounded-full bg-muted px-3 py-1">Security review ready</span>
                <span className="rounded-full bg-muted px-3 py-1">Implementation path included</span>
              </div>
              <div className="rounded-lg border border-dashed border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
                TODO: Embed Calendly if available; keep this form as fallback.
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-6 shadow-xl">
              <form className="space-y-4" onSubmit={handleFormSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-foreground">
                    Name
                    <input
                      required
                      name="name"
                      type="text"
                      className="mt-1 w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Work email
                    <input
                      required
                      name="email"
                      type="email"
                      className="mt-1 w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder="you@university.edu"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium text-foreground">
                  Role / department
                  <input
                    required
                    name="role"
                    type="text"
                    className="mt-1 w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Registrar, CIO, Advising, etc."
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Institution
                  <input
                    required
                    name="institution"
                    type="text"
                    className="mt-1 w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="University name"
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Priority / timeline
                  <textarea
                    name="timeline"
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g., evaluate this term, pilot next term"
                  />
                </label>
                <Button type="submit" className="w-full rounded-full" size="lg" onClick={() => handleCtaClick("demo_form_cta")}>
                  Request a Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {formStatus === "submitted" && (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                    Thanks! We’ll follow up shortly. {/* TODO: wire to backend endpoint */}
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer id="footer" className="border-t border-border/60 bg-background py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row md:px-8">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Image src="/favicon-96x96.png" alt="stu. logo" width={24} height={24} className="rounded-md" />
            <span>stu.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/security" className="hover:text-foreground">
              Security
            </Link>
            <Link href="mailto:hello@stuplanning.com" className="hover:text-foreground">
              Contact
            </Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Stu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
