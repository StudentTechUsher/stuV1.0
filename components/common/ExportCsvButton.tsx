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
      className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-body-semi text-sm hover:bg-[var(--hover-green)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-colors"
      aria-label="Export withdrawals to CSV"
    >
      Export CSV
    </button>
  );
}
