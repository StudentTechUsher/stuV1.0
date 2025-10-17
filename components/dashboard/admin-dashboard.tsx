"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardCard, type KpiOption } from "@/components/ui/dashboard-card"
import { DashboardChart, type ChartData } from "@/components/ui/dashboard-chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parseCSVData, calculateKPIs, getColleges, type StudentKPIData, type KPICalculations } from "@/lib/utils/csv-parser"

const KPI_OPTIONS: KpiOption[] = [
  { key: "studentsWithoutActivePlan", label: "Without Active Plans", description: "Students without a completed active grad plan" },
  { key: "studentsWithActivePlans", label: "With Active Plans", description: "Students with active grad plans" },
  { key: "studentsRequestedApproval", label: "Requested Approval", description: "Students who have requested grad plan approval" },
  { key: "studentsOnTrack", label: "On Track", description: "Students on track to graduate this year" },
  { key: "studentsAtRisk", label: "At Risk", description: "Students who should be on track but are missing something" },
  { key: "studentsWithHolds", label: "With Holds", description: "Students with account holds" },
  { key: "studentsOffTrack", label: "Off Track", description: "Students >10% off from approved grad plan" },
  { key: "studentsWithHighCredits", label: "High Credits", description: "Students with >18 planned credits" },
  { key: "transferStudents", label: "Transfer Students", description: "Incoming transfer students" },
  { key: "internationalStudents", label: "International", description: "International students" },
  { key: "internationalWithoutPlans", label: "International w/o Plans", description: "International students without approved plans" },
  { key: "submittedGraduation", label: "Submitted Graduation", description: "Students submitted for graduation" },
  { key: "notSubmittedGraduation", label: "Not Submitted", description: "Students not submitted for graduation" },
  { key: "requestedAdvising", label: "Requested Advising", description: "Students requesting advising assistance" }
]

