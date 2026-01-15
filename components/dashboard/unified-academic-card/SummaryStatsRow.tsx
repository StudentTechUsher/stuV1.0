'use client';

import Link from "next/link";
import { Calendar, Calculator } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SummaryStatsRowProps {
  gpa: number | null;
  estimatedGraduation: string;
  onEditGraduation: () => void;
  hasTranscript: boolean;
}

/**
 * Summary row displaying GPA, Estimated Graduation, and GPA Calculator
 * GPA and Estimated Graduation use REAL data
 * GPA Calculator navigates to /gpa-calculator
 */
export function SummaryStatsRow({
  gpa,
  estimatedGraduation,
  onEditGraduation,
  hasTranscript,
}: SummaryStatsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* GPA Card - Real data with gradient */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)] p-4 shadow-sm transition-transform duration-200 hover:-translate-y-1 cursor-default">
              <div className="relative z-10 text-center">
                <div className="font-header-bold text-3xl font-extrabold text-white">
                  {gpa !== null ? gpa.toFixed(2) : "—"}
                </div>
                <div className="font-body mt-1 text-xs font-semibold uppercase tracking-wider text-white/90">
                  GPA
                </div>
              </div>
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-white/5" />
            </div>
          </TooltipTrigger>
          {gpa === null && (
            <TooltipContent>
              <p>Upload your transcript to see your actual GPA</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Estimated Graduation Card - Real data, clickable */}
      <button
        type="button"
        onClick={onEditGraduation}
        className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white dark:bg-zinc-900 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
            <Calendar size={20} className="text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-body text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Est. Graduation
            </div>
            <div className="font-header-bold text-sm font-bold text-[var(--foreground)] truncate">
              {estimatedGraduation}
            </div>
          </div>
        </div>
      </button>

      {/* GPA Calculator Button - Real navigation */}
      <Link
        href="/gpa-calculator"
        className="group overflow-hidden rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
      >
        <div className="flex flex-col items-center justify-center h-full">
          <Calculator
            size={24}
            className="mb-1 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]"
          />
          <div className="font-body-semi text-xs font-semibold text-[var(--foreground)]">
            GPA Calculator
          </div>
        </div>
      </Link>
    </div>
  );
}
