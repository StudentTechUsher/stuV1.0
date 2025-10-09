/**
 * About Us Page
 *
 * Comprehensive about page with hero, story, mission, team, design partners, values, and CTA.
 * Uses tokenized CSS variables throughout for consistent theming.
 *
 * Assumptions:
 * - Headshot images will be placed at /public/images/Jarom_Headshot.jpg and /public/images/Vin_Headshot.png
 * - Using placeholder images gracefully if not yet available
 * - Panel styling uses --card token (equivalent to --panel semantic)
 * - Shadow uses Tailwind shadow-lg (maps to --shadow-lg conceptually)
 */

import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { TeamCard } from "@/components/about/TeamCard"
import { Timeline } from "@/components/about/Timeline"
import { ArrowRight, CheckCircle, GraduationCap, Users, Building2 } from "lucide-react"
import { LandingNavbar } from "@/components/navigation/LandingNavbar"

export const metadata: Metadata = {
  title: "About Us | Stu - Student Success Platform",
  description:
    "Learn about Stu's mission to help students graduate efficiently, give advisors their time back, and equip administrators to plan smarter.",
  openGraph: {
    title: "About Us | Stu",
    description:
      "From a BYU classroom to campuses across the U.S. — discover how Stu is transforming academic planning.",
  },
}

const timelineData = [
  {
    period: "Fall 2023",
    description: "Classroom to concept at BYU Marriott",
  },
  {
    period: "2024",
    description: "Discovery sprints, advisor interviews, student surveys",
  },
  {
    period: "2025",
    description: "MVP demos, pilots, and integrations with existing SIS/LMS stacks",
  },
]

