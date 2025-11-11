/**
 * Target GPA Card Component
 * Allows user to set target graduation GPA and shows required average
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { TextField } from '@mui/material';
import { AlertCircle, CheckCircle2, AlertTriangle, Target } from 'lucide-react';
import { StuLoader } from '@/components/ui/StuLoader';
import type { GradeKey } from '@/lib/gpa/gradeScale';

interface TargetCardProps {
  completedCredits: number;
  completedQualityPoints: number;
  remainingCredits: number;
  remaining: Array<{ credits: number; goalGrade?: GradeKey | null }>;
  onDistributionChange?: (distribution: DistributionResponse | null) => void;
  onTargetGpaChange?: (gpa: number | null) => void;
}

interface DistributionResponse {
  feasible: boolean;
  requiredAvg: number;
  qualityPointsNeeded: number;
  distribution: Record<GradeKey, number>;
  message?: string;
}

export function TargetCard({
  completedCredits,
  completedQualityPoints,
  remainingCredits,
  remaining,
  onDistributionChange,
  onTargetGpaChange,
}: TargetCardProps) {
  const [targetGpa, setTargetGpa] = useState<string>('3.8');
  const [isLoading, setIsLoading] = useState(false);
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced computation
  const computeDistribution = useCallback(async (target: number) => {
    if (target < 0 || target > 4.0 || remainingCredits === 0) {
      setDistribution(null);
      onDistributionChange?.(null);
      onTargetGpaChange?.(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        targetGpa: target,
        completedCredits,
        completedQualityPoints,
        remaining,
      };

      const response = await fetch('/api/gpa/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compute distribution');
      }

      const result = await response.json();
      setDistribution(result);
      onDistributionChange?.(result);
      onTargetGpaChange?.(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setDistribution(null);
      onDistributionChange?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [completedCredits, completedQualityPoints, remaining, remainingCredits, onDistributionChange, onTargetGpaChange]);

  // Debounced handler for target GPA changes
  const handleTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTargetGpa(value);

      // Debounce computation
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const timer = setTimeout(() => {
          computeDistribution(numValue);
        }, 150);

        return () => clearTimeout(timer);
      }
    },
    [computeDistribution]
  );

  const minGpa = useMemo(() => {
    if (remainingCredits === 0) return 0;
    return completedQualityPoints / (completedCredits + remainingCredits);
  }, [completedCredits, completedQualityPoints, remainingCredits]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Bold black header matching design system */}
      <div className="border-b-2 px-6 py-4" style={{ backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' }}>
        <h2 className="flex items-center gap-2 font-header text-sm font-bold uppercase tracking-wider text-white">
          <Target size={18} />
          Target Graduation GPA
        </h2>
      </div>

      <div className="p-6">
        {remainingCredits === 0 ? (
          <div className="rounded-lg bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-4">
            <p className="font-body text-sm text-[var(--foreground)]">
              You have no remaining courses in your graduation plan.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Target GPA Input Section */}
            <div className="space-y-3">
              <label className="block font-body-semi text-sm font-semibold text-[var(--foreground)]">
                Enter Your Target GPA
              </label>
              <div className="relative">
                <TextField
                  type="number"
                  slotProps={{ htmlInput: { step: 0.01, min: 0, max: 4.0 } }}
                  value={targetGpa}
                  onChange={handleTargetChange}
                  className="w-full"
                  disabled={remainingCredits === 0}
                  size="small"
                  placeholder="3.8"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: 'inherit',
                    },
                  }}
                />
              </div>
              <p className="font-body text-xs text-[var(--muted-foreground)]">
                Minimum achievable: <span className="font-semibold">{minGpa.toFixed(2)}</span> • Maximum: 4.0
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] py-6">
                <StuLoader variant="inline" text="Computing distribution..." />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-body-semi text-sm font-semibold text-red-900">Error</p>
                    <p className="font-body mt-1 text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Section */}
            {distribution && !isLoading && (
              <div className="space-y-4">
                {/* Feasibility Status Card */}
                <div
                  className={`rounded-lg border p-4 transition-all ${
                    distribution.feasible
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {distribution.feasible ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`font-body-semi text-sm font-bold ${
                          distribution.feasible ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {distribution.feasible ? '✓ Achievable' : '✗ Unachievable'}
                      </p>
                      {distribution.message && (
                        <p className="font-body mt-1 text-xs text-gray-700">
                          {distribution.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Required Average Card */}
                <div className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] p-4">
                  <p className="font-body-semi text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Required Average
                  </p>
                  <p className="mt-2 font-header text-3xl font-bold text-[var(--primary)]">
                    {distribution.requiredAvg.toFixed(2)}
                  </p>
                  <p className="font-body mt-1 text-xs text-[var(--muted-foreground)]">
                    on remaining courses
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
