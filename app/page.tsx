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
            <Link href="/students" className="text-base font-medium hover:text-primary transition-colors">
              For Students
            </Link>
            <Link href="/demo">
              <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium px-6 py-2.5 text-base">
                Request a demo
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
                    Request a demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

     <main className="flex-1">
        <section className="relative py-20 overflow-hidden animate-fade-in">
        <div className="absolute inset-0 primary-glow opacity-50"></div>
        <div className="container px-4 md:px-6 relative">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
        <div className="flex flex-col justify-center space-y-5 max-w-full">
        <div className="space-y-2 max-w-full">
        {/* Matching style from /students */}
        <h1
        className="text-black text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-tight"
        style={{ fontFamily: 'Work Sans, sans-serif' }}
        >
        <div className="whitespace-nowrap">
        Revolutionize Academic Planning
        </div>
        <div className="whitespace-nowrap">
        at Your University
        </div>
        </h1>
        <p
        className="max-w-[600px] text-zinc-600 text-[clamp(1rem,1.5vw,2rem)] leading-snug"
        style={{ fontFamily: 'Inter, sans-serif' }}
        >
        Empower your students and advisors with an intelligent course scheduling and graduation mapping platform that ensures smoother degree progression and higher graduation rates.
        </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium text-base px-6 py-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
        <Link href="/demo" className="flex items-center">
        Request a demo
        <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        </Button>
        <Button className="bg-transparent border-2 border-primary text-zinc-900 hover:bg-primary/10 font-medium text-base px-6 py-3">
        Learn More
        </Button>
        </div>
        </div>


        <div className="flex items-center justify-center">
        <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden bg-gradient-to-br from-mint-300/20 to-mint-200/10">
        {/* Optional hero visual */}
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
                      description:
                        "Automate degree mapping with AI-powered course recommendations that account for prerequisites and custom academic rules.",
                      icon: "/icons/icons8-graduation-scroll-50.png",
                    },
                    {
                      title: "Enrollment Analytics",
                      description:
                        "Track real-time demand to optimize course offerings, reduce bottlenecks, and improve seat utilization.",
                      icon: "/icons/icons8-analytics-60.png",
                    },
                    {
                      title: "Prerequisite Validation",
                      description:
                        "Ensure students meet requirements automatically with built-in checks for prerequisites and co-requisites.",
                      icon: "/icons/icons8-validation-48.png",
                    },
                    {
                      title: "Student Success Tracking",
                      description:
                        "Identify at-risk students early through real-time monitoring of academic progress and engagement.",
                      icon: "/icons/icons8-graduate-48.png",
                    },
                    {
                      title: "Integration Ready",
                      description:
                        "Connect instantly with your SIS and existing infrastructure—no disruption, no duplicate data entry.",
                      icon: "/icons/icons8-integration-48.png",
                    },
                    {
                      title: "Customizable Policies",
                      description:
                        "Tailor degree requirements, course rules, and exceptions to reflect your institution’s unique policies.",
                      icon: "/icons/icons8-policies-48.png",
                    },
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="group flex flex-col items-center gap-2 rounded-lg gradient-border p-6 text-center transition-all hover:shadow-lg hover:shadow-mint-300/10"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        <Image
                          src={feature.icon}
                          alt={feature.title}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
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
        <section className="relative py-20 overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 primary-glow opacity-40"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                  Ready to Transform Academic Planning?
                </h2>
                <p className="mx-auto max-w-[700px] text-zinc-600 md:text-xl">
                  Join leading universities who have improved graduation rates, empowered advisors, and increased student satisfaction with stu&apos;s planning platform.
                </p>
              </div>
              <div className="w-full max-w-md">
                <Link href="/demo">
                  <Button className="w-full bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium py-3 text-lg">
                    Request a demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
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
                Empowering Universities to Build Better Academic Futures
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Testimonials
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Careers
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
                  <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Cookies
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary">
                    Licenses
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Stu Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <span className="sr-only">Twitter</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <span className="sr-only">GitHub</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <span className="sr-only">LinkedIn</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

