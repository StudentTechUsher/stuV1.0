import type { LucideIcon } from "lucide-react"
import {
  Accessibility,
  Building2,
  Globe,
  GraduationCap,
  Lock,
  Microscope,
  School,
  Shield,
} from "lucide-react"

export const landingPageBg = "#f7f3ec"

export type LandingNavLink = {
  href: string
  label: string
}

export const landingNavLinks: LandingNavLink[] = [
  { href: "#product", label: "Platform" },
  { href: "#solutions", label: "Solutions" },
  { href: "#case-studies", label: "Success Stories" },
]

export const landingPainPoints = [
  "Disconnected systems (SIS, degree audit, scheduling) slow decisions and create inconsistent guidance.",
  "Transfer and equivalency rules are hard to interpret—students and advisors spend hours reconciling requirements.",
  "Course bottlenecks delay progress and lengthen time-to-degree.",
  "Advising teams are overloaded; planning quality varies by person and program.",
  "Leadership lacks a clear view of pathways, demand, risk, and on-time completion.",
]

export type LandingReasonCard = {
  title: string
  desc: string
}

export const landingReasons: LandingReasonCard[] = [
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
]

export type LandingRoleCard = {
  title: string
  copy: string
}

export const landingRoleCards: LandingRoleCard[] = [
  {
    title: "For Provost & Student Success",
    copy: "Improve retention and time-to-degree with governed pathways across every program.",
  },
  {
    title: "For Registrar & Academic Affairs",
    copy: "Codify policy once. Keep requirements, substitutions, and transfer rules consistent.",
  },
  {
    title: "For CIO & IT",
    copy: "Integrate securely with clear data boundaries, access controls, and operational reliability.",
  },
]

export type LandingPillar = {
  header: string
  items: string[]
  linkText: string
}

export const landingPillars: LandingPillar[] = [
  {
    header: "Guide",
    items: [
      "Degree progress that's easy to understand",
      "Plans students can actually follow",
      "Clear requirements, substitutions, and audit alignment",
    ],
    linkText: "guided planning",
  },
  {
    header: "Support",
    items: [
      "Reduce advising logistics and repeat questions",
      "Context that helps advisors intervene sooner",
      "Shared visibility that scales across teams",
    ],
    linkText: "advising support",
  },
  {
    header: "Govern",
    items: [
      "Institution-wide policy consistency (programs, catalogs, transfer rules)",
      "Visibility into bottlenecks, demand, and risk cohorts",
      "Reporting built for provost/registrar/CIO decision-making",
    ],
    linkText: "governance",
  },
]

export type LandingInstitutionType = {
  icon: LucideIcon
  label: string
  desc: string
}

export const landingInstitutionTypes: LandingInstitutionType[] = [
  { icon: Building2, label: "Large Public", desc: "Multi-college systems" },
  { icon: GraduationCap, label: "Small Private", desc: "Boutique institutions" },
  { icon: School, label: "Community College", desc: "Open access/transfer" },
  { icon: Microscope, label: "R1 Research", desc: "Complex requirements" },
  { icon: Globe, label: "International", desc: "Global programs" },
]

export type LandingImplementationStep = {
  title: string
  copy: string
}

export const landingImplementationSteps: LandingImplementationStep[] = [
  {
    title: "Week 1:",
    copy: "SSO + read-only SIS connection (or secure exports).",
  },
  {
    title: "Week 2-3:",
    copy: "Map requirements and validate with real student pathways.",
  },
  {
    title: "Week 4+:",
    copy: "Pilot with advisors, iterate quickly, then scale.",
  },
]

export type LandingSecurityBadge = {
  icon: LucideIcon
  label: string
}

export const landingSecurityBadges: LandingSecurityBadge[] = [
  { icon: Lock, label: "SSO + RBAC" },
  { icon: Shield, label: "Privacy-first (FERPA-aligned)" },
  { icon: Accessibility, label: "Accessibility-first" },
]

export const landingSecurityHighlights = [
  "Safe and secure by design",
  "Protects student privacy",
  "Accessibility commitments",
  "Audit logs & role controls",
]

export const landingOutcomes = [
  "Retention & completion rates",
  "Time-to-degree & excess credits",
  "Advising efficiency & capacity",
  "Student satisfaction & engagement",
]

export type LandingFaq = {
  q: string
  a: string
}

export const landingFaqs: LandingFaq[] = [
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
