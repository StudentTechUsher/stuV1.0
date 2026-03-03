"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, GraduationCap, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Term, termYearToDate, termYearToSem } from "@/lib/gradDate"
import TranscriptUpload from "@/components/transcript/TranscriptUpload"

interface University {
  id: number
  name: string
}

export type OnboardingRole = "student" | "advisor"

interface OnboardingPageProps {
  universities: University[]
  userName?: string
  initialRole?: OnboardingRole
}

const STUDENT_ROLE: OnboardingRole = "student"
const ADVISOR_ROLE: OnboardingRole = "advisor"

const roleCopy: Record<OnboardingRole, { title: string; description: string }> = {
  student: {
    title: "Student onboarding",
    description: "Set your graduation timeline and upload your transcript to prefill courses.",
  },
  advisor: {
    title: "Advisor onboarding",
    description: "Set your institution and request advisor access for your dashboard.",
  },
}

function parseName(userName?: string): { firstName: string; lastName: string } {
  if (!userName) {
    return { firstName: "", lastName: "" }
  }

  const parts = userName.trim().split(/\s+/)
  if (parts.length === 0) {
    return { firstName: "", lastName: "" }
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

export function OnboardingPage({
  universities,
  userName,
  initialRole = STUDENT_ROLE,
}: Readonly<OnboardingPageProps>) {
  const router = useRouter()
  const initialName = useMemo(() => parseName(userName), [userName])

  const [selectedRole, setSelectedRole] = useState<OnboardingRole>(initialRole)
  const [selectedUniversity, setSelectedUniversity] = useState<string>("")
  const [firstName, setFirstName] = useState(initialName.firstName)
  const [lastName, setLastName] = useState(initialName.lastName)
  const [gradTerm, setGradTerm] = useState<Term | "">("")
  const [gradYear, setGradYear] = useState<number | "">(new Date().getFullYear())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcriptParsed, setTranscriptParsed] = useState(false)

  const requiresStudentFields = selectedRole === STUDENT_ROLE
  const submitDisabled =
    saving ||
    !selectedUniversity ||
    (requiresStudentFields && (!gradTerm || !gradYear || !transcriptParsed))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUniversity) {
      setError("Please select your university")
      return
    }

    if (requiresStudentFields) {
      if (!gradTerm || !gradYear) {
        setError("Please select your expected graduation semester")
        return
      }

      if (!transcriptParsed) {
        setError("Please upload and parse your transcript to continue")
        return
      }
    }

    setSaving(true)
    setError(null)

    try {
      const bodyData: Record<string, unknown> = {
        university_id: Number.parseInt(selectedUniversity, 10),
        role: selectedRole,
      }

      const cleanFirst = firstName.trim()
      const cleanLast = lastName.trim()

      if (cleanFirst) {
        bodyData.fname = cleanFirst
      }

      if (cleanLast) {
        bodyData.lname = cleanLast
      }

      if (requiresStudentFields) {
        bodyData.est_grad_sem = termYearToSem(gradTerm as Term, gradYear as number)
        bodyData.est_grad_date = termYearToDate(gradTerm as Term, gradYear as number)
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to complete onboarding")
      }

      router.push('/dashboard')
    } catch (err) {
      console.error("Onboarding error:", err)
      setError(err instanceof Error ? err.message : "Failed to complete onboarding")
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_34%),radial-gradient(circle_at_85%_0%,color-mix(in_srgb,var(--accent)_20%,transparent),transparent_38%),var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)]">
        <section className="rounded-3xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Welcome</p>
          <h1 className="mt-2 text-3xl font-header leading-tight sm:text-4xl">
            {userName ? `${userName},` : "Let's"} set up your stu account.
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Choose your onboarding path to unlock the right tools and access level from day one.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-primary" />
                Institution setup
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your account to the right university and matching catalog data.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Role-specific setup
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Students configure graduation details. Advisors submit access requests for approval.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-sm font-semibold">Choose your onboarding path</Label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[STUDENT_ROLE, ADVISOR_ROLE].map((role) => {
                  const selected = selectedRole === role
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role)
                        setError(null)
                      }}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border bg-background hover:border-primary/35"
                      )}
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {role === STUDENT_ROLE ? (
                          <GraduationCap className="h-4 w-4 text-primary" />
                        ) : (
                          <UserRound className="h-4 w-4 text-primary" />
                        )}
                        {roleCopy[role].title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{roleCopy[role].description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-university">University</Label>
              <Select value={selectedUniversity} onValueChange={setSelectedUniversity} disabled={saving}>
                <SelectTrigger id="onboarding-university">
                  <SelectValue placeholder="Select your university" />
                </SelectTrigger>
                <SelectContent>
                  {universities.map((uni) => (
                    <SelectItem key={uni.id} value={uni.id.toString()}>
                      {uni.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This keeps recommendations, requirements, and tools scoped to the right institution.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-first-name">First name (optional)</Label>
                <Input
                  id="onboarding-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-last-name">Last name (optional)</Label>
                <Input
                  id="onboarding-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  disabled={saving}
                />
              </div>
            </div>

            {requiresStudentFields ? (
              <>
                <div className="space-y-2">
                  <Label>Expected graduation semester</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={gradTerm} onValueChange={(value) => setGradTerm(value as Term)} disabled={saving}>
                      <SelectTrigger>
                        <SelectValue placeholder="Term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spring">Spring</SelectItem>
                        <SelectItem value="Summer">Summer</SelectItem>
                        <SelectItem value="Fall">Fall</SelectItem>
                        <SelectItem value="Winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={gradYear.toString()}
                      onValueChange={(value) => setGradYear(Number.parseInt(value, 10))}
                      disabled={saving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, index) => {
                          const year = new Date().getFullYear() + index
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This drives term-by-term planning, milestone pacing, and graduation forecasting.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Transcript upload</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload a transcript so we can prefill completed courses and match requirements.
                  </p>
                  <TranscriptUpload onParsingComplete={() => setTranscriptParsed(true)} />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Advisor access review
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  After submitting, your account will be routed for approval before advisor tools are enabled.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={submitDisabled}>
              {saving
                ? "Finishing setup..."
                : requiresStudentFields
                  ? "Complete Student Onboarding"
                  : "Request Advisor Access"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  )
}
