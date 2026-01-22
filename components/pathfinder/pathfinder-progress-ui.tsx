'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Re-export color utilities from progress-overview for consistency
export {
  getCompletedColor,
  getInProgressColor,
  getPlannedColor,
  getPlannedColorDark,
} from '@/components/progress-overview/colorUtils';

import {
  getCompletedColor,
  getInProgressColor,
  getPlannedColor,
  getPlannedColorDark,
} from '@/components/progress-overview/colorUtils';

// ============================================================================
// PATHFINDER CATEGORY COLORS
// ============================================================================

export const PATHFINDER_COLORS = {
  major: 'var(--primary)',  // Bright green (#12F987) - matches Progress Overview majors
  minor: '#003D82',         // Medium blue - matches Progress Overview minors
  career: '#f59e0b',        // amber-500 - for career exploration
  comparison: 'var(--primary)', // Bright green - for comparing majors (same as major)
} as const;

// ============================================================================
// SEGMENTED PROGRESS BAR COMPONENT
// ============================================================================

interface ProgressBarSegment {
  value: number;
  color: string;
}

interface SegmentedProgressBarProps {
  total: number;
  completed: number;
  inProgress?: number;
  planned?: number;
  categoryColor: string;
  /** Height class for the progress bar (e.g., 'h-14', 'h-20') */
  heightClass?: string;
  /** Whether to show percentage text inside the bar */
  showPercentText?: boolean;
  /** Whether to show fraction text (e.g., "2/4") instead of percentage */
  showFractionText?: boolean;
  /** Whether this is a compact/inline variant */
  compact?: boolean;
}

