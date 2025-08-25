"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 glass-effect">
        <div className="container mx-auto px-6 flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/favicon.ico"
                alt="stu. logo"
                width={32}
                height={32}
                className="rounded-50 -mb-2"
                priority
              />
              <span className="text-4xl font-bold tracking-tight">stu.</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/login" className="text-base font-medium hover:text-primary transition-colors">
              Log In
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium px-6 py-2.5 text-base">
                New Student Sign Up
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-100">
            <div className="container mx-auto px-6 py-6 flex flex-col gap-6">
              <Link
                href="#features"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#testimonials"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </Link>
              <Link
                href="#pricing"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="#faq"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100">
                <Link
                  href="/students"
                  className="text-base font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  For Students →
                </Link>
                <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium w-full py-2.5 text-base">
                    Request Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 primary-glow opacity-50"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Revolutionize Academic Planning at Your University
                  </h1>
                  <p className="max-w-[600px] text-zinc-600 md:text-xl">
                    Empower your students with an intelligent course scheduling platform that ensures smoother degree progression and higher graduation rates.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium">
                    <Link href="/demo" className="flex items-center">
                      Request Demo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button className="bg-transparent border-2 border-primary text-zinc-900 hover:bg-primary/10">
                    Learn More
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden bg-gradient-to-br from-mint-300/20 to-mint-200/10">
                  {/* Placeholder for hero image */}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-gradient-to-b from-mint-100 to-white flex flex-col items-center justify-center text-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Comprehensive Academic Planning Solutions
                </h2>
                <p className="mx-auto max-w-[700px] text-zinc-600 md:text-xl">
                  Help your students navigate their academic journey while providing valuable insights for your registrar&apos;s office.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "Smart Degree Planning",
                    description: "AI-powered course recommendations based on degree requirements and prerequisites.",
                  },
                  {
                    title: "Enrollment Analytics",
                    description: "Gain insights into course demand and optimize class offerings each semester.",
                  },
                  {
                    title: "Prerequisite Validation",
                    description: "Automatically verify course prerequisites and degree progress requirements.",
                  },
                  {
                    title: "Student Success Tracking",
                    description: "Monitor degree progression and identify at-risk students early.",
                  },
                  {
                    title: "Integration Ready",
                    description: "Seamlessly connects with existing Student Information Systems (SIS).",
                  },
                  {
                    title: "Customizable Rules",
                    description: "Easily configure degree requirements and academic policies specific to your institution.",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="group flex flex-col items-center gap-2 rounded-lg gradient-border p-6 text-center transition-all hover:shadow-lg hover:shadow-mint-300/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-zinc-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}