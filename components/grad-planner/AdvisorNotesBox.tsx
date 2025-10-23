'use client';

import React from 'react';
import { Box, Typography, Button, Collapse, Badge } from '@mui/material';
import { CommentOutlined, ExpandMore, ExpandLess, ErrorOutline } from '@mui/icons-material';

interface AdvisorNotesBoxProps {
  advisorNotes: string | null;
  advisorChanges?: {
    movedCourses: Array<{ courseName: string; courseCode: string; fromTerm: number; toTerm: number }>;
    hasSuggestions: boolean;
  } | null;
}

export default function AdvisorNotesBox({ advisorNotes, advisorChanges }: AdvisorNotesBoxProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Determine if there are changes to highlight
  const hasChanges = advisorChanges && (
    advisorChanges.movedCourses.length > 0 ||
    advisorChanges.hasSuggestions
  );

  if (!advisorNotes || advisorNotes.trim() === '') {
    return null;
  }

  // Parse advisor notes into structured list items
  // Expected format: "Term 1: Note text\nTerm 2: More text"
  const parseNotes = (notes: string) => {
    const lines = notes.split('\n').filter(line => line.trim() !== '');
    const parsedNotes: Array<{ term: string; note: string }> = [];

    lines.forEach(line => {
      const match = line.match(/^Term\s+(\d+):\s*(.+)$/i);
      if (match) {
        parsedNotes.push({
          term: `Term ${match[1]}`,
          note: match[2].trim()
        });
      } else {
        // If line doesn't match pattern, treat as general note
        parsedNotes.push({
          term: 'General',
          note: line.trim()
        });
      }
    });

    return parsedNotes;
  };

  const notes = parseNotes(advisorNotes);

  if (notes.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        borderRadius: '7px',
        border: '1px solid',
        borderColor: 'color-mix(in srgb, rgba(10,31,26,0.14) 32%, var(--border) 68%)',
        backgroundColor: '#ffffff',
        boxShadow: '0 32px 90px -60px rgba(10,31,26,0.35)',
        overflow: 'hidden',
      }}
    >
      <Button
        fullWidth
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          p: 3,
          textTransform: 'none',
          color: '#0a1f1a',
          backgroundColor: 'transparent',
          borderRadius: 0,
          '&:hover': {
            backgroundColor: 'color-mix(in srgb, var(--primary) 6%, white 94%)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              height: 36,
              width: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '7px',
              backgroundColor: 'color-mix(in srgb, var(--primary) 18%, white 82%)',
              color: 'color-mix(in srgb, var(--foreground) 78%, var(--primary) 22%)',
            }}
          >
            <CommentOutlined fontSize="small" />
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Red Hat Display", sans-serif',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            View Advisor Suggestions
          </Typography>
          {hasChanges && (
            <Badge
              badgeContent={
                <ErrorOutline
                  sx={{
                    fontSize: '1.1rem',
                    color: '#ff9800',
                  }}
                />
              }
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: 'transparent',
                  padding: 0,
                },
              }}
            />
          )}
        </Box>
        {isExpanded ? <ExpandLess /> : <ExpandMore />}
      </Button>

      <Collapse in={isExpanded}>
        <Box sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {notes.map((item, index) => (
            <Box
              key={`${item.term}-${index}`}
              sx={{
                borderRadius: '7px',
                border: '1px solid color-mix(in srgb, var(--primary) 26%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--primary) 8%, white)',
                px: 2.5,
                py: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: 'color-mix(in srgb, var(--foreground) 82%, var(--primary) 18%)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  fontSize: '0.75rem',
                  mb: 0.75,
                }}
              >
                {item.term}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'color-mix(in srgb, var(--foreground) 88%, var(--primary) 12%)',
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {item.note}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