export function SegmentedProgressBar({
  total,
  completed,
  inProgress = 0,
  planned = 0,
  categoryColor,
  heightClass = 'h-14',
  showPercentText = true,
  showFractionText = false,
  compact = false,
}: SegmentedProgressBarProps) {
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const plannedPercent = total > 0 ? (planned / total) * 100 : 0;
  const overallPercent = Math.round(completedPercent + inProgressPercent);

  const roundedClass = compact ? 'rounded-xl' : 'rounded-2xl';
  const shadowClass = compact ? 'shadow-sm' : 'shadow-md';

  return (
    <div
      className={`relative w-full ${heightClass} ${roundedClass} bg-white dark:bg-zinc-800 ${shadowClass} overflow-hidden border border-[color-mix(in_srgb,var(--border)_40%,transparent)]`}
    >
      {/* Progress segments */}
      <div className="flex h-full">
        {/* Completed segment (solid color) */}
        {completedPercent > 0 && (
          <div
            className="transition-all duration-500"
            style={{
              width: `${completedPercent}%`,
              backgroundColor: getCompletedColor(categoryColor),
            }}
          />
        )}

        {/* In Progress segment (50% transparent category color) */}
        {inProgressPercent > 0 && (
          <div
            className="transition-all duration-500"
            style={{
              width: `${inProgressPercent}%`,
              backgroundColor: getInProgressColor(categoryColor),
            }}
          />
        )}

        {/* Planned segment (grey) - light mode */}
        {plannedPercent > 0 && (
          <div
            className="transition-all duration-500 dark:hidden"
            style={{
              width: `${plannedPercent}%`,
              backgroundColor: getPlannedColor(),
            }}
          />
        )}
        {/* Planned segment (grey) - dark mode */}
        {plannedPercent > 0 && (
          <div
            className="hidden transition-all duration-500 dark:block"
            style={{
              width: `${plannedPercent}%`,
              backgroundColor: getPlannedColorDark(),
            }}
          />
        )}
      </div>

      {/* Text overlay */}
      {(showPercentText || showFractionText) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-bold text-black dark:text-white relative z-10 ${
              compact ? 'text-sm' : 'text-lg'
            }`}
          >
            {showFractionText ? `${completed}/${total}` : `${overallPercent}% complete`}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INLINE PROGRESS BAR (for requirement rows)
// ============================================================================

interface InlineProgressBarProps {
  completed: number;
  inProgress?: number;
  planned?: number;
  total: number;
  categoryColor: string;
  /** Width class (e.g., 'w-32', 'w-40') */
  widthClass?: string;
}

export function InlineProgressBar({
  completed,
  inProgress = 0,
  planned = 0,
  total,
  categoryColor,
  widthClass = 'w-32',
}: InlineProgressBarProps) {
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
  const plannedPercent = total > 0 ? (planned / total) * 100 : 0;

  return (
    <div
      className={`relative ${widthClass} h-8 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-[color-mix(in_srgb,var(--border)_40%,transparent)] overflow-hidden`}
    >
      <div className="flex h-full">
        {completedPercent > 0 && (
          <div
            className="transition-all duration-300"
            style={{
              width: `${completedPercent}%`,
              backgroundColor: getCompletedColor(categoryColor),
            }}
          />
        )}
        {inProgressPercent > 0 && (
          <div
            className="transition-all duration-300"
            style={{
              width: `${inProgressPercent}%`,
              backgroundColor: getInProgressColor(categoryColor),
            }}
          />
        )}
        {plannedPercent > 0 && (
          <>
            <div
              className="transition-all duration-300 dark:hidden"
              style={{
                width: `${plannedPercent}%`,
                backgroundColor: getPlannedColor(),
              }}
            />
            <div
              className="hidden transition-all duration-300 dark:block"
              style={{
                width: `${plannedPercent}%`,
                backgroundColor: getPlannedColorDark(),
              }}
            />
          </>
        )}
      </div>

      {/* Fraction text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-black dark:text-white relative z-10">
          {completed}/{total}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

type BadgeStatus = 'completed' | 'in-progress' | 'planned' | 'remaining' | 'not-started';

interface StatusBadgeProps {
  status: BadgeStatus;
  value: number;
  categoryColor: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label to show below the badge */
  label?: string;
}

export function StatusBadge({
  status,
  value,
  categoryColor,
  size = 'md',
  label,
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-14 w-14 text-xl',
  };

  const getBackgroundStyle = () => {
    switch (status) {
      case 'completed':
        return { backgroundColor: getCompletedColor(categoryColor) };
      case 'in-progress':
        return { backgroundColor: getInProgressColor(categoryColor) };
      case 'planned':
        return undefined; // Handled by className
      case 'remaining':
      case 'not-started':
        return undefined; // Handled by className
      default:
        return undefined;
    }
  };

  const getBorderClass = () => {
    if (status === 'remaining' || status === 'not-started') {
      return 'border-2 border-zinc-300 dark:border-zinc-600';
    }
    return 'border-2 border-transparent';
  };

  const getBackgroundClass = () => {
    if (status === 'remaining' || status === 'not-started') {
      return 'bg-white dark:bg-zinc-800';
    }
    if (status === 'planned') {
      return 'bg-zinc-300 dark:bg-zinc-600';
    }
    return '';
  };

  const getTextClass = () => {
    if (status === 'completed') return 'text-black';
    if (status === 'in-progress') return 'text-black dark:text-white';
    if (status === 'planned') return 'text-black dark:text-white';
    return 'text-zinc-600 dark:text-zinc-400';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-full shadow-md font-bold ${sizeClasses[size]} ${getBorderClass()} ${getBackgroundClass()} ${getTextClass()}`}
        style={getBackgroundStyle()}
      >
        {value}
      </div>
      {label && (
        <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      )}
    </div>
  );
}

// ============================================================================
// STATUS LEGEND ROW
// ============================================================================

