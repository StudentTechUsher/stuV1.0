/**
 * Current Standing Card Component
 * Displays current GPA, completed credits, and quality points
 */

import Link from 'next/link';
import { Button } from '@mui/material';
import { GraduationCap } from 'lucide-react';

interface CurrentStandingCardProps {
  currentGpa: number;
  completedCredits: number;
  completedQualityPoints: number;
  hasTranscript: boolean;
}

export function CurrentStandingCard({
  currentGpa,
  completedCredits,
  completedQualityPoints,
  hasTranscript,
}: CurrentStandingCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Bold black header matching design system */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
        <h2 className="flex items-center gap-2 font-header text-sm font-bold uppercase tracking-wider text-white">
          <GraduationCap size={18} />
          Current Standing
        </h2>
      </div>

      <div className="p-6">
        {!hasTranscript ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-[color-mix(in_srgb,var(--muted-foreground)_25%,transparent)] bg-[color-mix(in_srgb,var(--muted)_20%,transparent)] py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_15%,transparent)]">
              <GraduationCap size={24} className="text-[var(--primary)]" />
            </div>
            <p className="font-body-semi mb-4 text-sm font-semibold text-[var(--foreground)]">
              Sync Your Transcript
            </p>
            <p className="font-body mb-6 text-xs text-[var(--muted-foreground)]">
              Upload your transcript to view your academic standing and use the GPA calculator.
            </p>
            <Button
              component={Link}
              href="/dashboard/academic-history"
              variant="contained"
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '0.5rem',
              }}
            >
              Sync Transcript
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Current GPA Card */}
            <div className="rounded-lg border border-[var(--border)] bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_srgb,var(--primary)_80%,transparent)] p-5 shadow-sm">
              <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-white/90">
                Current GPA
              </p>
              <p className="font-header mt-2 text-3xl font-bold text-white">
                {currentGpa.toFixed(2)}
              </p>
            </div>

            {/* Completed Credits Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-5 shadow-sm">
              <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Completed Credits
              </p>
              <p className="font-header mt-2 text-3xl font-bold text-[var(--foreground)]">
                {completedCredits}
              </p>
            </div>

            {/* Quality Points Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-5 shadow-sm">
              <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Quality Points
              </p>
              <p className="font-header mt-2 text-3xl font-bold text-[var(--foreground)]">
                {completedQualityPoints.toFixed(1)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
