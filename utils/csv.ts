/**
 * Assumptions:
 * - Standard CSV format with headers
 * - Handles quotes and commas in values
 */

import type { WithdrawalRow } from '@/types/withdrawals';

function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportWithdrawalsToCSV(rows: WithdrawalRow[]): string {
  const headers = [
    'Student ID',
    'Student Name',
    'Student Email',
    'College',
    'Department',
    'Major',
    'Course Code',
    'Course Title',
    'Section',
    'Credits',
    'Instructor',
    'Term',
    'Add/Drop Deadline',
    'Withdrawn At',
    'Days After Deadline',
  ];

  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    const values = [
      escapeCSV(row.student.id),
      escapeCSV(row.student.name),
      escapeCSV(row.student.email),
      escapeCSV(row.student.collegeId),
      escapeCSV(row.student.departmentId),
      escapeCSV(row.student.majorId),
      escapeCSV(row.course.code),
      escapeCSV(row.course.title),
      escapeCSV(row.course.section),
      escapeCSV(row.course.credits),
      escapeCSV(row.course.instructor),
      escapeCSV(row.course.term),
      escapeCSV(row.course.addDropDeadlineISO),
      escapeCSV(row.actionAtISO),
      escapeCSV(row.daysAfterDeadline),
    ];
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
