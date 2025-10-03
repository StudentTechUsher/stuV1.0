'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CommentOutlined } from '@mui/icons-material';

interface AdvisorNotesBoxProps {
  advisorNotes: string | null;
}

export default function AdvisorNotesBox({ advisorNotes }: AdvisorNotesBoxProps) {
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
        p: 3,
        backgroundColor: '#fffbeb',
        borderRadius: 2,
        border: '2px solid #f59e0b',
        mb: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CommentOutlined sx={{ color: '#f59e0b' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e' }}>
          Advisor Suggestions
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {notes.map((item, index) => (
          <Box
            key={index}
            sx={{
              p: 2,
              backgroundColor: 'white',
              borderRadius: 1,
              border: '1px solid #fde68a'
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: '#92400e',
                mb: 0.5,
                fontSize: '0.875rem'
              }}
            >
              {item.term}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#78350f',
                lineHeight: 1.6
              }}
            >
              {item.note}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}