export interface StudentKPIData {
  student_id: string
  has_active_plan: boolean
  requested_plan_approval: boolean
  on_track_to_graduate: boolean
  account_hold: boolean
  grad_plan_deviation_percent: number
  credits_planned: number
  is_transfer: boolean
  is_international: boolean
  has_approved_plan: boolean
  submitted_graduation: boolean
  requested_advising: boolean
  college: string
  advisor_meeting_recent: boolean
}

export function parseCSVData(csvContent: string): StudentKPIData[] {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    const values = line.split(',')
    return {
      student_id: values[0],
      has_active_plan: values[1] === 'True',
      requested_plan_approval: values[2] === 'True',
      on_track_to_graduate: values[3] === 'True',
      account_hold: values[4] === 'True',
      grad_plan_deviation_percent: parseFloat(values[5]),
      credits_planned: parseInt(values[6]),
      is_transfer: values[7] === 'True',
      is_international: values[8] === 'True',
      has_approved_plan: values[9] === 'True',
      submitted_graduation: values[10] === 'True',
      requested_advising: values[11] === 'True',
      college: values[12],
      advisor_meeting_recent: values[13] === 'True'
    }
  })
}

export interface KPICalculations {
  studentsWithoutActivePlan: number
  studentsWithActivePlans: number
  studentsRequestedApproval: number
  studentsOnTrack: number
  studentsAtRisk: number
  studentsWithHolds: number
  studentsOffTrack: number
  studentsWithHighCredits: number
  transferStudents: number
  internationalStudents: number
  internationalWithoutPlans: number
  submittedGraduation: number
  notSubmittedGraduation: number
  requestedAdvising: number
}

export function calculateKPIs(data: StudentKPIData[], collegeFilter?: string): KPICalculations {
  const filteredData = collegeFilter
    ? data.filter(student => student.college === collegeFilter)
    : data

  return {
    studentsWithoutActivePlan: filteredData.filter(s => !s.has_active_plan).length,
    studentsWithActivePlans: filteredData.filter(s => s.has_active_plan).length,
    studentsRequestedApproval: filteredData.filter(s => s.requested_plan_approval).length,
    studentsOnTrack: filteredData.filter(s => s.on_track_to_graduate).length,
    studentsAtRisk: filteredData.filter(s => !s.on_track_to_graduate && s.has_active_plan).length,
    studentsWithHolds: filteredData.filter(s => s.account_hold).length,
    studentsOffTrack: filteredData.filter(s => s.grad_plan_deviation_percent > 10).length,
    studentsWithHighCredits: filteredData.filter(s => s.credits_planned > 18).length,
    transferStudents: filteredData.filter(s => s.is_transfer).length,
    internationalStudents: filteredData.filter(s => s.is_international).length,
    internationalWithoutPlans: filteredData.filter(s => s.is_international && !s.has_approved_plan).length,
    submittedGraduation: filteredData.filter(s => s.submitted_graduation).length,
    notSubmittedGraduation: filteredData.filter(s => !s.submitted_graduation).length,
    requestedAdvising: filteredData.filter(s => s.requested_advising).length
  }
}

export function getColleges(data: StudentKPIData[]): string[] {
  return [...new Set(data.map(student => student.college))].sort()
}