interface StatusLegendProps {
  completed: number;
  inProgress?: number;
  planned?: number;
  remaining?: number;
  categoryColor: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function StatusLegend({
  completed,
  inProgress = 0,
  planned = 0,
  remaining = 0,
  categoryColor,
  compact = false,
}: StatusLegendProps) {
  const size = compact ? 'sm' : 'md';

  return (
    <div className={`flex items-start ${compact ? 'gap-4' : 'gap-6'}`}>
      {completed > 0 && (
        <StatusBadge
          status="completed"
          value={completed}
          categoryColor={categoryColor}
          size={size}
          label="Completed"
        />
      )}
      {inProgress > 0 && (
        <StatusBadge
          status="in-progress"
          value={inProgress}
          categoryColor={categoryColor}
          size={size}
          label="In Progress"
        />
      )}
      {planned > 0 && (
        <StatusBadge
          status="planned"
          value={planned}
          categoryColor={categoryColor}
          size={size}
          label="Planned"
        />
      )}
      {remaining > 0 && (
        <StatusBadge
          status="remaining"
          value={remaining}
          categoryColor={categoryColor}
          size={size}
          label="Remaining"
        />
      )}
    </div>
  );
}

// ============================================================================
// REQUIREMENT ROW COMPONENT
// ============================================================================

interface PathfinderRequirementRowProps {
  /** Row number (e.g., 1, 2, 3) */
  number: number | string;
  /** Title of the requirement */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Number completed */
  completed: number;
  /** Number in progress */
  inProgress?: number;
  /** Number planned */
  planned?: number;
  /** Total required */
  total: number;
  /** Category color for the progress bar */
  categoryColor: string;
  /** Whether this row is satisfied/complete */
  isSatisfied?: boolean;
  /** Children to render when expanded */
  children?: React.ReactNode;
  /** Whether row starts expanded */
  defaultExpanded?: boolean;
}

export function PathfinderRequirementRow({
  number,
  title,
  description,
  completed,
  inProgress = 0,
  planned = 0,
  total,
  categoryColor,
  isSatisfied = false,
  children,
  defaultExpanded = false,
}: PathfinderRequirementRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const hasContent = !!children;

  // Determine number badge styling based on status
  const isCompleted = isSatisfied || completed >= total;
  const isInProgress = !isCompleted && (completed > 0 || inProgress > 0);

  const getBadgeBackground = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    return 'white';
  };

  const badgeClassName =
    !isCompleted && !isInProgress
      ? 'text-black dark:text-white border-2 border-zinc-400 dark:border-zinc-500'
      : 'text-black';

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--border)_30%,transparent)] last:border-b-0">
      <button
        type="button"
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between py-3 px-2 transition-colors ${
          hasContent ? 'hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] cursor-pointer' : ''
        }`}
        disabled={!hasContent}
      >
        {/* Left: Number badge */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${badgeClassName}`}
            style={{ backgroundColor: getBadgeBackground() }}
          >
            {number}
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-0.5 text-left min-w-0">
            <span className="text-base font-bold text-[var(--foreground)] truncate">
              {title}
            </span>
            {description && (
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate">
                {description}
              </span>
            )}
          </div>
        </div>

        {/* Right: Progress bar + Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <InlineProgressBar
            completed={completed}
            inProgress={inProgress}
            planned={planned}
            total={total}
            categoryColor={categoryColor}
            widthClass="w-28"
          />

          {hasContent && (
            <div className="flex items-center justify-center h-6 w-6">
              {isExpanded ? (
                <ChevronUp size={16} className="text-zinc-400" />
              ) : (
                <ChevronDown size={16} className="text-zinc-400" />
              )}
            </div>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && hasContent && (
        <div className="px-4 pb-4 pt-2 space-y-2 bg-[color-mix(in_srgb,var(--muted)_8%,transparent)]">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROGRESS CARD WRAPPER
// ============================================================================

interface ProgressCardProps {
  /** Card title (e.g., major name) */
  title: string;
  /** Category color for tinted background */
  categoryColor: string;
  /** Progress percentage (0-100) */
  percentComplete: number;
  /** Total credits or requirements */
  total: number;
  /** Completed count */
  completed: number;
  /** In progress count */
  inProgress?: number;
  /** Planned count */
  planned?: number;
  /** Remaining count */
  remaining?: number;
  /** Optional subtitle */
  subtitle?: string;
  /** Whether this is a compact card */
  compact?: boolean;
  /** Card content (requirements list, etc.) */
  children?: React.ReactNode;
}

