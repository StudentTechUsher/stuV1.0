"use client"

import { CheckCircle } from "lucide-react"

const FEATURES = [
  { title: "Smart Degree Planning", description: "AI-powered course recommendations based on degree requirements and prerequisites." },
  { title: "Enrollment Analytics", description: "Gain insights into course demand and optimize class offerings each semester." },
  { title: "Prerequisite Validation", description: "Automatically verify course prerequisites and degree progress requirements." },
  { title: "Student Success Tracking", description: "Monitor degree progression and identify at-risk students early." },
  { title: "Integration Ready", description: "Seamlessly connects with existing Student Information Systems (SIS)." },
  { title: "Customizable Rules", description: "Easily configure degree requirements and academic policies specific to your institution." },
] as const

export default function LandingFeatures() {
  return (
    <section id="features" className="py-20 bg-gradient-to-b from-mint-100 to-white border-b border-zinc-200">
      <div className="page-wrap mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-left space-y-4">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
            Comprehensive Academic Planning Solutions
          </h2>
          <p className="text-zinc-600 md:text-xl">
            Help your students navigate their academic journey while providing valuable insights for your registrar&apos;s office.
          </p>
        </div>

        <br />

        <div className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
                <article
                    key={f.title}
                    className="group rounded-xl bg-green-100 backdrop-blur supports-[backdrop-filter]:bg-green/70
                                shadow-sm transition-all hover:shadow-lg
                                p-4 sm:p-6 lg:p-8 font-medium"
                    >
                    <div className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        <CheckCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold">{f.title}</h3>
                        <p className="text-zinc-600 leading-relaxed">{f.description}</p>
                    </div>
                </article>
            ))}
        </div>
      </div>
    </section>
  )
}
