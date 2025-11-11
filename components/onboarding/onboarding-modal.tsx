"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Term, termYearToDate, termYearToSem } from "@/lib/gradDate"

interface University {
  id: number
  name: string
}

interface OnboardingModalProps {
  universities: University[]
  isOpen: boolean
  userName?: string
  initialFirstName?: string
  initialLastName?: string
}

type UserRole = "student" | "advisor" | "admin"

export function OnboardingModal({
  universities,
  isOpen,
  userName,
  initialFirstName = "",
  initialLastName = ""
}: Readonly<OnboardingModalProps>) {
  const router = useRouter()
  const [selectedUniversity, setSelectedUniversity] = useState<string>("")
  const [firstName, setFirstName] = useState<string>(initialFirstName)
  const [lastName, setLastName] = useState<string>(initialLastName)
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("")
  const [gradTerm, setGradTerm] = useState<Term | "">("")
  const [gradYear, setGradYear] = useState<number | "">(new Date().getFullYear())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsName = !initialFirstName || !initialLastName

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUniversity) {
      setError("Please select your university")
      return
    }

    if (!selectedRole) {
      setError("Please select your role")
      return
    }

    if (needsName && (!firstName.trim() || !lastName.trim())) {
      setError("Please enter your first and last name")
      return
    }

    if (selectedRole === "student" && (!gradTerm || !gradYear)) {
      setError("Please select your expected graduation semester")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const bodyData: Record<string, unknown> = {
        university_id: Number.parseInt(selectedUniversity, 10),
        fname: firstName.trim(),
        lname: lastName.trim(),
        role: selectedRole,
      };

      // Add graduation fields for students
      if (selectedRole === "student" && gradTerm && gradYear) {
        bodyData.est_grad_sem = termYearToSem(gradTerm, gradYear);
        bodyData.est_grad_date = termYearToDate(gradTerm, gradYear);
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save university selection")
      }

      // Refresh the page to update the UI
      router.refresh()
    } catch (err) {
      console.error("Onboarding error:", err)
      setError(err instanceof Error ? err.message : "Failed to complete onboarding")
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-[425px]" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-2xl font-header">
            Welcome{userName ? `, ${userName}` : ""}!
          </DialogTitle>
          <DialogDescription className="font-body-medium">
            Let's get you started. Select your role and university to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {needsName && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-body-medium">
                  First Name
                </Label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={saving}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-body"
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-body-medium">
                  Last Name
                </Label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={saving}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-body"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="role" className="font-body-medium">
              Your Role
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              disabled={saving}
            >
              <SelectTrigger id="role" className="font-body">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student" className="font-body">
                  Student
                </SelectItem>
                <SelectItem value="advisor" className="font-body">
                  Advisor
                </SelectItem>
                <SelectItem value="admin" className="font-body">
                  Administrator
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground font-body">
              Select the role that best describes you.
            </p>
          </div>

          {selectedRole === "student" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body-medium">
                  Expected Graduation Semester
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Select
                      value={gradTerm}
                      onValueChange={(value) => setGradTerm(value as Term)}
                      disabled={saving}
                    >
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spring" className="font-body">
                          Spring
                        </SelectItem>
                        <SelectItem value="Summer" className="font-body">
                          Summer
                        </SelectItem>
                        <SelectItem value="Fall" className="font-body">
                          Fall
                        </SelectItem>
                        <SelectItem value="Winter" className="font-body">
                          Winter
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Select
                      value={gradYear.toString()}
                      onValueChange={(value) => setGradYear(Number.parseInt(value, 10))}
                      disabled={saving}
                    >
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() + i;
                          return (
                            <SelectItem key={year} value={year.toString()} className="font-body">
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-body">
                  When do you expect to graduate?
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="university" className="font-body-medium">
              Your University
            </Label>
            <Select
              value={selectedUniversity}
              onValueChange={setSelectedUniversity}
              disabled={saving}
            >
              <SelectTrigger id="university" className="font-body">
                <SelectValue placeholder="Select your university" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((uni) => (
                  <SelectItem
                    key={uni.id}
                    value={uni.id.toString()}
                    className="font-body"
                  >
                    {uni.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground font-body">
              This helps us provide relevant courses and programs for you.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-body">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-body-medium"
            disabled={saving || !selectedUniversity || !selectedRole}
          >
            {saving ? "Getting Started..." : "Get Started"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}