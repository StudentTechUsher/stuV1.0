'use client';

import { useState, RefObject } from 'react';
import { Pencil, Download, FileText } from 'lucide-react';
import { IconButton, Tooltip, CircularProgress, Snackbar, Alert } from '@mui/material';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { SCHEDULE_TABLE_MOCK, SCHEDULE_TABLE_HEADERS, type CourseScheduleRow } from './scheduleTableMockData';
import { captureCalendarPng, downloadDataUrl } from '@/utils/calendar-export';

interface CalendarExportButtonsProps {
  calendarRef: RefObject<HTMLDivElement | null>;
  semester: string;
  tableRows?: CourseScheduleRow[];
  showEditButton?: boolean;
}

/**
 * Export buttons for calendar widget
 * - Edit icon → routes to /semester-scheduler
 * - Download Calendar (PNG) → exports calendar visual
 * - Download Full Schedule (PDF) → calendar image + course table
 */
export function CalendarExportButtons({
  calendarRef,
  semester,
  tableRows,
  showEditButton = true,
}: CalendarExportButtonsProps) {
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  /**
   * Export calendar as PNG using html2canvas
   * Note: Some modern CSS features may not render correctly
   */
  const handleDownloadPng = async () => {
    if (!calendarRef.current) {
      setSnackbar({ open: true, message: 'Calendar not ready. Please try again.', severity: 'error' });
      return;
    }

    setExportingPng(true);
    try {
      const { dataUrl } = await captureCalendarPng(calendarRef.current);
      downloadDataUrl(dataUrl, `${semester.replace(/\s+/g, '-').toLowerCase()}-calendar.png`);

      setSnackbar({ open: true, message: 'Calendar exported successfully!', severity: 'success' });
    } catch (error) {
      console.error('Failed to export calendar as PNG:', error);
      setSnackbar({
        open: true,
        message: 'Could not export calendar image. Try using the PDF export instead.',
        severity: 'error'
      });
    } finally {
      setExportingPng(false);
    }
  };

  /**
   * Export full schedule as PDF with calendar image + course table
   */
  const handleDownloadPdf = async () => {
    setExportingPdf(true);

    try {
      if (!calendarRef.current) {
        setSnackbar({ open: true, message: 'Calendar not ready. Please try again.', severity: 'error' });
        return;
      }

      let calendarDataUrl: string;
      let calendarWidth: number;
      let calendarHeight: number;

      try {
        const capture = await captureCalendarPng(calendarRef.current);
        calendarDataUrl = capture.dataUrl;
        calendarWidth = capture.width;
        calendarHeight = capture.height;
      } catch (captureError) {
        console.error('Failed to capture calendar image for PDF:', captureError);
        setSnackbar({
          open: true,
          message: 'Calendar capture failed. PDF was not generated.',
          severity: 'error'
        });
        return;
      }

      const doc = new jsPDF('portrait', 'mm', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(semester, margin, 22);

      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Course Schedule', margin, 30);
      doc.setTextColor(0, 0, 0);

      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (calendarHeight * imgWidth) / calendarWidth;
      const maxImgHeight = pageHeight * 0.52;
      const finalImgHeight = Math.min(imgHeight, maxImgHeight);
      const finalImgWidth = (calendarWidth * finalImgHeight) / calendarHeight;

      const calendarStartY = 30;
      const calendarX = (pageWidth - finalImgWidth) / 2;
      doc.addImage(calendarDataUrl, 'PNG', calendarX, calendarStartY, finalImgWidth, finalImgHeight);
      let tableStartY = calendarStartY + finalImgHeight + 10;

      // Course Schedule Table Header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Course Details', margin, tableStartY);

      // Table headers
      const baseColWidths = [28, 12, 12, 34, 40, 26, 12, 20];
      const availableWidth = pageWidth - margin * 2;
      const baseWidthTotal = baseColWidths.reduce((sum, width) => sum + width, 0);
      const widthScale = availableWidth / baseWidthTotal;
      const colWidths = baseColWidths.map(width => width * widthScale);
      const headerY = tableStartY + 8;
      let x = margin;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(34, 34, 34); // Dark header
      doc.rect(margin, headerY - 5, pageWidth - margin * 2, 8, 'F');
      doc.setTextColor(255, 255, 255); // White text

      SCHEDULE_TABLE_HEADERS.forEach((header, i) => {
        doc.text(header, x + 2, headerY);
        x += colWidths[i];
      });

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      let y = headerY + 10;

      const tableData = tableRows ?? SCHEDULE_TABLE_MOCK;

      tableData.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (y > pageHeight - 25) {
          doc.addPage();
          y = 25;
        }

        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
        }

        x = margin;
        const values = [
          row.course,
          row.section,
          row.difficulty,
          row.instructor,
          row.schedule,
          row.location,
          String(row.credits),
          row.requirement,
        ];

        values.forEach((val, i) => {
          doc.text(val, x + 2, y);
          x += colWidths[i];
        });

        y += 8;
      });

      // Total credits row
      const totalCredits = tableData.reduce((sum, row) => sum + row.credits, 0);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(18, 249, 135); // Primary green
      doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Credits: ${totalCredits}`, margin + 2, y);

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated on ${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        margin,
        pageHeight - 10
      );
      doc.text('StuPlanning', pageWidth - margin - 20, pageHeight - 10);

      doc.save(`${semester.replace(/\s+/g, '-').toLowerCase()}-schedule.pdf`);
      setSnackbar({ open: true, message: 'Schedule PDF downloaded!', severity: 'success' });
    } catch (error) {
      console.error('Failed to export schedule PDF:', error);
      setSnackbar({ open: true, message: 'Failed to generate PDF. Please try again.', severity: 'error' });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {showEditButton && (
          <Tooltip title="Edit Schedule" arrow>
            <Link href="/semester-scheduler">
              <IconButton
                size="small"
                sx={{
                  color: 'var(--primary)',
                  '&:hover': { bgcolor: 'rgba(18, 249, 135, 0.1)' },
                }}
              >
                <Pencil size={16} />
              </IconButton>
            </Link>
          </Tooltip>
        )}

        {/* Download Calendar as PNG */}
        <Tooltip title="Download Calendar (PNG)" arrow>
          <span>
            <IconButton
              size="small"
              onClick={handleDownloadPng}
              disabled={exportingPng || exportingPdf}
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              {exportingPng ? (
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              ) : (
                <Download size={16} />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* Download Full Schedule as PDF */}
        <Tooltip title="Download Full Schedule (PDF)" arrow>
          <span>
            <IconButton
              size="small"
              onClick={handleDownloadPdf}
              disabled={exportingPng || exportingPdf}
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                '&.Mui-disabled': { color: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              {exportingPdf ? (
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              ) : (
                <FileText size={16} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {/* Feedback snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
