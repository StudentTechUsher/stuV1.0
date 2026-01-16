'use client';

import Link from 'next/link';
import { CalendarClock, ChevronRight } from 'lucide-react';

/**
 * Number of days before priority registration to show the reminder badge
 * Easy to adjust - just change this constant
 */
const PRIORITY_REG_NOTICE_DAYS = 14;

/**
 * DUMMY priority registration date for POC
 * Replace with real data from backend when available
 * Format: YYYY-MM-DD
 * Set to ~10 days from now for demo purposes
 */
const DUMMY_PRIORITY_REG_DATE = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 10); // 10 days from now
  return date.toISOString().split('T')[0];
})();

/**
 * Check if today is within the notice window before priority registration
 * Returns true if: today <= priorityRegDate AND today >= (priorityRegDate - NOTICE_DAYS)
 */
function shouldShowBadge(priorityRegDateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const priorityRegDate = new Date(priorityRegDateStr);
  priorityRegDate.setHours(0, 0, 0, 0);

  // Calculate the notice window start date
  const noticeStartDate = new Date(priorityRegDate);
  noticeStartDate.setDate(noticeStartDate.getDate() - PRIORITY_REG_NOTICE_DAYS);

  // Badge visible if: today is within notice window AND not past the registration date
  return today >= noticeStartDate && today <= priorityRegDate;
}

/**
 * Calculate days until priority registration
 */
function getDaysUntil(priorityRegDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const priorityRegDate = new Date(priorityRegDateStr);
  priorityRegDate.setHours(0, 0, 0, 0);

  const diffTime = priorityRegDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Priority Registration Reminder Badge
 * Shows X days before the student's priority registration date
 * Reminds them to keep their grad plan updated
 */
export function PriorityRegistrationBadge() {
  // TODO: Replace with real priority registration date from backend
  const priorityRegDate = DUMMY_PRIORITY_REG_DATE;

  const badgeVisible = shouldShowBadge(priorityRegDate);
  const daysUntil = getDaysUntil(priorityRegDate);

  if (!badgeVisible) {
    return null;
  }

  return (
    <Link
      href="/grad-plan"
      className="group block mb-4 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-500/15 to-orange-500/15 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-500/30 dark:border-amber-400/30 rounded-xl">
        {/* Icon */}
        <div className="flex-shrink-0 p-2 rounded-lg bg-amber-500/20 dark:bg-amber-400/20">
          <CalendarClock size={20} className="text-amber-600 dark:text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-body-semi text-sm font-bold text-amber-700 dark:text-amber-300">
              {daysUntil === 0 ? 'Registration is today!' : `${daysUntil} day${daysUntil === 1 ? '' : 's'} until registration`}
            </span>
          </div>
          <p className="font-body text-xs text-amber-600/90 dark:text-amber-300/80 mt-0.5">
            Make sure your grad plan is up to date before priority registration
          </p>
        </div>

        {/* CTA Arrow */}
        <div className="flex-shrink-0 flex items-center gap-1 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
          <span className="font-body-semi text-xs font-semibold hidden sm:inline">Edit Plan</span>
          <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}

/**
 * Export constants for easy configuration
 */
export { PRIORITY_REG_NOTICE_DAYS, DUMMY_PRIORITY_REG_DATE };
