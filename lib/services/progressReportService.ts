/**
 * Progress Report Service
 * Generates a clean report model from progress data and exports it as a PDF using jsPDF
 */

import { jsPDF } from 'jspdf';
import type { ProgressCategory, OverallProgress, Requirement, Subrequirement } from '@/components/progress-overview/types';

// ============================================================================
// Color Palette (static RGB values, no CSS vars)
// ============================================================================
const COLOR_PALETTE: Record<string, number[]> = {
  major: [18, 249, 135],
  ge: [33, 150, 243],
  religion: [156, 39, 176],
  minor: [255, 152, 0],
  elective: [96, 125, 139],
  other: [117, 117, 117],
};

// ============================================================================
// Type Definitions
// ============================================================================
export interface ReportModel {
  studentName: string;
  planName: string;
  generatedDate: string;
  overallPercent: number;
  overallCreditsDone: number;
  overallCreditsTotal: number;
  categories: ReportCategory[];
}

export interface ReportCategory {
  name: string;
  colorKey: string;
  percentComplete: number;
  creditsDone: number;
  creditsTotal: number;
  requirements: ReportRequirement[];
}

export interface ReportRequirement {
  number: string;
  title: string;
  description?: string;
  status: string;
  creditsDone: number;
  creditsTotal: number;
  subrequirements?: ReportRequirement[];
  courses?: ReportCourse[];
}

export interface ReportCourse {
  code: string;
  title: string;
  credits: number;
  status: string;
  term?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * AUTHORIZATION: PUBLIC
 * Maps category names to semantic color keys for consistent PDF styling.
 * Handles common major/minor/GE patterns from category names or tabLabels.
 */
export function resolveCategoryColorKey(name?: string, tabLabel?: string): string {
  const label = (tabLabel ?? name ?? '').toLowerCase();
  if (label.includes('gen ed') || label.includes('ge')) return 'ge';
  if (label.includes('religion') || label.includes('rel')) return 'religion';
  if (label.includes('minor')) return 'minor';
  if (label.includes('elective')) return 'elective';
  if (label.includes('major')) return 'major';
  return 'other';
}

/**
 * AUTHORIZATION: PUBLIC
 * Builds a flattened report model from UI progress data.
 * Converts ProgressCategory[] + OverallProgress into plain-object ReportModel
 * suitable for PDF generation without any React or CSS dependencies.
 *
 * @param input - Progress data from buildPlanProgress
 * @returns Normalized report model
 */
export function buildProgressReportModel(input: {
  categories: ProgressCategory[];
  overallProgress: OverallProgress;
  studentName: string;
  planName: string;
}): ReportModel {
  const { categories, overallProgress, studentName, planName } = input;

  const reportCategories = categories.map((cat) => ({
    name: cat.name,
    colorKey: resolveCategoryColorKey(cat.name, cat.tabLabel),
    percentComplete: cat.percentComplete,
    creditsDone: cat.completed,
    creditsTotal: cat.totalCredits,
    requirements: cat.requirements.map((req) => buildReportRequirement(req)),
  }));

  return {
    studentName,
    planName,
    generatedDate: new Date().toISOString().split('T')[0],
    overallPercent: overallProgress.percentComplete,
    overallCreditsDone: overallProgress.completedCredits,
    overallCreditsTotal: overallProgress.totalCredits,
    categories: reportCategories,
  };
}

/**
 * Recursively converts a Requirement (which may have subrequirements) to ReportRequirement.
 */
function buildReportRequirement(req: Requirement | Subrequirement): ReportRequirement {
  const reportReq: ReportRequirement = {
    number: String((req as any).id || ''),
    title: req.title || '',
    description: req.description,
    status: req.status || 'remaining',
    creditsDone: req.completed || 0,
    creditsTotal: req.total || 0,
  };

  if (req.subrequirements && req.subrequirements.length > 0) {
    reportReq.subrequirements = req.subrequirements.map((subreq: Subrequirement) =>
      buildReportRequirement({ ...subreq, id: subreq.id })
    );
  } else if (req.courses && req.courses.length > 0) {
    reportReq.courses = req.courses.map((course) => ({
      code: course.code || '',
      title: course.title || '',
      credits: course.credits || 0,
      status: course.status || 'remaining',
      term: course.term,
    }));
  }

  return reportReq;
}

// ============================================================================
// PDF Generation
// ============================================================================
const PAGE_WIDTH = 215.9; // A4 width (mm)
const PAGE_HEIGHT = 279.4; // A4 height (mm)
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Generates a PDF progress report using jsPDF and triggers browser download.
 *
 * @param reportModel - The report data
 */
export function generateProgressPDF(reportModel: ReportModel): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'A4',
  });

  let yPosition = MARGIN;

  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Progress Report', MARGIN, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(`Student: ${reportModel.studentName}`, MARGIN, yPosition);
  yPosition += 6;
  pdf.text(`Plan: ${reportModel.planName}`, MARGIN, yPosition);
  yPosition += 6;
  pdf.text(`Generated: ${reportModel.generatedDate}`, MARGIN, yPosition);
  yPosition += 12;

  // Overall Progress
  const overallPercentText = `${Math.round(reportModel.overallPercent)}%`;
  const overallCreditsText = `${reportModel.overallCreditsDone}/${reportModel.overallCreditsTotal} credits`;

  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Overall Progress', MARGIN, yPosition);
  yPosition += 8;

  pdf.setFontSize(12);
  pdf.text(overallPercentText, MARGIN, yPosition);
  yPosition += 6;
  pdf.setFontSize(10);
  pdf.text(overallCreditsText, MARGIN, yPosition);
  yPosition += 12;

  // Categories
  reportModel.categories.forEach((category) => {
    // Check if we need a new page
    if (yPosition > PAGE_HEIGHT - MARGIN - 20) {
      pdf.addPage();
      yPosition = MARGIN;
    }

    // Category header
    const color = COLOR_PALETTE[category.colorKey] || COLOR_PALETTE.other;
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(MARGIN, yPosition, CONTENT_WIDTH, 8, 'F');

    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.text(category.name, MARGIN + 2, yPosition + 6);

    yPosition += 10;

    // Category progress
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    const catProgress = `${Math.round(category.percentComplete)}% (${category.creditsDone}/${category.creditsTotal} credits)`;
    pdf.text(catProgress, MARGIN + 2, yPosition);
    yPosition += 6;

    // Requirements (simplified for space)
    pdf.setFontSize(9);
    category.requirements.slice(0, 3).forEach((req) => {
      if (yPosition > PAGE_HEIGHT - MARGIN - 15) {
        pdf.addPage();
        yPosition = MARGIN;
      }
      const reqText = `• ${req.title} (${req.creditsDone}/${req.creditsTotal} credits)`;
      pdf.text(reqText, MARGIN + 4, yPosition);
      yPosition += 5;
    });

    if (category.requirements.length > 3) {
      pdf.text(`... and ${category.requirements.length - 3} more requirements`, MARGIN + 4, yPosition);
      yPosition += 5;
    }

    yPosition += 6;
  });

  // Trigger download
  const filename = `progress-report-${reportModel.studentName.replace(/\s+/g, '_')}.pdf`;
  pdf.save(filename);
}
