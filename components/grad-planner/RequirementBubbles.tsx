'use client';

import React from 'react';

// Progress Overview color palette for requirement categories
const MODERN_COLORS: Record<string, string> = {
  major: '#12F987',           // Progress Overview: var(--primary)
  minor: '#003D82',           // Progress Overview: Minor blue
  'general education': '#2196f3',  // Progress Overview: GE blue
  religion: '#5E35B1',        // Progress Overview: Religion indigo
  electives: '#9C27B0',       // Progress Overview: Electives magenta
};

// Helper function to get color for a requirement type
function getRequirementColor(requirement: string): string {
  const req = requirement.toLowerCase().trim();

  // Pattern matching for specific requirement categories
  // Religion-related requirements
  if (req.includes('book of mormon') ||
      req.includes('doctrine and covenants') ||
      req.includes('teachings') ||
      req.includes('jesus christ') ||
      req.includes('christ') ||
      req.includes('gospel') ||
      req.includes('eternal family') ||
      req.includes('old testament') ||
      req.includes('new testament') ||
      req.includes('pearl of great price') ||
      req.includes('restoration') ||
      req.includes('religion') ||
      req.includes('rel ')) {
    return '#5E35B1';  // Progress Overview: Religion indigo
  }

  // General Education patterns
  if (req.includes('skills') ||
      req.includes('first-year writing') ||
      req.includes('adv written') ||
      req.includes('global and cultural awareness') ||
      req.includes('quantitative reasoning') ||
      req.includes('science') ||
      req.includes('social science') ||
      req.includes('humanities') ||
      req.includes('fine arts') ||
      req.includes('american heritage') ||
      req.includes('languages of learning') ||
      req.includes('gen ed') ||
      req.includes('general education')) {
    return '#2196f3';  // Progress Overview: GE blue
  }

  // Major-related (often have course codes or department names)
  if (req.includes('major') ||
      req.includes('core') ||
      req.includes('capstone') ||
      req.includes('requirement') ||
      req.includes('subrequirement') ||
      // Add common major course prefixes if needed
      req.match(/^[a-z]{2,4}\s?\d{3,4}/)) { // matches course codes like "CS 142"
    return '#12F987';  // Progress Overview: var(--primary)
  }

  // Minor-related
  if (req.includes('minor')) {
    return '#003D82';  // Progress Overview: Minor blue
  }

  // Elective patterns
  if (req.includes('elective') ||
      req.includes('foundation') ||
      req.includes('free elective') ||
      req.includes('open elective') ||
      req.includes('unrestricted elective')) {
    return '#9C27B0';  // Progress Overview: Electives magenta
  }

  // Fallback to gray for unmatched requirements
  return '#6b7280';
}

interface RequirementBubblesProps {
  fulfills: string[];
}

export function RequirementBubbles({ fulfills }: RequirementBubblesProps) {
  if (!fulfills || fulfills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {fulfills.map((requirement, index) => {
        const color = getRequirementColor(requirement);

        return (
          <span
            key={`${requirement}-${index}`}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              color: color,
            }}
          >
            {requirement}
          </span>
        );
      })}
    </div>
  );
}
