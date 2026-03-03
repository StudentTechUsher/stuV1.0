'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ActionFooter from '@/components/grad-plan/v3/ActionFooter';
import InlineValidationNotice, { type ValidationTone } from '@/components/grad-plan/v3/InlineValidationNotice';

interface GuidedStepCardProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  children: ReactNode;
  primaryAction: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  helperText?: string | null;
  notice?: {
    tone?: ValidationTone;
    title: string;
    message: string;
  };
}

export default function GuidedStepCard({
  stepNumber,
  totalSteps,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  helperText,
  notice,
}: Readonly<GuidedStepCardProps>) {
  return (
    <Card className="overflow-hidden border-zinc-200 bg-white/95 shadow-lg">
      <CardHeader className="gap-2 border-b bg-gradient-to-r from-zinc-50 to-emerald-50/60 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Step {stepNumber} of {totalSteps}
        </p>
        <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-6 text-zinc-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 py-5">
        {notice && (
          <InlineValidationNotice
            tone={notice.tone}
            title={notice.title}
            message={notice.message}
          />
        )}
        {children}
      </CardContent>
      <CardFooter className="border-t bg-zinc-50/80 py-3">
        <ActionFooter
          primaryLabel={primaryAction.label}
          onPrimary={primaryAction.onClick}
          primaryDisabled={primaryAction.disabled}
          primaryLoading={primaryAction.loading}
          secondaryLabel={secondaryAction?.label}
          onSecondary={secondaryAction?.onClick}
          secondaryDisabled={secondaryAction?.disabled}
          helperText={helperText}
        />
      </CardFooter>
    </Card>
  );
}
