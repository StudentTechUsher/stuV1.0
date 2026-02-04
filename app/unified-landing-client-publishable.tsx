/**
 * STU Landing Page - PUBLISHABLE VERSION
 *
 * This version has all placeholder sections removed and contains ONLY
 * real, defensible content. Safe to publish immediately.
 *
 * CURRENT STATUS: Live on production
 * ACCESSIBLE AT: / (root)
 *
 * DIFFERENCES FROM TEMPLATE:
 * - No university logo grid placeholders
 * - No product visual mockup
 * - No TODO comments
 * - All remaining content is real and verified
 * - Emojis replaced with Lucide icons
 *
 * TO SWITCH TO TEMPLATE VERSION:
 * Update app/page.tsx to import from './unified-landing-client' instead of
 * './unified-landing-client-publishable'
 */

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
  Building2,
  GraduationCap,
  School,
  Microscope,
  Globe,
  Lock,
  Shield,
  Accessibility,
} from "lucide-react"

type TrackingPayload = Record<string, string | number | undefined>

const pageBg = "#f7f3ec"

const painPoints = [
  "Disconnected systems (SIS, degree audit, scheduling) slow decisions and create inconsistent guidance.",
  "Transfer and equivalency rules are hard to interpret—students and advisors spend hours reconciling requirements.",
  "Course bottlenecks delay progress and lengthen time-to-degree.",
  "Advising teams are overloaded; planning quality varies by person and program.",
  "Leadership lacks a clear view of pathways, demand, risk, and on-time completion.",
]

function trackEvent(name: string, payload: TrackingPayload = {}) {
  if (typeof window === "undefined") return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tracker = (window as any)
  tracker.dataLayer?.push({ event: name, ...payload })
  tracker.gtag?.("event", name, payload)
  tracker.analytics?.track?.(name, payload)
  // Fallback console to ensure we can verify during QA
  console.log(`[track] ${name}`, payload)
}

const navLinks = [
  { href: "#product", label: "Platform" },
  { href: "#solutions", label: "Solutions" },
  { href: "#case-studies", label: "Success Stories" },
]

