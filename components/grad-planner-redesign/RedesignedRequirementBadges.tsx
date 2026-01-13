'use client';

import React from 'react';
import type { RedesignedRequirementBadgesProps } from './types';
import { getRequirementColor } from './designConstants';

/**
 * REDESIGNED REQUIREMENT BADGES
 *
 * Visual Design:
 * - Larger badges (px-3 py-1, text-sm in regular mode)
 * - Smaller badges (px-2 py-0.5, text-xs in compact mode)
 * - Category color backgrounds (matching Progress Overview)
 * - Bold, readable white text
 * - Rounded-full shape
 * - Wraps to multiple lines if needed
 * - Abbreviates "General Education" to "GE" for space
 */
export function RedesignedRequirementBadges({
  fulfills,
  compact = false,
}: RedesignedRequirementBadgesProps) {
  if (!fulfills || fulfills.length === 0) {
    return null;
  }

  /**
   * Abbreviate requirement text for display
   * - "General Education" → "GE"
   * - Long specific requirements get truncated
   */
  const abbreviateRequirement = (req: string): string => {
    if (req === 'General Education') return 'GE';
    // Keep other requirements as-is for now
    // Could add more abbreviations if needed (e.g., "Finance Core" → "Fin Core")
    return req;
  };

  const badgeClasses = compact
    ? 'px-2 py-0.5 rounded-full text-xs font-bold text-white'
    : 'px-3 py-1 rounded-full text-sm font-bold text-white';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {fulfills.map((req, index) => {
        const color = getRequirementColor(req);
        const displayText = abbreviateRequirement(req);

        return (
          <div
            key={index}
            className={badgeClasses}
            style={{ backgroundColor: color }}
            title={req} // Show full text on hover
          >
            {displayText}
          </div>
        );
      })}
    </div>
  );
}