export function PathfinderProgressCard({
  title,
  categoryColor,
  percentComplete,
  total,
  completed,
  inProgress = 0,
  planned = 0,
  remaining = 0,
  subtitle,
  compact = false,
  children,
}: ProgressCardProps) {
  // Calculate background tint color
  const cardBackgroundStyle = {
    backgroundColor: `color-mix(in srgb, ${categoryColor} 8%, var(--background))`,
  };

  return (
    <div
      className={compact ? 'rounded-xl p-4 shadow-sm' : 'rounded-2xl p-6 shadow-sm'}
      style={cardBackgroundStyle}
    >
      {/* Header Row */}
      <div className={compact ? 'flex items-center justify-between mb-3' : 'flex items-center justify-between mb-4'}>
        <div className="flex-1 min-w-0">
          <h2 className={compact ? 'text-lg font-black text-[var(--foreground)] truncate' : 'text-xl font-black text-[var(--foreground)]'}>
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs text-[var(--muted-foreground)]">{subtitle}</span>
          )}
        </div>
        <span className={compact ? 'text-xs font-semibold text-[var(--foreground)]' : 'text-sm font-semibold text-[var(--foreground)]'}>
          <span className="font-black">{total}</span> {compact ? 'req' : 'requirements'}
        </span>
      </div>

      {/* Main Progress Bar */}
      <div className={compact ? 'mb-3' : 'mb-4'}>
        <SegmentedProgressBar
          total={total}
          completed={completed}
          inProgress={inProgress}
          planned={planned}
          categoryColor={categoryColor}
          heightClass={compact ? 'h-10' : 'h-14'}
          showPercentText={true}
          compact={compact}
        />
      </div>

      {/* Status Legend */}
      {(completed > 0 || inProgress > 0 || planned > 0 || remaining > 0) && (
        <div className={compact ? 'mb-4' : 'mb-6'}>
          <StatusLegend
            completed={completed}
            inProgress={inProgress}
            planned={planned}
            remaining={remaining}
            categoryColor={categoryColor}
            compact={compact}
          />
        </div>
      )}

      {/* Card Content (requirements list, etc.) */}
      {children && <div className="flex flex-col">{children}</div>}
    </div>
  );
}

// ============================================================================
// COURSE ITEM FOR PATHFINDER
// ============================================================================

interface PathfinderCourseItemProps {
  code: string;
  title: string;
  credits?: number;
  status: 'completed' | 'in-progress' | 'planned' | 'remaining';
  categoryColor: string;
  /** Optional annotation (e.g., "Double Count") */
  annotation?: string;
}

export function PathfinderCourseItem({
  code,
  title,
  credits,
  status,
  categoryColor,
  annotation,
}: PathfinderCourseItemProps) {
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in-progress';
  const isPlanned = status === 'planned';

  const getBackgroundStyle = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    if (isPlanned) return getPlannedColor();
    return 'white';
  };

  const getBackgroundStyleDark = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    if (isPlanned) return getPlannedColorDark();
    return 'rgb(39 39 42)';
  };

  const getBorderStyle = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    if (isPlanned) return getPlannedColor();
    return 'rgb(228 228 231)';
  };

  const getBorderStyleDark = () => {
    if (isCompleted) return getCompletedColor(categoryColor);
    if (isInProgress) return getInProgressColor(categoryColor);
    if (isPlanned) return getPlannedColorDark();
    return 'rgb(63 63 70)';
  };

  const getTextColorClass = () => {
    if (isCompleted) return 'text-black';
    if (status === 'remaining') return 'text-zinc-500 dark:text-zinc-400';
    return 'text-[var(--foreground)]';
  };

  return (
    <>
      {/* Light mode */}
      <div
        className={`flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors dark:hidden ${getTextColorClass()}`}
        style={{
          backgroundColor: getBackgroundStyle(),
          borderColor: getBorderStyle(),
        }}
      >
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{code}</span>
            {annotation && (
              <span className="inline-flex items-center rounded-full bg-white/50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium">
                {annotation}
              </span>
            )}
          </div>
          <span className="text-xs opacity-80 truncate">{title}</span>
        </div>
        {credits !== undefined && (
          <span className="text-xs font-semibold opacity-70 ml-2">{credits} cr</span>
        )}
      </div>

      {/* Dark mode */}
      <div
        className={`hidden dark:flex items-center justify-between py-2.5 px-3 rounded-lg border transition-colors ${getTextColorClass()}`}
        style={{
          backgroundColor: getBackgroundStyleDark(),
          borderColor: getBorderStyleDark(),
        }}
      >
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{code}</span>
            {annotation && (
              <span className="inline-flex items-center rounded-full bg-white/20 text-emerald-300 px-1.5 py-0.5 text-[10px] font-medium">
                {annotation}
              </span>
            )}
          </div>
          <span className="text-xs opacity-80 truncate">{title}</span>
        </div>
        {credits !== undefined && (
          <span className="text-xs font-semibold opacity-70 ml-2">{credits} cr</span>
        )}
      </div>
    </>
  );
}
