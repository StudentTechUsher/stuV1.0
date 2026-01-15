'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OVERALL_PROGRESS_MOCK, PLAN_DETAILS_MOCK } from './dashboardMockData';

/**
 * Large overall progress bar with expandable plan details
 * Shows degree completion progress as the main visual element
 * Expands to show Graduation Plan, Plan Follow Through, and Optimization
 */
export function OverallProgressSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { percentage, tooltip } = OVERALL_PROGRESS_MOCK;
  const { graduationPlan, planFollowThrough, optimization } = PLAN_DETAILS_MOCK;

  return (
    <div className="space-y-4">
      {/* Main Overall Progress Bar - Large & Prominent */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full group cursor-pointer"
            >
              {/* Progress bar container */}
              <div className="relative w-full h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700 shadow-inner overflow-hidden transition-all duration-300 hover:shadow-md">
                {/* Filled portion */}
                <div
                  className="absolute inset-y-0 left-0 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--hover-green)] transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />

                {/* Percentage text centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black text-black dark:text-white drop-shadow-sm">
                    {percentage}% Complete
                  </span>
                </div>

                {/* Expand indicator */}
                <div className="absolute right-4 inset-y-0 flex items-center">
                  <div className={`p-1.5 rounded-full bg-white/20 dark:bg-black/20 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className="text-black dark:text-white" />
                  </div>
                </div>
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Expandable Plan Details Section */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-3 pt-2">
          {/* Graduation Plan Progress */}
          <ProgressDetailRow
            label={graduationPlan.label}
            percentage={graduationPlan.percentage}
            tooltip={graduationPlan.tooltip}
            color="var(--primary)"
          />

          {/* Plan Follow Through Progress */}
          <ProgressDetailRow
            label={planFollowThrough.label}
            percentage={planFollowThrough.percentage}
            tooltip={planFollowThrough.tooltip}
            color="#3B82F6"
          />

          {/* Optimization Progress (POC Placeholder) */}
          <ProgressDetailRow
            label={optimization.label}
            percentage={optimization.percentage}
            tooltip={optimization.tooltip}
            color="#8B5CF6"
            isPlaceholder
          />
        </div>
      </div>
    </div>
  );
}

interface ProgressDetailRowProps {
  label: string;
  percentage: number;
  tooltip: string;
  color: string;
  isPlaceholder?: boolean;
}

function ProgressDetailRow({
  label,
  percentage,
  tooltip,
  color,
  isPlaceholder = false,
}: ProgressDetailRowProps) {
  return (
    <div className={`rounded-xl p-4 ${isPlaceholder ? 'border-2 border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_30%,transparent)]' : 'bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-body-semi text-sm font-semibold text-[var(--foreground)]">
            {label}
          </span>
          {isPlaceholder && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
              Coming Soon
            </span>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  <Info size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="font-header-bold text-sm font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-600 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${isPlaceholder ? 'opacity-50' : ''}`}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
