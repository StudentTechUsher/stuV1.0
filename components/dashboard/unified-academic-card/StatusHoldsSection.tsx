'use client';

import { ExternalLink } from 'lucide-react';
import { STATUS_HOLDS_MOCK, BYU_STATUS_LINKS, type StatusLevel, type StatusItem } from './dashboardMockData';

interface StatusHoldsSectionProps {
  isVisible: boolean;
  university?: string;
}

/**
 * Get Tailwind classes for status level color coding
 * Works in both light and dark mode
 */
function getStatusColors(status: StatusLevel): {
  pill: string;
  text: string;
} {
  switch (status) {
    case 'good':
      return {
        pill: 'bg-green-500/20 border-green-500/30',
        text: 'text-green-400',
      };
    case 'warning':
      return {
        pill: 'bg-amber-500/20 border-amber-500/30',
        text: 'text-amber-400',
      };
    case 'critical':
      return {
        pill: 'bg-red-500/20 border-red-500/30',
        text: 'text-red-400',
      };
    case 'info':
      return {
        pill: 'bg-blue-500/20 border-blue-500/30',
        text: 'text-blue-400',
      };
    default:
      return {
        pill: 'bg-zinc-500/20 border-zinc-500/30',
        text: 'text-zinc-400',
      };
  }
}

/**
 * Check if university is BYU (for conditional link display)
 */
function isBYUUniversity(university?: string): boolean {
  if (!university) return false;
  const lowerUniv = university.toLowerCase();
  return lowerUniv.includes('byu') ||
         lowerUniv.includes('brigham young') ||
         lowerUniv.includes('brigham-young');
}

/**
 * Status/Holds Section - Color-coded status indicators
 * Shows BYU-specific links when university is BYU
 */
export function StatusHoldsSection({
  isVisible,
  university,
}: StatusHoldsSectionProps) {
  const isBYU = isBYUUniversity(university);

  if (!isVisible) return null;

  return (
    <div className="mt-4 pt-4 border-t border-zinc-700">
      <h3 className="font-header-bold text-sm font-bold text-white/90 mb-3">
        Status & Holds
      </h3>

      <div className="space-y-2">
        {STATUS_HOLDS_MOCK.map((item) => (
          <StatusRow
            key={item.label}
            item={item}
            link={isBYU ? BYU_STATUS_LINKS[item.label] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface StatusRowProps {
  item: StatusItem;
  link?: string;
}

/**
 * Individual status row with color-coded pill and optional external link
 */
function StatusRow({ item, link }: StatusRowProps) {
  const colors = getStatusColors(item.status);

  const content = (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
      <span className="font-body text-sm text-white/70">{item.label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${colors.pill} ${colors.text}`}
        >
          {item.value}
        </span>
        {link && (
          <ExternalLink size={14} className="text-white/40" />
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}
