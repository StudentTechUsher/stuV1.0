"use client";

import * as React from 'react';
import { MajorComparisonCard } from './major-comparison-card';
import { StuLoader } from '@/components/ui/StuLoader';
import type { MajorComparisonResult } from '@/lib/services/majorComparisonService';
import { PATHFINDER_COLORS } from './pathfinder-progress-ui';

interface MajorComparisonViewProps {
  comparisons: MajorComparisonResult[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export function MajorComparisonView({
  comparisons,
  loading,
  error,
  onRetry,
}: Readonly<MajorComparisonViewProps>) {
  const [copySuccess, setCopySuccess] = React.useState(false);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleShareLink = async () => {
    const majorIds = comparisons.map((c) => c.program.id).join(',');
    const shareUrl = `${window.location.origin}${window.location.pathname}?compare=${majorIds}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (copyError) {
      console.error('Failed to copy link:', copyError);
      // Fallback: show the URL in an alert
      alert(`Share this link:\n${shareUrl}`);
    }
  };

  if (loading) {
    return (
      <div className="py-8">
        <StuLoader
          variant="inline"
          text="Analyzing major requirements and calculating completion..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{
          backgroundColor: `color-mix(in srgb, #ef4444 8%, var(--background))`,
          borderColor: `color-mix(in srgb, #ef4444 30%, var(--border))`,
        }}
      >
        <p className="text-sm text-[var(--foreground)] mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            type="button"
            className="text-sm font-semibold text-[var(--foreground)] underline hover:no-underline focus:outline-none"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          backgroundColor: `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 5%, var(--background))`,
          borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
        }}
      >
        <p className="text-sm text-[var(--muted-foreground)]">
          Select 2-4 majors above to see a comparison
        </p>
      </div>
    );
  }

  // Determine grid columns based on number of comparisons
  // 2 majors: 2 equal columns
  // 3 majors: 3 columns on large screens, 2+1 on medium
  // 4 majors: 2x2 grid
  const getGridClass = () => {
    const count = comparisons.length;
    if (count === 2) {
      // Two majors: side-by-side on medium+, stack on mobile
      return 'grid-cols-1 md:grid-cols-2';
    }
    if (count === 3) {
      // Three majors: 3 columns on large, 2 columns (with wrap) on medium, stack on mobile
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
    // Four majors: 2x2 on medium+, stack on mobile
    return 'grid-cols-1 md:grid-cols-2';
  };

  return (
    <div className="space-y-4">
      {/* Header with summary and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted-foreground)]">
          Comparing{' '}
          <span className="font-semibold text-[var(--foreground)]">
            {comparisons.length}
          </span>{' '}
          {comparisons.length === 1 ? 'major' : 'majors'} based on requirements satisfied
        </p>

        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleShareLink}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
            style={{
              backgroundColor: copySuccess
                ? `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 20%, var(--background))`
                : `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 10%, var(--background))`,
              borderColor: `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 30%, var(--border))`,
              color: 'var(--foreground)',
            }}
          >
            {copySuccess ? 'Copied!' : 'Share Link'}
          </button>
          <button
            onClick={handlePrintPDF}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] bg-[color-mix(in_srgb,var(--muted)_20%,var(--background))] border border-[color-mix(in_srgb,var(--border)_60%,transparent)] rounded-lg hover:bg-[color-mix(in_srgb,var(--muted)_30%,var(--background))] transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Comparison grid - responsive based on number of majors */}
      <div className={`grid gap-4 ${getGridClass()}`}>
        {comparisons.map((comparison) => (
          <MajorComparisonCard key={comparison.program.id} comparison={comparison} />
        ))}
      </div>

      {/* Footer explanation */}
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 5%, var(--background))`,
          borderColor: `color-mix(in srgb, var(--border) 50%, transparent)`,
        }}
      >
        <h4 className="text-xs font-bold text-[var(--foreground)] mb-1.5 uppercase tracking-wide">
          How is % completion calculated?
        </h4>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Percentage is based on <strong>requirements satisfied</strong>, not credits. For
          example, if a major has 12 requirements and you&apos;ve satisfied 8, your completion
          is 67%. Courses with the{' '}
          <span
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mx-0.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 20%, transparent)`,
              color: 'var(--foreground)',
            }}
          >
            Double Count
          </span>{' '}
          badge satisfy both this major and your general education requirements.
        </p>
      </div>
    </div>
  );
}