const faqs = [
  {
    q: "How long does implementation take?",
    a: "Most institutions launch a pilot in weeks. Full rollout depends on your degree audit, catalog complexity, and integration approach.",
  },
  {
    q: "What data do you need to get started?",
    a: "Degree requirements, course catalog, term schedule history, and read access to SIS data (or secure exports) to validate plans and progress.",
  },
  {
    q: "How is pricing structured?",
    a: "Pricing scales with institution size and scope. The goal is enterprise capability without enterprise pricing—aligned to measurable ROI.",
  },
  {
    q: "Do you integrate with our SIS and degree audit tools?",
    a: "Yes. We support common higher-ed systems and can also work through secure exports when direct APIs aren't available.",
  },
  {
    q: "How do you handle security and student privacy?",
    a: "Role-based access, least-privilege data flows, and auditable activity. Security documentation is available during evaluation.",
  },
  {
    q: "What does training and support look like?",
    a: "We provide onboarding for admins and advising teams, documentation and playbooks, and ongoing check-ins to ensure adoption.",
  },
  {
    q: "Who is stu. built for—students, advisors, or administrators?",
    a: "All three. Students get clear next steps, advisors can guide and adjust plans, and administrators maintain policy and visibility at scale.",
  },
  {
    q: "How do you approach accessibility?",
    a: "We design for clarity and low cognitive load and test for keyboard and screen reader support as part of our QA process.",
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
                Request a demo
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
          <div className="border-t-2 border-border/60 lg:hidden" style={{ backgroundColor: pageBg }}>
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
                  Request a demo
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
                <h1 className="font-header text-[clamp(2.5rem,5.5vw,6.5rem)] font-bold leading-tight tracking-tight text-foreground">
                  <span className="block whitespace-nowrap">Clearer paths to graduation.</span>
                  <span className="block whitespace-nowrap">For every student.</span>
                </h1>
                <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:text-xl leading-relaxed">
                  Launch in weeks. Integrate with Banner, DegreeWorks, Course, and more. Prove ROI within a semester, without the enterprise price tag.
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
                <Link href="/demo" onClick={() => handleCtaClick("hero")} className="w-7/12">
                  <Button
                    className="w-full rounded-full px-16 md:px-28 py-7 text-[1.5rem] md:text-[1.75rem] font-semibold leading-tight tracking-tight"
                  >
                    Request a demo
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

        {/* Problem */}
        <section className="border-b border-border/60 bg-muted/30 py-18 md:py-30" id="product">
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-center">
              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>The problem</span>
                </div>
                <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                  Academic planning is complex, fragmented, and hard to govern.
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  Institutions juggle disconnected tools, uneven processes, and policies that are difficult to apply consistently across programs.
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

        {/* Why schools choose STU */}
        <section className="border-b border-border/60 py-18 md:py-30 bg-white">
          <div className="container mx-auto max-w-6xl space-y-12 md:space-y-16 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Why schools choose stu.</span>
              </div>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                Built for higher ed institutions.
              </h2>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-4">
              {[
                {
                  title: "Launch in weeks",
                  desc: "Not years. Typical pilot to production: 4-8 weeks.",
                },
                {
                  title: "50-70% more affordable",
                  desc: "Enterprise capability without enterprise pricing.",
                },
                {
                  title: "Built for mid-sized institutions",
                  desc: "Purpose-built for colleges and universities with 5K-25K students.",
                },
                {
                  title: "Integrates with your systems",
                  desc: "Banner, DegreeWorks, CourseLeaf, and more.",
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-sm">
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
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
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Why stu.</span>
              </div>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                Imagine a campus where every student&apos;s pathway is clear.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mx-auto max-w-3xl">
                stu. reduces cognitive load for students, gives advisors time back, and gives leaders visibility into progress and demand.
              </p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-3">
              {[
                { title: "For Provost & Student Success", copy: "Improve retention and time-to-degree with governed pathways across every program." },
                { title: "For Registrar & Academic Affairs", copy: "Codify policy once. Keep requirements, substitutions, and transfer rules consistent." },
                { title: "For CIO & IT", copy: "Integrate securely with clear data boundaries, access controls, and operational reliability." },
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
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Platform</span>
              </div>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">
                Built to improve completion—at institutional scale.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">stu. turns complex requirements and real-life constraints into guided plans students can follow, advisors can trust, and leaders can govern.</p>
            </div>
            <div className="grid gap-6 md:gap-8 md:grid-cols-3">
              {[
                { header: "Guide", items: ["Degree progress that's easy to understand", "Plans students can actually follow", "Clear requirements, substitutions, and audit alignment"], linkText: "guided planning" },
                { header: "Support", items: ["Reduce advising logistics and repeat questions", "Context that helps advisors intervene sooner", "Shared visibility that scales across teams"], linkText: "advising support" },
                { header: "Govern", items: ["Institution-wide policy consistency (programs, catalogs, transfer rules)", "Visibility into bottlenecks, demand, and risk cohorts", "Reporting built for provost/registrar/CIO decision-making"], linkText: "governance" },
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
                    Learn about {pillar.linkText}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Works best together */}
        <section className="border-b border-border/60 py-16 md:py-20" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-4xl space-y-6 px-4 text-center md:px-8">
            <div className="inline-flex rounded-full bg-foreground px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>End-to-end</span>
            </div>
            <h3 className="font-header text-[clamp(1.2rem,3.5vw,4.5rem)] font-bold tracking-tight text-center mx-auto">Clarity works best when everything connects.</h3>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              stu. unifies planning, audit alignment, and schedules so policy, demand, and student goals stay in sync.
            </p>
            <div className="flex justify-center pt-2">
              <Link href="/demo" onClick={() => handleCtaClick("works_together")}>
                <Button size="lg" className="rounded-full px-8 py-6 text-lg">
                  Request a demo
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
                <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Success Stories</span>
                </div>
                <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Outcomes institutions can stand behind.</h3>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Retention, time-to-degree, and advising efficiency—measured and reported with clarity.</p>
              </div>
              <Link href="/demo" onClick={() => handleCtaClick("case_studies")}>
                <Button size="lg" className="rounded-full px-8 py-6 text-lg whitespace-nowrap">
                  Request a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-6">
              <p className="text-center text-muted-foreground">
                Our customers report measurable improvements in retention, time-to-degree, and advising efficiency.
                Request a demo to see case studies and ROI data relevant to your institution.
              </p>
            </div>
          </div>
        </section>

        {/* Institution types */}
        <section className="border-b border-border/60 py-18 md:py-24 bg-white">
          <div className="container mx-auto max-w-6xl space-y-10 md:space-y-12 px-4 md:px-8">
            <div className="space-y-4 text-center">
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Built for every campus type</span>
              </div>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Designed for complexity—across every campus type.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">stu. adapts to your programs, policies, and transfer reality—without adding complexity for students or staff.</p>
            </div>
            <div className="grid gap-3 md:gap-4 md:grid-cols-5">
              {[
                { icon: Building2, label: "Large Public", desc: "Multi-college systems" },
                { icon: GraduationCap, label: "Small Private", desc: "Boutique institutions" },
                { icon: School, label: "Community College", desc: "Open access/transfer" },
                { icon: Microscope, label: "R1 Research", desc: "Complex requirements" },
                { icon: Globe, label: "International", desc: "Global programs" }
              ].map((type) => (
                <button key={type.label} className="rounded-xl border border-border/60 bg-white px-4 py-5 text-center text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all space-y-2">
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

        {/* Implementation */}
        <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl grid gap-12 md:gap-16 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div className="space-y-6">
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Implementation</span>
              </div>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">From pilot to impact in weeks.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">A phased rollout, clear data requirements, and a success team that keeps implementation calm and predictable.</p>
              <ul className="space-y-4 text-base md:text-lg text-foreground">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                  <span><strong>Week 1:</strong> SSO + read-only SIS connection (or secure exports).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                  <span><strong>Week 2-3:</strong> Map requirements and validate with real student pathways.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
                  <span><strong>Week 4+:</strong> Pilot with advisors, iterate quickly, then scale.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security & privacy */}
        <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl space-y-10 md:space-y-12 px-4 md:px-8">
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Security & Privacy</span>
              </div>
              <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Trust and governance built in.</h3>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Role-based access, least-privilege data flows, and auditability—designed for institutional confidence.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">SSO + RBAC</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Privacy-first (FERPA-aligned)</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-4 py-2">
                  <Accessibility className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Accessibility-first</span>
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

        {/* What we measure */}
        <section className="border-b border-border/60 py-18 md:py-30" style={{ backgroundColor: pageBg }}>
          <div className="container mx-auto max-w-6xl px-4 md:px-8">
            <div className="space-y-12 text-center">
              <div className="space-y-4">
                <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Outcomes that matter</span>
                </div>
                <h3 className="font-header text-4xl md:text-5xl font-bold tracking-tight">What we help you measure</h3>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">stu. gives leaders the visibility they need to prove impact and improve student success.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  "Retention & completion rates",
                  "Time-to-degree & excess credits",
                  "Advising efficiency & capacity",
                  "Student satisfaction & engagement",
                ].map((outcome) => (
                  <div key={outcome} className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
                    <p className="font-semibold text-foreground">{outcome}</p>
                  </div>
                ))}
              </div>
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
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>FAQ</span>
              </div>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">Answers for evaluation and procurement.</h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">Short, direct responses to common questions from academic and IT leaders.</p>
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
                  Request a demo
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
              <div className="inline-flex rounded-full bg-foreground px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>Get started</span>
              </div>
              <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">See STU in action.</h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                We&apos;ll tailor a walkthrough to your degree structure, advising model, and systems—so you can evaluate fit quickly and confidently.
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
                <p className="font-medium">Want to schedule directly?</p>
                <Link href="mailto:hello@stuplanning.com" className="text-primary font-semibold underline-offset-4 hover:underline">
                  Email hello@stuplanning.com and we&apos;ll coordinate a time.
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
                  Request a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {formStatus === "submitted" && (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                    Thank you! We&apos;ll be in touch shortly.
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
