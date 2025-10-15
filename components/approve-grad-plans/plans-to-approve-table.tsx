'use client';

import * as React from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  IconButton
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { PendingGradPlan } from '@/types/pending-grad-plan';

export interface PlansToApproveTableProps {
  readonly plans: PendingGradPlan[];
  readonly onRowClick?: (plan: PendingGradPlan) => void;
}

export default function PlansToApproveTable({ plans, onRowClick }: PlansToApproveTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRowClick = (plan: PendingGradPlan) => {
    if (onRowClick) {
      onRowClick(plan);
    }
  };

  if (plans.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No graduation plans awaiting approval
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          When students submit plans for approval, they will appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow sx={{
            backgroundColor: 'var(--primary)',
            opacity: 0.08,
            '& .MuiTableCell-root': {
              backgroundColor: 'transparent'
            }
          }}>
            <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Submitted Date</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 150 }} align="center">
              View Plan
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plans.map((plan) => (
            <TableRow
              key={plan.id}
              onClick={() => handleRowClick(plan)}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'var(--hover-green)',
                  '& .arrow-icon': {
                    color: 'var(--dark)'
                  }
                },
                transition: 'background-color 0.2s ease-in-out'
              }}
            >
              <TableCell>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {plan.student_first_name} {plan.student_last_name}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(plan.created_at)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  className="arrow-icon"
                  sx={{ 
                    color: 'text.secondary',
                    transition: 'color 0.2s ease-in-out'
                  }}
                >
                  <ArrowForwardIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
