"use client";

import * as React from 'react';
import { MajorComparisonCard } from './major-comparison-card';
import { StuLoader } from '@/components/ui/StuLoader';
import type { MajorComparisonResult } from '@/lib/services/majorComparisonService';

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
  onRetry
}: Readonly<MajorComparisonViewProps>) {
  const [copySuccess, setCopySuccess] = React.useState(false);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleShareLink = async () => {
    const majorIds = comparisons.map(c => c.program.id).join(',');
    const shareUrl = `${window.location.origin}${window.location.pathname}?compare=${majorIds}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback: show the URL in an alert
      alert(`Share this link:\n${shareUrl}`);
    }
  };
  if (loading) {
    return (
      <div className="py-8">
        <StuLoader variant="inline" text="Analyzing major requirements and calculating completion..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-800 mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            type="button"
            className="text-sm text-red-700 underline hover:text-red-900 focus:outline-none"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          Select 2-4 majors above to see a comparison
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with summary and actions */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-600">
          Comparing {comparisons.length} {comparisons.length === 1 ? 'major' : 'majors'}
          {' • '}
          Showing completion based on requirements satisfied
        </p>

        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleShareLink}
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition"
          >
            {copySuccess ? '✓ Copied!' : '🔗 Share Link'}
          </button>
          <button
            onClick={handlePrintPDF}
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Comparison grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {comparisons.map(comparison => (
          <MajorComparisonCard
            key={comparison.program.id}
            comparison={comparison}
          />
        ))}
      </div>

      {/* Footer explanation */}
      <div className="mt-4 p-3 rounded bg-gray-50/70 backdrop-blur border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-1">
          How is % completion calculated?
        </h4>
        <p className="text-xs text-gray-600 leading-relaxed">
          Percentage is based on <strong>requirements satisfied</strong>, not credits.
          For example, if a major has 12 requirements and you've satisfied 8, your completion is 67%.
          Courses with the <span className="inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1 py-0.5 text-[10px] mx-0.5">🔄 Double</span> badge
          satisfy both this major and your general education requirements.
        </p>
      </div>
    </div>
  );
}
