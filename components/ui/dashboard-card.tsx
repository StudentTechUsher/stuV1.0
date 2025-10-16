"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

export interface KpiOption {
  key: string
  label: string
  description?: string
}

interface DashboardCardProps {
  title: string
  value: string | number
  kpiKey: string
  kpiOptions: KpiOption[]
  onKpiChange: (kpiKey: string) => void
  className?: string
}

export function DashboardCard({
  title,
  value,
  kpiKey,
  kpiOptions,
  onKpiChange,
  className
}: DashboardCardProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Card className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className || ''}`}>
      {/* Top accent bar - subtle gradient */}
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-body-semi text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {title}
          </CardTitle>
          {/* Dropdown trigger - appears as settings icon */}
          <Select value={kpiKey} onValueChange={onKpiChange} open={isOpen} onOpenChange={setIsOpen}>
            <SelectTrigger
              className="group/trigger h-7 w-7 shrink-0 rounded-md border-none bg-transparent p-0 opacity-0 shadow-none transition-all duration-200 hover:bg-[color-mix(in_srgb,var(--muted)_50%,transparent)] group-hover:opacity-100 focus:opacity-100"
              aria-label="Change KPI metric"
            >
              <div className="flex h-full w-full items-center justify-center">
                <svg
                  className="h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200 group-hover/trigger:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
            </SelectTrigger>
            <SelectContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-[var(--muted-foreground)]">Select Metric</p>
              </div>
              {kpiOptions.map((option) => (
                <SelectItem key={option.key} value={option.key} className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-[var(--muted-foreground)]">{option.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pb-6 pt-0">
        <div className="font-header-bold text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </CardContent>
    </Card>
  )
}