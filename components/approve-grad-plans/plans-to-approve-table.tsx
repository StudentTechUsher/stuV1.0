'use client';

import * as React from 'react';
import { ChevronRight, Calendar, User } from 'lucide-react';
import type { PendingGradPlan } from '@/types/pending-grad-plan';

export interface PlansToApproveTableProps {
  readonly plans: PendingGradPlan[];
  readonly onRowClick?: (plan: PendingGradPlan) => void;
}

export default function PlansToApproveTable({ plans, onRowClick }: PlansToApproveTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  const handleClick = (plan: PendingGradPlan) => {
    if (onRowClick) {
      onRowClick(plan);
    }
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-12 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--muted)_30%,transparent)]">
          <User className="h-8 w-8 text-[var(--muted-foreground)]" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
          No graduation plans awaiting approval
        </h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          When students submit plans for approval, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Plans count badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] shadow-sm">
            <span className="text-sm font-bold text-black">{plans.length}</span>
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {plans.length === 1 ? 'Plan' : 'Plans'} pending approval
          </p>
        </div>
      </div>

      {/* Modern card-based list */}
      <div className="space-y-3">
        {plans.map((plan, index) => (
          <button
            key={plan.id}
            onClick={() => handleClick(plan)}
            className="group w-full rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-[var(--card)] p-5 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:border-[var(--primary)] hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Student info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] shadow-sm">
                  <User className="h-6 w-6 text-[var(--primary)]" strokeWidth={2.5} />
                </div>

                {/* Student name and timestamp */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
                    {plan.student_first_name} {plan.student_last_name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="truncate">{getRelativeTime(plan.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Right side - Action indicator */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Plan #{index + 1}
                  </span>
                  <span className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    Click to review
                  </span>
                </div>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] group-hover:bg-[var(--primary)] transition-colors">
                  <ChevronRight className="h-5 w-5 text-[var(--primary)] group-hover:text-black transition-colors" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
