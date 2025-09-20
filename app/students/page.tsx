"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { SubmitEmailForm } from '@/components/ui/submit-email-form'  // Changed to named import
import minorsData from "@/data/minors.json"
import type { Minor } from '@/types'

// Now you can use the Program type for your majors/minors

export default function StudentPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [majors, setMajors] = useState<Minor[]>([])
  const minors: Minor[] = minorsData

  useEffect(() => {
    const fetchMajors = async () => {
      const response = await fetch('/api/majors')
      const data = await response.json()
      setMajors(data)
    }
    fetchMajors()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 glass-effect">
        <div className="container mx-auto px-6 flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/favicon-96x96.png"
                alt="stu. logo"
                width={32}
                height={32}
                className="rounded-50 -mb-2"
                priority
              />
              <span className="text-4xl font-bold tracking-tight">stu.</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-base font-medium hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#testimonials" className="text-base font-medium hover:text-primary transition-colors">
              Testimonials
            </Link>
            <Link href="#pricing" className="text-base font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-base font-medium hover:text-primary transition-colors">
              FAQ
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-base font-medium hover:text-primary transition-colors">
              For Universities
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium px-6 py-2.5 text-base transition-all">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-[#06C96C] text-zinc-900 hover:text-white border-none font-medium px-6 py-2.5 text-base transition-all">
                Sign Up
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
                href="/how-it-works"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="#testimonials"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                Student Stories
              </Link>
              <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100">
                <Link
                  href="/"
                  className="text-base font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  For Universities
                </Link>
                <div className="flex flex-col gap-3 mt-4">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-[#06C96C] text-zinc-900 hover:text-white border-none font-medium transition-all">
                      Sign Up
                    </Button>
                  </Link>
                </div>
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
                    Your Degree, Your Schedule
                  </h1>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    <div 
                      className="h-full w-full flex items-center gap-3"
                      role="banner"
                      aria-label="Hero section"
                    >
                      Seamless with
                      <div className="flex items-center gap-2">
                        <Image
                          src="/stu_icon_black.png"
                          alt="stu. logo"
                          width={70}
                          height={70}
                          className="rounded-50"
                          priority
                          style={{ width: "auto", height: "1em" }}
                        />
                        <span>stu.</span>
                      </div>
                    </div>
                  </h1>
                  <p className="max-w-[600px] text-zinc-600 md:text-xl">
                    Never stress about course planning again.
                  </p>
                  <p className="max-w-[600px] text-zinc-600 md:text-xl">
                    stu helps you create the class schedule that fits your degree requirements and life commitments.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                    <Link href="#cta" className="flex items-center">
                      Try{" "}
                      <Image
                        src="/stu_icon_black.png"
                        alt="stu. logo"
                        width={24}
                        height={24}
                        className="rounded-50 -mb-2 pb-3 m-1 ml-2 mr-2"
                        priority
                      />{" "}
                      Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
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
        <section
          id="features"
          className="py-20 bg-gradient-to-b from-mint-100 to-white flex flex-col items-center justify-center text-center"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Your Personal Academic Planner
                </h2>
                <p className="mx-auto max-w-[700px] text-zinc-600 md:text-xl">
                  Everything you need to stay on track and graduate on time.
                </p>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "Smart Course Suggestions",
                    description:
                      "Get personalized course recommendations based on your degree requirements and prerequisites.",
                  },
                  {
                    title: "4-Year Planning",
                    description:
                      "Map out your entire degree journey and adjust as needed with our flexible planning tools.",
                  },
                  {
                    title: "Prerequisite Tracking",
                    description:
                      "Never miss a prerequisite with automatic requirement checking and course sequencing.",
                  },
                  {
                    title: "Schedule Optimization",
                    description:
                      "Find the perfect balance between required courses and your preferred schedule.",
                  },
                  {
                    title: "Progress Tracking",
                    description:
                      "Stay on top of your degree progress with real-time tracking and milestone updates.",
                  },
                  {
                    title: "Mobile Friendly",
                    description:
                      "Access your schedule and make changes anywhere, anytime from any device.",
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="group flex flex-col items-center gap-2 rounded-lg gradient-border p-6 text-center transition-all hover:shadow-lg hover:shadow-mint-300/10"
                  >
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

        {/* Testimonials Section */}
        <section
          id="testimonials"
          className="py-20 bg-gradient-to-b from-mint-100 to-white flex flex-col items-center justify-center text-center"
        >
          <br /> <br />
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Student Reviews</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Tyler S", state: "CA", text: '"The easiest way to class classes that would actually help with the major I\'m taking"' },
              { name: "Isaac B", state: "WA", text: '"I love it!"' },
              { name: "Zach W", state: "UT", text: '"This is great!"' },
            ].map((review, i) => (
              <div
                key={i}
                className="group flex flex-col items-center gap-2 rounded-lg gradient-border p-6 text-center transition-all hover:shadow-lg hover:shadow-mint-300/10"
              >
                <h3 className="text-xl font-bold">
                  {review.name}, {review.state}
                </h3>
                <p className="text-zinc-600">{review.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section
          id="cta"
          className="relative py-20 overflow-hidden flex flex-col items-center justify-center text-center"
        >
          <div className="absolute inset-0 primary-glow opacity-40"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Ready to Simplify Your Academic Journey?
                </h2>
                <p className="mx-auto max-w-[700px] text-zinc-600 md:text-xl">
                  Join students across the country who are already using stu to plan their perfect semester.
                </p>
              </div>
              <div className="w-full max-w-md space-y-4">
                <SubmitEmailForm />
                <p className="text-xs text-center text-zinc-500">
                  By joining, you agree to our{" "}
                  <Link href="#" className="underline underline-offset-2 hover:text-primary">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="underline underline-offset-2 hover:text-primary">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Minors Section */}
        <section className="py-20 bg-white flex flex-col items-center justify-center text-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {minors.map((minor) => (
                  <div
                    key={minor.id}
                    className="group flex flex-col items-center gap-2 rounded-lg gradient-border p-6 text-center transition-all hover:shadow-lg hover:shadow-mint-300/10"
                  >
                    <h3 className="text-xl font-bold">{minor.name}</h3>
                    <p className="text-zinc-600">{minor.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 font-bold">
                <Image
                  src="/favicon-96x96.png"
                  alt="stu. logo"
                  width={32}
                  height={32}
                  className="rounded-50"
                  priority
                />
                <span>stu.</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Making Academic Planning Simple and Smart
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="text-muted-foreground hover:text-primary">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#testimonials" className="text-muted-foreground hover:text-primary">
                    Student Stories
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-muted-foreground hover:text-primary">
                    For Universities
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stu Inc. All rights reserved.</p>
            <div className="flex gap-4"></div>
          </div>
        </div>
      </footer>
    </div>
  )
}