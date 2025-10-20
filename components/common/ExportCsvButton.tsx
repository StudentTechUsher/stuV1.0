/**
 * Assumptions:
 * - Uses design tokens from globals.css
 * - Downloads CSV on click
 */

'use client';

import React from 'react';
import type { WithdrawalRow } from '@/types/withdrawals';
import { exportWithdrawalsToCSV, downloadCSV } from '@/utils/csv';

interface ExportCsvButtonProps {
  rows: WithdrawalRow[];
  filename?: string;
}

export default function ExportCsvButton({
  rows,
  filename = 'weekly-withdrawals.csv',
}: ExportCsvButtonProps) {
  const handleExport = () => {
    const csvContent = exportWithdrawalsToCSV(rows);
    downloadCSV(filename, csvContent);
  };

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-2 rounded-[7px] bg-[#0a1f1a] px-4 py-2 font-body-semi text-sm text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#043322] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a1f1a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      aria-label="Export withdrawals to CSV"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </button>
  );
}
