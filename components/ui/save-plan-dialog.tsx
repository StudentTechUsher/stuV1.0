"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { usePlanStore } from "@/lib/store"
import jsPDF from "jspdf"

interface SavePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SavePlanDialog({ open, onOpenChange }: SavePlanDialogProps) {
  const semesters = usePlanStore((state) => state.semesters)
  const [downloading, setDownloading] = React.useState(false)

  type PlanCourse = {
    code: string
    name: string
    credits: number
  }

  type PlanSummary = {
    courses: PlanCourse[]
    totalCredits: number
  }

  const generatePlanData = (): Record<string, PlanSummary> => {
    const plan: Record<string, PlanSummary> = {}
    semesters.forEach((semester) => {
      plan[semester.term] = {
        courses: semester.courses.map((c) => ({
          code: c.code,
          name: c.title,
          credits: c.credits,
        })),
        totalCredits: semester.courses.reduce((sum, c) => sum + c.credits, 0),
      }
    })
    return plan
  }

  const generatePdf = (planData: Record<string, PlanSummary>) => {
    const doc = new jsPDF()
    const marginTop = 20
    const marginLeft = 20
    const lineHeight = 6
    const pageHeight = doc.internal.pageSize.height
  
    let y = marginTop
    doc.setFontSize(16)
    doc.text("Four Year Plan", marginLeft, y)
    y += 10
  
    Object.entries(planData).forEach(([term, data]) => {
      if (y + 10 > pageHeight) {
        doc.addPage()
        y = marginTop
      }
  
      doc.setFontSize(14)
      doc.text(`${term}`, marginLeft, y)
      y += lineHeight + 2
  
      data.courses.forEach((course) => {
        if (y + lineHeight > pageHeight) {
          doc.addPage()
          y = marginTop
        }
  
        doc.setFontSize(12)
        doc.text(`- ${course.code}: ${course.name} (${course.credits} credits)`, marginLeft + 5, y)
        y += lineHeight
      })
  
      if (y + lineHeight > pageHeight) {
        doc.addPage()
        y = marginTop
      }
  
      doc.text(`Total Credits: ${data.totalCredits}`, marginLeft + 5, y)
      y += lineHeight + 4
    })
  
    return doc
  }  

  const handleDownload = () => {
    setDownloading(true)
    const planData = generatePlanData()
    const doc = generatePdf(planData)
    doc.save("four-year-plan.pdf")
    setDownloading(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Download Plan</DialogTitle>
          <DialogDescription className="text-center">
            Get a PDF version of your 4-year plan with one click.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <Button 
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
          >
            {downloading ? "Generating..." : "Download My Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
