"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Menu, X, GraduationCap, Building2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { SubmitEmailForm } from '@/components/ui/submit-email-form'
import { useUniversityTheme } from "@/contexts/university-theme-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Audience = 'students' | 'universities'

export function UnifiedLandingClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [audience, setAudience] = useState<Audience>('universities')
  const { university } = useUniversityTheme()
  const router = useRouter()

  // Force the landing page to always render in light mode, regardless of user preference.
  useEffect(() => {
    const htmlElement = document.documentElement
    const bodyElement = document.body
    const wasDark = htmlElement.classList.contains('dark')

    htmlElement.classList.remove('dark')
    htmlElement.dataset.forceLightLanding = 'true'
    bodyElement.dataset.forceLightLanding = 'true'

    return () => {
      delete htmlElement.dataset.forceLightLanding
      delete bodyElement.dataset.forceLightLanding
      if (wasDark) {
        htmlElement.classList.add('dark')
      }
    }
  }, [])

  // Listen for auth state changes and redirect authenticated users to dashboard
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }

    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const toggleAudience = () => {
    setAudience(prev => prev === 'students' ? 'universities' : 'students')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 glass-effect">
        <div className="container mx-auto px-6 flex h-20 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              {university?.logo_url && (
                <div className="flex items-center gap-2">
                  <Image
                    src={university.logo_url}
                    alt={`${university.name} logo`}
                    width={32}
                    height={32}
                    className="rounded object-contain"
                  />
                  <span className="text-xl font-bold text-gray-400">×</span>
                </div>
              )}
              <div className="flex items-center">
                <Image
                  src="/favicon-96x96.png"
                  alt="stu. logo"
                  width={32}
                  height={32}
                  className="rounded-50 -mb-2"
                  priority
                />
                <span className="text-4xl font-bold tracking-tight">stu.</span>
              </div>
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
            {audience === 'universities' && (
              <Link href="#pricing" className="text-base font-medium hover:text-primary transition-colors">
                Pricing
              </Link>
            )}
            <Link href="#faq" className="text-base font-medium hover:text-primary transition-colors">
              FAQ
            </Link>
            <Link href="/about-us" className="text-base font-medium hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md px-2 py-1">
              About Us
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/login">
              <Button variant="outline" className="border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium px-6 py-2.5 text-base transition-all">
                Sign In
              </Button>
            </Link>
            {audience === 'universities' ? (
              <Link href="/demo">
                <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium px-6 py-2.5 text-base">
                  Request a demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button className="bg-primary hover:bg-[var(--hover-green)] text-zinc-900 hover:text-white border-none font-medium px-6 py-2.5 text-base transition-all">
                  Get Started
                </Button>
              </Link>
            )}
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
              {audience === 'universities' && (
                <Link
                  href="#pricing"
                  className="text-base font-medium hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
              )}
              <Link
                href="#faq"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/about-us"
                className="text-base font-medium hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <div className="flex flex-col gap-4 pt-4 border-t border-zinc-100">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium">
                    Sign In
                  </Button>
                </Link>
                {audience === 'universities' ? (
                  <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium w-full py-2.5 text-base">
                      Request a demo
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-[var(--hover-green)] text-zinc-900 hover:text-white border-none font-medium transition-all">
                      Get Started
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden animate-fade-in">
          {/* Extended FAB below header - Slider style */}
          <div className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10">
            <div className="relative flex items-center gap-2 bg-zinc-100 rounded-full p-1 shadow-sm">
              <button
                onClick={() => setAudience('universities')}
                className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-all ${
                  audience === 'universities'
                    ? 'text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                aria-label="View for universities"
              >
                <Building2 className="h-5 w-5" />
                <span>For Universities</span>
              </button>
              <button
                onClick={() => setAudience('students')}
                className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-all ${
                  audience === 'students'
                    ? 'text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                aria-label="View for students"
              >
                <GraduationCap className="h-5 w-5" />
                <span>For Students</span>
              </button>
              {/* Sliding background indicator */}
              <div
                className="absolute top-1 bottom-1 bg-primary rounded-full shadow-md transition-all duration-300 ease-in-out"
                style={{
                  left: audience === 'universities' ? '4px' : '50%',
                  width: 'calc(50% - 4px)',
                }}
              />
            </div>
          </div>
          <div className="absolute inset-0 primary-glow opacity-50"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-5 max-w-full">
                <div className="space-y-2 max-w-full">
                  {audience === 'universities' ? (
                    <>
                      <h1 className="text-black text-[clamp(1.75rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-tight font-header">
                        <div className="sm:whitespace-nowrap">Revolutionize Academic Planning</div>
                        <div className="sm:whitespace-nowrap">at Your University</div>
                      </h1>
                      <p className="max-w-[600px] text-zinc-600 text-[clamp(1rem,1.5vw,2rem)] leading-snug font-body-medium">
                        Empower your students and advisors with an intelligent course scheduling and graduation mapping platform that ensures smoother degree progression and higher graduation rates.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-black text-[clamp(1.75rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-tight font-header">
                        <div className="sm:whitespace-nowrap">Your Degree, Your Schedule</div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          Seamless with
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
                      </h1>
                      <br />
                      <p className="max-w-[600px] text-zinc-600 text-[clamp(1rem,2vw,1.25rem)] leading-snug font-body-medium">
                        Never stress about course planning again.
                      </p>
                      <p className="max-w-[1400px] text-zinc-600 text-[clamp(1rem,2vw,1.25rem)] leading-snug font-body-medium">
                        stu helps you create the class schedule and graduation roadmap that fits your degree requirements and life commitments.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {audience === 'universities' ? (
                    <>
                      <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        <Link href="/demo" className="flex items-center">
                          Request a demo
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button className="bg-transparent border-2 border-primary text-zinc-900 hover:bg-primary/10 font-medium text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3">
                        Learn More
                      </Button>
                    </>
                  ) : (
                    <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-semibold px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
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
                  )}
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
                <h2 className="text-3xl font-header text-foreground tracking-tighter md:text-4xl/tight">
                  {audience === 'universities'
                    ? 'Comprehensive Academic Planning Solutions'
                    : 'Your Personal Academic Planner'}
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground font-body-medium md:text-xl">
                  {audience === 'universities'
                    ? "Help your students navigate their academic journey while providing valuable insights for your registrar's office."
                    : 'Everything you need to stay on track and graduate on time.'}
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {audience === 'universities' ? (
                  [
                    {
                      title: "Smart Degree Planning",
                      description: "Automate degree mapping with AI-powered course recommendations that account for prerequisites and custom academic rules.",
                      icon: "/icons/icons8-graduation-scroll-50.png",
                    },
                    {
                      title: "Enrollment Analytics",
                      description: "Track real-time demand to optimize course offerings, reduce bottlenecks, and improve seat utilization.",
                      icon: "/icons/icons8-analytics-60.png",
                    },
                    {
                      title: "Prerequisite Validation",
                      description: "Ensure students meet requirements automatically with built-in checks for prerequisites and co-requisites.",
                      icon: "/icons/icons8-validation-48.png",
                    },
                    {
                      title: "Student Success Tracking",
                      description: "Identify at-risk students early through real-time monitoring of academic progress and engagement.",
                      icon: "/icons/icons8-graduate-48.png",
                    },
                    {
                      title: "Integration Ready",
                      description: "Connect instantly with your SIS and existing infrastructure—no disruption, no duplicate data entry.",
                      icon: "/icons/icons8-integration-48.png",
                    },
                    {
                      title: "Customizable Policies",
                      description: "Tailor degree requirements, course rules, and exceptions to reflect your institution's unique policies.",
                      icon: "/icons/icons8-policies-48.png",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="group flex flex-col items-center gap-4 rounded-lg border border-border bg-white p-8 text-center transition-all hover:shadow-lg hover:bg-white/80"
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
                      <h3 className="text-xl font-header text-card-foreground">{feature.title}</h3>
                      <p className="text-muted-foreground font-body-medium">{feature.description}</p>
                    </div>
                  ))
                ) : (
                  [
                    {
                      title: "Smart Course Suggestions",
                      description: "Get tailored course recommendations based on your degree plan, completed credits, and personal preferences.",
                      icon: "/icons/icons8-course-assign-50.png",
                    },
                    {
                      title: "Automated Graduation Mapping",
                      description: "Plan your full academic path with a dynamic roadmap that adjusts automatically as you go.",
                      icon: "/stu_icon_black.png",
                    },
                    {
                      title: "Prerequisite Tracking",
                      description: "Automatically monitor prerequisite chains and course sequencing—stu flags gaps before they become problems.",
                      icon: "/icons/icons8-tracking-48.png",
                    },
                    {
                      title: "Schedule Optimization",
                      description: "Input your work and personal commitments—stu builds the optimal schedule without compromising your progress.",
                      icon: "/icons/icons8-schedule-48.png",
                    },
                    {
                      title: "Progress Tracking",
                      description: "Stay on track with real-time updates—stu dynamically adjusts your roadmap as requirements shift and courses are completed.",
                      icon: "/icons/icons8-in-progress-60.png",
                    },
                    {
                      title: "Mobile Friendly",
                      description: "Access your schedule, graduation plan and account info anywhere, anytime from any device.",
                      icon: "/icons/icons8-iphone-50.png",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.title}
                      className="group flex flex-col items-center gap-2 rounded-lg border p-6 text-center transition-all hover:shadow-lg hover:shadow-mint-300/10"
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
                  ))
                )}
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
          <h2 className="text-3xl font-header text-foreground tracking-tighter md:text-4xl/tight">Student Reviews</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Tyler S", state: "CA", text: '"The easiest way to schedule classes that would actually help with the major I\'m taking"' },
              { name: "Isaac B", state: "WA", text: '"I love it!"' },
              { name: "Zach W", state: "UT", text: '"This is great!"' },
            ].map((review) => (
              <div
                key={`${review.name}-${review.state}`}
                className="group flex flex-col items-center gap-4 rounded-lg border border-border bg-white p-8 text-center transition-all hover:shadow-lg hover:bg-white/80"
              >
                <h3 className="text-xl font-header text-card-foreground">
                  {review.name}, {review.state}
                </h3>
                <p className="text-muted-foreground font-body-medium">{review.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="relative py-20 overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 primary-glow opacity-40"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-header text-foreground tracking-tighter md:text-4xl/tight">
                  {audience === 'universities'
                    ? 'Ready to Transform Academic Planning?'
                    : 'Ready to Simplify Your Academic Journey?'}
                </h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground font-body-medium md:text-xl">
                  {audience === 'universities'
                    ? "Join leading universities who have improved graduation rates, empowered advisors, and increased student satisfaction with stu's planning platform."
                    : 'Join students across the country who are already using stu to plan their perfect semester.'}
                </p>
              </div>
              <div className="w-full max-w-md px-4">
                {audience === 'universities' ? (
                  <Link href="/demo">
                    <Button className="w-full bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium py-2.5 sm:py-3 text-base sm:text-lg">
                      Request a demo
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-4">
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
                )}
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
                {audience === 'universities'
                  ? 'Empowering Universities to Build Better Academic Futures'
                  : 'Making Academic Planning Simple and Smart'}
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
                {audience === 'universities' && (
                  <li>
                    <Link href="#pricing" className="text-muted-foreground hover:text-primary">
                      Pricing
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="#testimonials" className="text-muted-foreground hover:text-primary">
                    Testimonials
                  </Link>
                </li>
                {audience === 'universities' && (
                  <li>
                    <Link href="#faq" className="text-muted-foreground hover:text-primary">
                      FAQ
                    </Link>
                  </li>
                )}
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about-us" className="text-muted-foreground hover:text-primary">
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
