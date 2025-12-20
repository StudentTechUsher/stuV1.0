"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Menu, X, GraduationCap, Building2, HelpCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useLayoutEffect } from "react"
import { useUniversityTheme } from "@/contexts/university-theme-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type Audience = 'students' | 'universities'

export function UnifiedLandingClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [audience, setAudience] = useState<Audience>('students')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const { university } = useUniversityTheme()
  const router = useRouter()

  // Force the landing page to always render in light mode, regardless of user preference.
  // useLayoutEffect runs synchronously before browser paint, ensuring this runs
  // before DarkModeProvider's useEffect applies any theme changes.
  useLayoutEffect(() => {
    const htmlElement = document.documentElement
    const bodyElement = document.body
    const wasDark = htmlElement.classList.contains('dark')

    htmlElement.classList.remove('dark')
    htmlElement.dataset.forceLightLanding = 'true'
    bodyElement.dataset.forceLightLanding = 'true'

    // Enable smooth scrolling for anchor links
    htmlElement.style.scrollBehavior = 'smooth'

    return () => {
      delete htmlElement.dataset.forceLightLanding
      delete bodyElement.dataset.forceLightLanding
      htmlElement.style.scrollBehavior = ''
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
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Auth session error:', error)
          setAuthError('Unable to verify your session. Please try signing in again.')
          return
        }
        if (session) {
          setIsRedirecting(true)
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Unexpected auth error:', error)
        setAuthError('An unexpected error occurred. Please refresh the page and try again.')
      }
    }

    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthError(null)
      }
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setIsRedirecting(true)
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-zinc-900 focus:px-4 focus:py-2 focus:rounded-md focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 relative z-50">
          <div className="container mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">{authError}</p>
              </div>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

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
                  <span className="text-xl font-bold text-zinc-400 dark:text-zinc-600">×</span>
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
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="#features" className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2">
              Features
            </Link>
            {audience === 'universities' && (
              <>
                {/* TODO: Add pricing page and uncomment link */}
                <Link href="/security" className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2">
                  Security & Compliance
                </Link>
              </>
            )}
            <Link href="#faq" className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2">
              FAQ
            </Link>
            <Link href="/about-us" className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
              About Us
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            <Link href="/login">
              <Button variant="outline" className="border-zinc-700 text-zinc-700 hover:bg-zinc-700 hover:text-white font-medium px-6 py-2.5 text-base transition-all">
                Sign In
              </Button>
            </Link>
            {audience === 'universities' ? (
              <Link href="/demo">
                <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium px-6 py-2.5 text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  Request a demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button className="bg-primary hover:bg-[var(--hover-green)] text-zinc-900 hover:text-white border-none font-medium px-6 py-2.5 text-base transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-zinc-100">
            <div className="container mx-auto px-6 py-6 flex flex-col gap-3">
              <Link
                href="#features"
                className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              {audience === 'universities' && (
                <>
                  {/* TODO: Add pricing page and uncomment link */}
                  <Link
                    href="/security"
                    className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Security & Compliance
                  </Link>
                </>
              )}
              <Link
                href="#faq"
                className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/about-us"
                className="text-base font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-all rounded-md px-3 py-2"
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
                    <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium w-full py-2.5 text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      Request a demo
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-[var(--hover-green)] text-zinc-900 hover:text-white border-none font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden animate-fade-in border-b-2 border-zinc-300" style={{ backgroundColor: '#d0d0d0' }}>
          {/* Extended FAB below header - Slider style */}
          <div className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10">
            <div className="relative flex items-center gap-2 bg-zinc-200 rounded-full p-1 shadow-lg border border-zinc-300">
              <button
                onClick={() => setAudience('students')}
                className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-all cursor-pointer ${
                  audience === 'students'
                    ? 'text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                aria-label="View for students"
              >
                <GraduationCap className="h-5 w-5" />
                <span>For Students</span>
              </button>
              <button
                onClick={() => setAudience('universities')}
                className={`relative z-10 flex items-center gap-2 rounded-full px-6 py-2.5 font-semibold transition-all cursor-pointer ${
                  audience === 'universities'
                    ? 'text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
                aria-label="View for universities"
              >
                <Building2 className="h-5 w-5" />
                <span>For Universities</span>
              </button>
              {/* Sliding background indicator */}
              <div
                className="absolute top-1 bottom-1 bg-zinc-800 rounded-full shadow-md transition-all duration-300 ease-in-out"
                style={{
                  left: audience === 'students' ? '4px' : '50%',
                  width: 'calc(50% - 4px)',
                }}
              />
            </div>
          </div>
          <div className="container px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-5 max-w-full">
                <div className="space-y-2 max-w-full">
                  {audience === 'universities' ? (
                    <>
                      <h1 className="text-zinc-900 dark:text-zinc-100 text-[clamp(1.75rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-tight font-header">
                        <div className="sm:whitespace-nowrap">Boost Graduation Rates</div>
                        <div className="sm:whitespace-nowrap">Through Intelligent Course Planning</div>
                      </h1>
                      <p className="max-w-[600px] text-zinc-700 dark:text-zinc-300 text-[clamp(1rem,1.5vw,1.5rem)] leading-snug font-body-medium">
                        Our AI-powered planning tools reduce advisor bottlenecks and improve student outcomes with a career-centric focus.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-zinc-900 dark:text-zinc-100 text-[clamp(1.75rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-tight font-header">
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
                      <p className="max-w-[700px] text-zinc-700 dark:text-zinc-300 text-[clamp(1rem,1.5vw,1.35rem)] leading-relaxed font-body-medium mt-6">
                        Too many course choices and not enough transparency? Not sure what kind of career you&apos;ll have after graduation? Stu helps you answer these questions with graduation maps customized to your goals!
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {audience === 'universities' ? (
                    <div className="flex flex-col items-start gap-2">
                      <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        <Link href="/demo" className="flex items-center">
                          Request a demo
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                        Schedule a personalized demo to see how stu can transform your institution&apos;s academic planning
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      <Button className="bg-primary hover:bg-primary-hover text-zinc-900 border-none font-medium px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                        <Link href="/signup" className="flex items-center">
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
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                        Create your free account and start building your personalized graduation plan in minutes
                      </p>
                    </div>
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
        <section id="features" className="py-20 bg-gradient-to-b from-mint-200 via-mint-100 to-mint-50 flex flex-col items-center justify-center text-center border-b-2 border-zinc-300">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center md:gap-8">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-3xl font-header text-foreground tracking-tighter md:text-4xl/tight">
                    {audience === 'universities'
                      ? 'Comprehensive Academic Planning Solutions'
                      : 'Your Personal Academic Planner'}
                  </h2>
                  <div className="relative">
                    <button
                      onMouseEnter={() => setActiveTooltip('features')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() => setActiveTooltip(activeTooltip === 'features' ? null : 'features')}
                      className="text-zinc-500 hover:text-primary transition-colors cursor-help"
                      aria-label="More information about features"
                    >
                      <HelpCircle className="h-6 w-6" />
                    </button>
                    {activeTooltip === 'features' && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm rounded-lg p-3 shadow-xl z-10">
                        <p>
                          {audience === 'universities'
                            ? 'Our platform integrates seamlessly with your existing systems to provide real-time insights and automated planning tools.'
                            : 'All features are included in your free account. No credit card required to get started.'}
                        </p>
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-zinc-900 dark:border-b-zinc-100"></div>
                      </div>
                    )}
                  </div>
                </div>
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
                      className="group flex flex-col items-center gap-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-8 text-center shadow-md hover:shadow-2xl hover:border-primary/30 transition-all duration-300"
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
                      className="group flex flex-col items-center gap-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-8 text-center shadow-md hover:shadow-2xl hover:border-primary/30 transition-all duration-300"
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
                      <h3 className="text-xl font-header text-zinc-900 dark:text-zinc-100">{feature.title}</h3>
                      <p className="text-zinc-700 dark:text-zinc-300 font-body-medium leading-relaxed">{feature.description}</p>
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
          className="py-20 flex flex-col items-center justify-center text-center border-b-2 border-zinc-300"
          style={{ backgroundColor: '#d0d0d0' }}
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-3xl font-header text-foreground tracking-tighter md:text-4xl/tight">Student Reviews</h2>
                <div className="relative">
                  <button
                    onMouseEnter={() => setActiveTooltip('testimonials')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === 'testimonials' ? null : 'testimonials')}
                    className="text-zinc-500 hover:text-primary transition-colors cursor-help"
                    aria-label="More information about reviews"
                  >
                    <HelpCircle className="h-6 w-6" />
                  </button>
                  {activeTooltip === 'testimonials' && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-sm rounded-lg p-3 shadow-xl z-10">
                      <p>
                        Real feedback from students who have used stu to successfully plan their academic journey and graduate on time.
                      </p>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-zinc-900 dark:border-b-zinc-100"></div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xl text-zinc-700 dark:text-zinc-300 font-body-medium">Here&apos;s what students are saying</p>
            </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Tyler S", state: "CA", text: '"The easiest way to schedule classes that would actually help with the major I\'m taking"' },
              { name: "Isaac B", state: "WA", text: '"I love it!"' },
              { name: "Zach W", state: "UT", text: '"This is great!"' },
            ].map((review) => (
              <div
                key={`${review.name}-${review.state}`}
                className="group flex flex-col items-center gap-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-8 text-center shadow-md hover:shadow-2xl hover:border-primary/30 transition-all duration-300"
              >
                <h3 className="text-xl font-header text-zinc-900 dark:text-zinc-100">
                  {review.name}, {review.state}
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 font-body-medium leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* CTA Section - Only shown for universities */}
        {audience === 'universities' && (
          <section id="cta" className="relative py-24 overflow-hidden bg-gradient-to-br from-mint-300 via-mint-400 to-mint-600 flex flex-col items-center justify-center text-center border-b-2 border-zinc-300">
            <div className="container px-4 md:px-6 relative">
              <div className="flex flex-col items-center justify-center gap-6 text-center md:gap-10">
                <div className="space-y-4">
                  <h2 className="text-3xl font-header text-zinc-900 dark:text-zinc-100 tracking-tighter md:text-5xl/tight font-bold">
                    Ready to Transform Academic Planning?
                  </h2>
                  <p className="mx-auto max-w-[700px] text-zinc-800 dark:text-zinc-200 font-body-medium md:text-xl leading-relaxed">
                    Join leading universities who have improved graduation rates, empowered advisors, and increased student satisfaction with stu&apos;s planning platform.
                  </p>
                </div>
                <div className="w-full max-w-md px-4">
                  <Link href="/demo">
                    <Button className="w-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-100 dark:text-zinc-900 border-none font-semibold py-3 sm:py-4 text-base sm:text-lg shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105">
                      Request a demo
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* TODO: Add student CTA section with email signup form */}
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
                {/* TODO: Add pricing page and uncomment link */}
                <li>
                  <Link href="#testimonials" className="text-muted-foreground hover:text-primary">
                    Testimonials
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="text-muted-foreground hover:text-primary">
                    FAQ
                  </Link>
                </li>
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

      {/* Loading overlay when redirecting */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-black/60 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Redirecting to dashboard...</p>
          </div>
        </div>
      )}
    </div>
  )
}
