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
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {title}
          </CardTitle>
          <Select value={kpiKey} onValueChange={onKpiChange}>
            <SelectTrigger className="w-fit border-none bg-transparent px-0 shadow-none">
              <span className="sr-only">Change KPI</span>
            </SelectTrigger>
            <SelectContent>
              {kpiOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </CardContent>
    </Card>
  )
}