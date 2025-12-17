'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, User, FileText, ArrowRight } from 'lucide-react';
import type { PendingGradPlan } from '@/types/pending-grad-plan';
import { issueGradPlanAccessId } from '@/lib/services/server-actions';

export interface PlansToApproveTableProps {
  readonly plans: PendingGradPlan[];
}

export default function PlansToApproveTable({ plans }: PlansToApproveTableProps) {
  const router = useRouter();
  const [navigatingId, setNavigatingId] = React.useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRowClick = async (plan: PendingGradPlan) => {
    try {
      setNavigatingId(String(plan.id));
      const accessId = await issueGradPlanAccessId(plan.id);
      router.push(`/approve-grad-plans/${accessId}`);
    } catch (error) {
      console.error('Error navigating to grad plan:', error);
      setNavigatingId(null);
    }
  };

  const _getRelativeTime = (dateString: string) => {
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

  const _handleClick = (_plan: PendingGradPlan) => {
    // Placeholder for potential future use
  };

  // Empty state - matching design system
  if (plans.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-white p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
            <FileText size={32} className="text-[var(--muted-foreground)]" />
          </div>
          <h3 className="font-header-bold text-lg text-[var(--foreground)]">
            No Plans Awaiting Approval
          </h3>
          <p className="font-body text-sm text-[var(--muted-foreground)] leading-relaxed">
            When students submit graduation plans for approval, they will appear here for you to review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--muted-foreground)_10%,transparent)] bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Black Header - matching academic-summary style */}
      <div className="border-b-2 border-[#0A0A0A] bg-[#0A0A0A] px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-left">
            <span className="font-body-semi text-xs uppercase tracking-wider text-white">
              Student Name
            </span>
          </div>
          <div className="text-left">
            <span className="font-body-semi text-xs uppercase tracking-wider text-white">
              Submitted
            </span>
          </div>
          <div className="text-right">
            <span className="font-body-semi text-xs uppercase tracking-wider text-white">
              Action
            </span>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-[var(--border)]">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => handleRowClick(plan)}
            className="group cursor-pointer px-6 py-4 transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--primary)_3%,white)]"
          >
            <div className="grid grid-cols-3 items-center gap-4">
              {/* Student Name with Avatar */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_15%,white)] shadow-sm">
                  <User size={18} className="text-[var(--foreground)]" />
                </div>
                <span className="font-body-semi text-sm text-[var(--foreground)]">
                  {plan.student_first_name} {plan.student_last_name}
                </span>
              </div>

              {/* Submitted Date */}
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Calendar size={16} className="flex-shrink-0 text-[var(--muted-foreground)]" />
                <span className="font-body">{formatDate(plan.created_at)}</span>
              </div>

              {/* Action Button */}
              <div className="text-right">
                {navigatingId === String(plan.id) ? (
                  <div className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"></div>
                    <span className="font-body-semi">Opening...</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-body-semi text-[#0A0A0A] shadow-sm transition-all duration-150 group-hover:shadow-md">
                    <span>Review Plan</span>
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
