"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface YearCardProps extends React.HTMLAttributes<HTMLDivElement> {
  yearNumber: number
  status: "current" | "upcoming" | "complete"
  label: string
  sublabel: string
  children: React.ReactNode
}

export function YearCard({
  yearNumber,
  status,
  label,
  sublabel,
  children,
  className,
  ...props
}: YearCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col p-6 gap-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full ${
          status === "complete" ? "bg-green-500" :
          status === "current" ? "bg-green-500" :
          "bg-zinc-300"
        }`} />
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm text-zinc-500">{sublabel}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </Card>
  )
} 