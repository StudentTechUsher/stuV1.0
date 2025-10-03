'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Color mapping for requirement types (matching academic-progress-card)
const REQUIREMENT_COLORS: Record<string, string> = {
  'major': 'var(--primary)', // #12F987
  'minor': '#001F54', // dark blue
  'general education': '#2196f3', // bright blue
  'gen ed': '#2196f3', // alternate name for general education
  'religion': '#5E35B1', // purple
  'electives': '#9C27B0', // violet
  'elective': '#9C27B0', // singular form
};

// Helper function to get color for a requirement type
function getRequirementColor(requirement: string): string {
  const req = requirement.toLowerCase().trim();

  // Direct matches first
  if (REQUIREMENT_COLORS[req]) {
    return REQUIREMENT_COLORS[req];
  }

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
    return REQUIREMENT_COLORS['religion'];
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
    return REQUIREMENT_COLORS['general education'];
  }

  // Major-related (often have course codes or department names)
  if (req.includes('major') ||
      req.includes('core') ||
      req.includes('capstone') ||
      req.includes('requirement') ||
      req.includes('subrequirement') ||
      // Add common major course prefixes if needed
      req.match(/^[a-z]{2,4}\s?\d{3,4}/)) { // matches course codes like "CS 142"
    return REQUIREMENT_COLORS['major'];
  }

  // Minor-related
  if (req.includes('minor')) {
    return REQUIREMENT_COLORS['minor'];
  }

  // Elective patterns
  if (req.includes('elective') ||
      req.includes('foundation') ||
      req.includes('free elective') ||
      req.includes('open elective') ||
      req.includes('unrestricted elective')) {
    return REQUIREMENT_COLORS['electives'];
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {fulfills.map((requirement, index) => {
        const color = getRequirementColor(requirement);

        // Handle CSS variables differently for background colors
        let backgroundColor: string;
        let borderColor: string;
        let textColor: string = color; // Default to the requirement color

        if (color.startsWith('var(')) {
          // For CSS variables, use rgba with opacity
          if (color === 'var(--primary)') {
            backgroundColor = 'rgba(18, 249, 135, 0.15)'; // #12F987 with 15% opacity
            borderColor = 'rgba(18, 249, 135, 0.3)'; // #12F987 with 30% opacity
            textColor = 'var(--hover-green)'; // Use hover green for better contrast
          } else {
            // Fallback for other CSS variables
            backgroundColor = 'rgba(107, 114, 128, 0.15)';
            borderColor = 'rgba(107, 114, 128, 0.3)';
          }
        } else {
          // For hex colors, convert to rgba
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
          borderColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
        }

        return (
          <Box
            key={`${requirement}-${index}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              py: 0.25,
              borderRadius: 3,
              backgroundColor: backgroundColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: textColor,
                fontFamily: '"Inter", sans-serif',
                lineHeight: 1,
              }}
            >
              {requirement}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
