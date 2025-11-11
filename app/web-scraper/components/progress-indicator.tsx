'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Zap } from 'lucide-react';

interface ProgressIndicatorProps {
  stage: 'idle' | 'scraping' | 'organizing' | 'contacts' | 'complete';
  percentage: number;
}

const stageLabels: Record<ProgressIndicatorProps['stage'], string> = {
  idle: 'Ready',
  scraping: 'Scraping URLs',
  organizing: 'Organizing Data',
  contacts: 'Discovering Contacts',
  complete: 'Complete',
};

const stageDescriptions: Record<ProgressIndicatorProps['stage'], string> = {
  idle: 'Waiting to start',
  scraping: 'Fetching content from URLs',
  organizing: 'Processing and structuring data',
  contacts: 'Discovering contact information',
  complete: 'All tasks finished successfully',
};

const stageColors: Record<ProgressIndicatorProps['stage'], string> = {
  idle: 'from-muted to-muted',
  scraping: 'from-blue-500 to-cyan-500',
  organizing: 'from-purple-500 to-pink-500',
  contacts: 'from-emerald-500 to-teal-500',
  complete: 'from-emerald-500 to-teal-500',
};

const stageIcons: Record<ProgressIndicatorProps['stage'], 'zap' | 'check'> = {
  idle: 'zap',
  scraping: 'zap',
  organizing: 'zap',
  contacts: 'zap',
  complete: 'check',
};

export function ProgressIndicator({ stage, percentage }: ProgressIndicatorProps) {
  const isComplete = stage === 'complete' && percentage === 100;

  return (
    <Card className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] overflow-hidden shadow-sm p-0">
      <div className="rounded-t-2xl px-6 py-5" style={{ backgroundColor: '#0A0A0A' }}>
        <h3 className="font-header-bold text-lg font-bold text-white">Processing Status</h3>
      </div>
      <CardContent className="pt-6 flex flex-col gap-4 px-6 pb-6">
        {/* Header with icon and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              isComplete
                ? 'bg-emerald-500/20'
                : 'bg-primary/20 animate-pulse'
            }`}>
              {stageIcons[stage] === 'check' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Zap className="w-5 h-5 text-primary animate-pulse" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-foreground">{stageLabels[stage]}</p>
              <p className="text-xs text-muted-foreground">{stageDescriptions[stage]}</p>
            </div>
          </div>
          <span className="text-base font-bold text-primary">{percentage}%</span>
        </div>

        {/* Progress bar with enhanced styling */}
        <div className="w-full space-y-2">
          <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden border border-border/30">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${stageColors[stage]} shadow-lg transition-all duration-500 ease-out`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Additional context message */}
          <p className="text-xs text-muted-foreground/70">
            {percentage === 100
              ? 'Processing complete. Results are ready below.'
              : stage === 'scraping'
              ? 'Fetching and parsing institution data...'
              : stage === 'organizing'
              ? 'Structuring and validating information...'
              : stage === 'contacts'
              ? 'Extracting contact details for each institution...'
              : 'Processing may take a few minutes depending on URL size'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
