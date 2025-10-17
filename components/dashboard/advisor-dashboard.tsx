"use client"

import { useState, useEffect } from "react"
import { DashboardCard, type KpiOption } from "@/components/ui/dashboard-card"
import { DashboardChart, type ChartData } from "@/components/ui/dashboard-chart"
import { parseCSVData, calculateKPIs, type StudentKPIData, type KPICalculations } from "@/lib/utils/csv-parser"

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

export function AdvisorDashboard() {
  const [data, setData] = useState<StudentKPIData[]>([])
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
      })
      .catch(error => {
        console.error('Error loading CSV data:', error)
      })
  }, [])

  // Calculate KPIs for Business school only
  useEffect(() => {
    if (data.length > 0) {
      const calculatedKpis = calculateKPIs(data, "Business")
      setKpis(calculatedKpis)
    }
  }, [data])

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

  // Line chart data - simulating trend over months
  const trendChartData: ChartData[] = kpis ? [
    { name: "Jan", value: Math.max(0, kpis.studentsOnTrack - 5) },
    { name: "Feb", value: Math.max(0, kpis.studentsOnTrack - 3) },
    { name: "Mar", value: Math.max(0, kpis.studentsOnTrack - 1) },
    { name: "Apr", value: kpis.studentsOnTrack },
    { name: "May", value: Math.min(kpis.studentsOnTrack + 2, kpis.studentsOnTrack + kpis.studentsAtRisk) }
  ] : []

  // Horizontal bar chart data for credit distribution
  const creditDistributionData: ChartData[] = kpis ? [
    { name: "High Credits (>18)", value: kpis.studentsWithHighCredits },
    { name: "Transfer Students", value: kpis.transferStudents },
    { name: "International", value: kpis.internationalStudents },
    { name: "Requested Advising", value: kpis.requestedAdvising },
    { name: "With Holds", value: kpis.studentsWithHolds }
  ] : []

  // Graduation status donut chart data
  const graduationStatusData: ChartData[] = kpis ? [
    { name: "Submitted for Graduation", value: kpis.submittedGraduation },
    { name: "Not Submitted", value: kpis.notSubmittedGraduation },
    { name: "International w/o Plans", value: kpis.internationalWithoutPlans }
  ] : []

  return (
    <div className="space-y-6">
      {/* Header - No dropdown for advisors */}
      <div className="flex items-center justify-between">
        <h1 style={{
          fontFamily: '"Red Hat Display", sans-serif',
          fontWeight: 800,
          color: 'black',
          fontSize: '2rem',
          margin: 0,
          marginBottom: '24px'
        }}>Advisor Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Business School
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

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardChart
          title="Student Progress Trend"
          data={trendChartData}
          type="line"
          xAxisLabel="Month"
          yAxisLabel="Students On Track"
          description="Tracks the monthly trend of students who are on track to graduate, helping identify patterns and seasonal changes in student academic progress over time."
        />
        <DashboardChart
          title="Credit & Status Distribution"
          data={creditDistributionData}
          type="bar"
          description="Displays various student categories including those with high credit loads (>18 credits), transfer students, international students, those with account holds, and students requesting advising assistance."
        />
        <DashboardChart
          title="Graduation Status"
          data={graduationStatusData}
          type="donut"
          description="Shows the breakdown of students by graduation submission status: those who have submitted for graduation, those who haven't submitted yet, and international students without approved plans."
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