/**
 * Assumptions:
 * - Simple two-input date picker (start/end)
 * - Uses design tokens from globals.css
 */

'use client';

import React from 'react';

interface DateRangePickerProps {
  startISO: string;
  endISO: string;
  onStartChange: (iso: string) => void;
  onEndChange: (iso: string) => void;
}

export default function DateRangePicker({
  startISO,
  endISO,
  onStartChange,
  onEndChange,
}: DateRangePickerProps) {
  const startDate = startISO.split('T')[0];
  const endDate = endISO.split('T')[0];

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    newDate.setHours(0, 0, 0, 0);
    onStartChange(newDate.toISOString());
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    newDate.setHours(23, 59, 59, 999);
    onEndChange(newDate.toISOString());
  };

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <span className="font-body-semi">From:</span>
        <input
          type="date"
          value={startDate}
          onChange={handleStartChange}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <span className="font-body-semi">To:</span>
        <input
          type="date"
          value={endDate}
          onChange={handleEndChange}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      </label>
    </div>
  );
}