export function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<StudentKPIData[]>([])
  const [selectedCollege, setSelectedCollege] = useState<string>("all")
  const [colleges, setColleges] = useState<string[]>([])
  const [kpis, setKpis] = useState<KPICalculations | null>(null)
  const [selectedKpis, setSelectedKpis] = useState({
    card1: "studentsWithoutActivePlan",
    card2: "studentsWithActivePlans",
    card3: "studentsOnTrack",
    card4: "studentsAtRisk",
    card5: "studentsRequestedApproval",
    card6: "studentsWithHolds",
    card7: "studentsOffTrack",
    card8: "studentsWithHighCredits",
    card9: "transferStudents",
    card10: "internationalStudents",
    card11: "requestedAdvising",
    card12: "submittedGraduation",
    card13: "notSubmittedGraduation"
  })

  // Load CSV data on component mount
  useEffect(() => {
    fetch('/Mock_Student_KPI_Data.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.text()
      })
      .then(csvContent => {
        const parsedData = parseCSVData(csvContent)
        setData(parsedData)
        setColleges(getColleges(parsedData))
      })
      .catch(error => {
        console.error('Error loading CSV data:', error)
      })
  }, [])

  // Recalculate KPIs when data or college filter changes
  useEffect(() => {
    if (data.length > 0) {
      const collegeFilter = selectedCollege === "all" ? undefined : selectedCollege
      const calculatedKpis = calculateKPIs(data, collegeFilter)
      setKpis(calculatedKpis)
    }
  }, [data, selectedCollege])

  const getKpiValue = (kpiKey: string): number => {
    if (!kpis) return 0
    return kpis[kpiKey as keyof KPICalculations]
  }

  const getKpiTitle = (kpiKey: string): string => {
    const option = KPI_OPTIONS.find(opt => opt.key === kpiKey)
    return option?.label || kpiKey
  }

  // Chart data
  const gradPlanChartData: ChartData[] = kpis ? [
    { name: "Approved Plans", value: kpis.studentsWithActivePlans },
    { name: "No Active Plan", value: kpis.studentsWithoutActivePlan },
    { name: "Requested Approval", value: kpis.studentsRequestedApproval }
  ] : []

  const trackingChartData: ChartData[] = kpis ? [
    { name: "On Track", value: kpis.studentsOnTrack },
    { name: "At Risk", value: kpis.studentsAtRisk }
  ] : []

  return (
    <div className="space-y-6">
      {/* Modern Header with College Selector and Forecasting Tool */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="font-header text-3xl font-bold text-[var(--foreground)]">
            Admin Dashboard
          </h1>
          <p className="font-body mt-1.5 text-sm text-[var(--muted-foreground)]">
            Institution-wide analytics and insights
          </p>
        </div>

        {/* Actions and Filter Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Forecasting Tool Button */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/admin/forecast')}
            className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] px-4 py-2.5 font-body-semi text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            aria-label="Open forecasting tool"
          >
            <svg className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Forecast</span>
          </button>

          {/* College Selector */}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
            <svg className="h-4 w-4 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-body text-xs font-medium text-[var(--muted-foreground)]">View:</span>
            <Select value={selectedCollege} onValueChange={setSelectedCollege}>
              <SelectTrigger className="h-auto border-none bg-transparent p-0 font-body-semi text-sm font-semibold text-[var(--foreground)] shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Institution-wide</SelectItem>
                {colleges.map((college) => (
                  <SelectItem key={college} value={college}>
                    {college}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards - Row 1: 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title={getKpiTitle(selectedKpis.card1)}
          value={getKpiValue(selectedKpis.card1)}
          kpiKey={selectedKpis.card1}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card1: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card2)}
          value={getKpiValue(selectedKpis.card2)}
          kpiKey={selectedKpis.card2}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card2: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card3)}
          value={getKpiValue(selectedKpis.card3)}
          kpiKey={selectedKpis.card3}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card3: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card4)}
          value={getKpiValue(selectedKpis.card4)}
          kpiKey={selectedKpis.card4}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card4: kpiKey }))}
        />
      </div>
    
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChart
          title="Graduation Plan Status"
          data={gradPlanChartData}
          type="donut"
          description="Shows the distribution of students based on their graduation plan status: those with approved plans, students without active plans, and those who have requested approval for their plans."
        />
        <DashboardChart
          title="Student Progress Tracking"
          data={trackingChartData}
          type="bar"
          description="Compares students who are on track to graduate this year versus those who are at risk due to missing requirements or falling behind their approved graduation plans."
        />
      </div>

      {/* KPI Cards - Row 3: 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title={getKpiTitle(selectedKpis.card7)}
          value={getKpiValue(selectedKpis.card7)}
          kpiKey={selectedKpis.card7}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card7: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card8)}
          value={getKpiValue(selectedKpis.card8)}
          kpiKey={selectedKpis.card8}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card8: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card9)}
          value={getKpiValue(selectedKpis.card9)}
          kpiKey={selectedKpis.card9}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card9: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card10)}
          value={getKpiValue(selectedKpis.card10)}
          kpiKey={selectedKpis.card10}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card10: kpiKey }))}
        />
      </div>

      {/* KPI Cards - Row 4: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title={getKpiTitle(selectedKpis.card11)}
          value={getKpiValue(selectedKpis.card11)}
          kpiKey={selectedKpis.card11}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card11: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card12)}
          value={getKpiValue(selectedKpis.card12)}
          kpiKey={selectedKpis.card12}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card12: kpiKey }))}
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card13)}
          value={getKpiValue(selectedKpis.card13)}
          kpiKey={selectedKpis.card13}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card13: kpiKey }))}
        />
      </div>

      {/* KPI Cards - Row 2: 2 big cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard
          title={getKpiTitle(selectedKpis.card5)}
          value={getKpiValue(selectedKpis.card5)}
          kpiKey={selectedKpis.card5}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card5: kpiKey }))}
          className="lg:col-span-1"
        />
        <DashboardCard
          title={getKpiTitle(selectedKpis.card6)}
          value={getKpiValue(selectedKpis.card6)}
          kpiKey={selectedKpis.card6}
          kpiOptions={KPI_OPTIONS}
          onKpiChange={(kpiKey) => setSelectedKpis(prev => ({ ...prev, card6: kpiKey }))}
          className="lg:col-span-1"
        />
      </div>
      <div className="h-28" /> {/* Spacer at bottom */}
    </div>
  )
}