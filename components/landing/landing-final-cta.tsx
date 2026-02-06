"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { landingPageBg } from "./landing-data"

export type LandingDemoFormValues = {
  name: string
  email: string
  role: string
  institution: string
  timeline?: string
}

export type LandingFinalCtaProps = {
  pageBg?: string
  ctaLabel?: string
  onCtaClick?: (source: string) => void
  onSubmit?: (values: LandingDemoFormValues) => void
  email?: string
  submittedMessage?: string
}

export function LandingFinalCta({
  pageBg = landingPageBg,
  ctaLabel = "Request a demo",
  onCtaClick,
  onSubmit,
  email = "hello@stuplanning.com",
  submittedMessage = "Thank you! We'll be in touch shortly.",
}: LandingFinalCtaProps) {
  const [formStatus, setFormStatus] = useState<"idle" | "submitted">("idle")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const values: LandingDemoFormValues = {
      name: formData.get("name")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      role: formData.get("role")?.toString() || "",
      institution: formData.get("institution")?.toString() || "",
      timeline: formData.get("timeline")?.toString() || undefined,
    }
    onSubmit?.(values)
    setFormStatus("submitted")
    event.currentTarget.reset()
  }

  return (
    <section
      className="relative z-10 -mt-10 md:-mt-14 rounded-t-[2.5rem] md:rounded-t-[3rem] overflow-hidden py-18 md:py-30 border-b border-border/60 scroll-mt-28"
      id="demo"
      style={{ backgroundColor: pageBg }}
    >
      <div className="container mx-auto max-w-5xl grid gap-12 md:gap-16 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="space-y-6">
          <div className="inline-flex rounded-full bg-foreground px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: pageBg }}>
              Get started
            </span>
          </div>
          <h2 className="font-header text-4xl md:text-5xl font-bold tracking-tight">See STU in action.</h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            We&apos;ll tailor a walkthrough to your degree structure, advising model, and systems—so you can evaluate fit
            quickly and confidently.
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
            <Link href={`mailto:${email}`} className="text-primary font-semibold underline-offset-4 hover:underline">
              Email {email} and we&apos;ll coordinate a time.
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-8 shadow-lg">
          <form className="space-y-4" onSubmit={handleSubmit}>
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
            <Button
              type="submit"
              className="w-full rounded-full py-3 text-base font-semibold"
              onClick={() => onCtaClick?.("demo_form_cta")}
            >
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {formStatus === "submitted" && (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                {submittedMessage}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
