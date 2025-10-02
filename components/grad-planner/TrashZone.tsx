'use client';

import React from 'react';
import Box from '@mui/material/Box';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDroppable } from '@dnd-kit/core';

export function TrashZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash-zone',
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: isOver ? 'translateX(-50%) scale(1.15)' : 'translateX(-50%) scale(1)',
        width: 100,
        height: 100,
        borderRadius: '50%',
        backgroundColor: isOver ? 'var(--destructive)' : 'var(--action-cancel)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        transition: 'all 0.2s ease-in-out',
        boxShadow: isOver ? '0 8px 24px rgba(239, 68, 68, 0.5)' : '0 4px 12px rgba(244, 67, 54, 0.4)',
        cursor: 'pointer',
      }}
    >
      <DeleteIcon sx={{ fontSize: 48, color: 'white' }} />
    </Box>
  );
}