const values = [
  "Student-first outcomes",
  "Advisor-empowering by design",
  "Evidence-driven decisions",
  "Integrations, not rip-and-replace",
  "Security and compliance by default",
]

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Stu",
            url: "https://stu.com",
            logo: "https://stu.com/favicon-96x96.png",
            description:
              "Stu helps students graduate efficiently, gives advisors their time back, and equips administrators to plan smarter.",
            founders: [
              {
                "@type": "Person",
                name: "Jarom Pratt",
                jobTitle: "Co-founder & CEO",
                sameAs: "https://www.linkedin.com/in/jarom-pratt/",
              },
              {
                "@type": "Person",
                name: "Vin (Matt) Jones",
                jobTitle: "Co-founder & CTO",
                sameAs: "https://www.linkedin.com/in/vin-matt-jones/",
              },
            ],
            sameAs: [
              "https://www.linkedin.com/in/jarom-pratt/",
              "https://www.linkedin.com/in/vin-matt-jones/",
            ],
          }),
        }}
      />

      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/10 to-transparent" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--foreground)]">
              About Stu
            </h1>
            <p className="text-xl md:text-2xl text-[var(--muted-foreground)] leading-relaxed">
              We help students graduate efficiently, give advisors their time back, and equip
              administrators to plan smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/demo">
                <Button
                  size="lg"
                  className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--hover-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  Request a Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#design-partners">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  Become a Design Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] mb-6">
                From a BYU classroom to campuses across the U.S.
              </h2>
              <p className="text-lg text-[var(--foreground)] leading-relaxed mb-8">
                Stu began in Fall 2023 when co-founder Jarom Pratt pitched the idea in an
                Entrepreneurship course at BYU Marriott. What started as a class project turned into
                a mission: make academic planning effortless and truly student-centered, while
                empowering advisors and administrators. Over time, early prototypes, 70+ advisor
                interviews across 42 institutions, and hundreds of student surveys shaped the first
                Stu MVP: automated graduation mapping and a smarter semester scheduler that
                integrates with the systems schools already use.
              </p>

              <Timeline items={timelineData} />
            </div>
          </div>
        </div>
      </section>

      {/* Goal, Vision & Aim Section */}
      <section className="py-20 bg-gradient-to-b from-[var(--muted)]/30 to-transparent">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mb-4">
                Goal
              </h3>
              <p className="text-[var(--foreground)] leading-relaxed">
                To automate the scheduling and planning process for self-sufficient students,
                allowing them more time to focus on their studies, reduce frustration, and create
                plans and schedules with pinpoint accuracy.
              </p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mb-4">
                Vision
              </h3>
              <p className="text-[var(--foreground)] leading-relaxed">
                For STU to empower Academic Advisors by giving them more time to spend with
                students who are truly struggling. STU suggests when a student needs additional
                counsel from an academic advisor and gives specific instructions and contact
                information, empowering students and academic advisors to spend their time more
                effectively.
              </p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mb-4">
                Aim
              </h3>
              <p className="text-[var(--foreground)] leading-relaxed">
                Seamless, direct integration with any institution's existing scheduling software.
                This will drive down adoption costs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Serve Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] text-center mb-12">
              Who We Serve
            </h2>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Students */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-6 mx-auto">
                  <GraduationCap className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 text-center">
                  Students
                </h3>
                <p className="text-[var(--muted-foreground)] leading-relaxed text-center">
                  Create personalized, adaptable degree maps and schedules in minutes, not hours.
                </p>
              </div>

              {/* Advisors */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-6 mx-auto">
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 text-center">
                  Advisors
                </h3>
                <p className="text-[var(--muted-foreground)] leading-relaxed text-center">
                  Spend less time on mechanics; spend more time on the students who need you most.
                </p>
              </div>

              {/* Administrators */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 mb-6 mx-auto">
                  <Building2 className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 text-center">
                  Administrators
                </h3>
                <p className="text-[var(--muted-foreground)] leading-relaxed text-center">
                  Forecast class demand, improve retention, and protect & grow tuition revenue with
                  clearer planning signals.
                </p>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8 md:p-12">
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] mb-4 flex items-center gap-2">
                Why{" "}
                <Image
                  src="/stu_icon_black.png"
                  alt="stu icon"
                  width={32}
                  height={32}
                  className="inline-block"
                />
                <span>stu.</span>
              </h3>
              <p className="text-lg text-[var(--foreground)] leading-relaxed">
                <span className="font-bold">stu.</span> delivers the capabilities of{" "}
                <span className="font-bold">enterprise planning tools at a fraction of the price</span>{" "}
                — with <span className="font-bold">faster implementation</span> and{" "}
                <span className="font-bold">integrations-first design</span>. Schools get measurable
                outcomes in student satisfaction, advisor capacity, and enrollment efficiency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Team Section */}
      <section className="py-20 bg-gradient-to-b from-[var(--muted)]/30 to-transparent">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] text-center mb-12">
              The Team
            </h2>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <TeamCard
                name="Jarom Pratt"
                role="Co-founder & CEO"
                bio="Jarom started Stu with a team of BYU students in 2023 at the BYU Marriott School of Business. He leads product direction and go-to-market, working closely with advisors and administrators to translate real-world workflows into simple, scalable software."
                photo="/images/Jarom_Headshot.jpg"
                linkedin="https://www.linkedin.com/in/jarom-pratt/"
              />

              <TeamCard
                name="Vin (Matt) Jones"
                role="Co-founder & Product"
                bio="Vin focuses on product research and experience design. He has led advisor interviews, student studies, and MVP specs — shaping Stu's automation around the realities of campus systems and student behavior."
                photo="/images/Vin_Headshot.png"
                linkedin="https://www.linkedin.com/in/vin-matt-jones/"
              />
            </div>

            <p className="text-center text-[var(--muted-foreground)] text-lg">
              We're currently part of the Sandbox SB05 cohort, building Stu full-time.
            </p>
          </div>
        </div>
      </section>

      {/* Design Partners Section */}
      <section id="design-partners" className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] mb-6">
                Design Partners
                <span className="text-[var(--muted-foreground)] text-xl block mt-2">
                  Pilot with preferred pricing
                </span>
              </h2>

              <p className="text-lg text-[var(--foreground)] leading-relaxed mb-8">
                We're inviting a small group of universities and colleges to join as Design
                Partners. In exchange for preferred pricing in perpetuity, partners let us integrate
                with their systems and use anonymized operational data and workflows to refine our
                models.
              </p>

              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                What partners get:
              </h3>

              <ul className="space-y-3 mb-8">
                {[
                  "Grandfathered pricing and priority support",
                  "Direct input into roadmap and UX",
                  "Hands-on pilots (API integrations, test environments)",
                  "Faster time-to-value with minimal IT lift",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--foreground)] leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>

              <p className="text-lg text-[var(--foreground)] leading-relaxed">
                If you're interested in piloting Stu at your institution, we'd love to talk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-b from-[var(--muted)]/30 to-transparent">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] text-center mb-12">
              Our Values
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((value) => (
                <div
                  key={value}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-6 flex items-center gap-3"
                >
                  <CheckCircle className="w-6 h-6 text-[var(--primary)] flex-shrink-0" />
                  <span className="text-[var(--foreground)] font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] mb-6">
              Bring Stu to your campus
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo">
                <Button
                  size="lg"
                  className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--hover-green)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  Request a Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
