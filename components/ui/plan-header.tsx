"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import majors from "@/data/majors.json"
import { cn } from "@/lib/utils"

interface PlanHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedMajor: string
  onMajorChange: (major: string) => void
  useCreditLimit: boolean
  onUseCreditLimitChange: (useCreditLimit: boolean) => void
  creditLimit: number
  onCreditLimitChange: (limit: number) => void
  graduationTerm: string
  onGraduationTermChange: (term: string) => void
}

export function PlanHeader({
  selectedMajor,
  onMajorChange,
  useCreditLimit,
  onUseCreditLimitChange,
  creditLimit,
  onCreditLimitChange,
  graduationTerm,
  onGraduationTermChange,
  className,
}: PlanHeaderProps) {
  const terms = [
    "Fall 2024",
    "Winter 2025",
    "Fall 2025",
    "Winter 2026",
    "Fall 2026",
    "Winter 2027",
    "Fall 2027",
    "Winter 2028"
  ]

  const handleGraduationTermChange = (term: string) => {
    onGraduationTermChange(term);
    if (useCreditLimit) {
      onUseCreditLimitChange(false);
    }
  };

  const handleCreditLimitChange = (limit: string) => {
    onCreditLimitChange(Number(limit));
    if (!useCreditLimit) {
      onUseCreditLimitChange(true);
      onGraduationTermChange("");
    }
  };

  return (
    <div className={cn("flex items-center justify-center gap-6 flex-1", className)}>
      <Input
        type="text"
        placeholder="Plan Name"
        className="w-[200px] bg-white"
      />
      <Select value={selectedMajor} onValueChange={onMajorChange}>
        <SelectTrigger className="w-[200px] bg-white cursor-pointer">
          <SelectValue placeholder="Proposed Major" />
        </SelectTrigger>
        <SelectContent>
          {majors.map((major) => (
            <SelectItem key={major.id} value={major.name}>
              {major.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={graduationTerm} onValueChange={handleGraduationTermChange}>
        <SelectTrigger className="w-[200px] bg-white cursor-pointer">
          <SelectValue placeholder="Proposed Graduation" />
        </SelectTrigger>
        <SelectContent>
          {terms.map((term) => (
            <SelectItem key={term} value={term}>
              {term}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-zinc-500">or</span>

      <Select 
        value={useCreditLimit ? creditLimit.toString() : ""} 
        onValueChange={handleCreditLimitChange}
      >
        <SelectTrigger className="w-[200px] bg-white cursor-pointer">
          <SelectValue placeholder="Semester Credit Limit" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 7 }, (_, i) => i + 12).map((limit) => (
            <SelectItem key={limit} value={limit.toString()}>
              {limit} Credits
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 
