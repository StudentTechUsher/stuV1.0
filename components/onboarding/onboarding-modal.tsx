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

interface University {
  id: number
  name: string
}

interface OnboardingModalProps {
  universities: University[]
  isOpen: boolean
  userName?: string
}

export function OnboardingModal({ universities, isOpen, userName }: OnboardingModalProps) {
  const router = useRouter()
  const [selectedUniversity, setSelectedUniversity] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUniversity) {
      setError("Please select your university")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university_id: parseInt(selectedUniversity, 10),
        }),
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
            Let's get you started. Just select your university to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            disabled={saving || !selectedUniversity}
          >
            {saving ? "Getting Started..." : "Get Started"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}