'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Typography, Alert, Stack, Divider, Button } from '@mui/material';
import { CheckCircle, AlertCircle, XCircle, Calendar, ArrowRight, Trash2 } from 'lucide-react';

export interface CourseValidationResult {
  courseCode: string;
  status: 'available' | 'not_in_term' | 'not_found';
  targetTerm: string;
  availableIn?: string;
  sectionCount?: number;
  message: string;
}

export interface CourseValidationSummaryData {
  total: number;
  available: number;
  needsRescheduling: number;
  notFound: number;
}

interface CourseValidationResultsProps {
  summary: CourseValidationSummaryData;
  results: {
    available: CourseValidationResult[];
    notInTerm: CourseValidationResult[];
    notFound: CourseValidationResult[];
  };
  compact?: boolean; // Compact mode for constrained spaces
  onRemoveCourse?: (courseCode: string) => void; // Callback when user removes a course
}

export function CourseValidationSummary({ summary, compact = false }: { summary: CourseValidationSummaryData; compact?: boolean }) {
  if (compact) {
    // Compact horizontal layout
    return (
      <Box sx={{
        display: 'flex',
        gap: 2,
        p: 2,
        border: '1px solid var(--border)',
        borderRadius: 1,
        mb: 2,
        flexWrap: 'wrap'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Total:</Typography>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>{summary.total}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle size={16} color="#10b981" />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>{summary.available}</Typography>
        </Box>
        {summary.needsRescheduling > 0 && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle size={16} color="#f59e0b" />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>{summary.needsRescheduling}</Typography>
            </Box>
          </>
        )}
        {summary.notFound > 0 && (
          <>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <XCircle size={16} color="#ef4444" />
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>{summary.notFound}</Typography>
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Standard layout
  return (
    <Card elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 2, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Validation Summary
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {summary.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Courses
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
              {summary.available}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Available
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
              {summary.needsRescheduling}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Needs Rescheduling
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
              {summary.notFound}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Not Found
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function CourseValidationItem({
  result,
  compact = false,
  onRemove,
}: {
  result: CourseValidationResult;
  compact?: boolean;
  onRemove?: () => void;
}) {
  const getStatusConfig = () => {
    switch (result.status) {
      case 'available':
        return {
          icon: <CheckCircle size={20} />,
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
          chipLabel: 'Available',
          chipColor: 'success' as const,
        };
      case 'not_in_term':
        return {
          icon: <AlertCircle size={20} />,
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
          chipLabel: 'Needs Rescheduling',
          chipColor: 'warning' as const,
        };
      case 'not_found':
        return {
          icon: <XCircle size={20} />,
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          chipLabel: 'Not Found',
          chipColor: 'error' as const,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card
      elevation={0}
      sx={{
        border: compact ? `1px solid ${config.color}` : `2px solid ${config.color}`,
        borderRadius: compact ? 1 : 2,
        backgroundColor: config.bgColor,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: compact ? 1 : 2,
        },
      }}
    >
      <CardContent sx={{ p: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1.5 : 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: compact ? 0.5 : 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1 : 1.5 }}>
            <Box sx={{ color: config.color }}>{compact ? React.cloneElement(config.icon, { size: 18 }) : config.icon}</Box>
            <Typography variant={compact ? 'body1' : 'h6'} sx={{ fontWeight: 700 }}>
              {result.courseCode}
            </Typography>
          </Box>
          <Chip label={config.chipLabel} color={config.chipColor} size="small" />
        </Box>

        {!compact && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {result.message}
          </Typography>
        )}

        {result.status === 'available' && result.sectionCount && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: compact ? 0.5 : 1 }}>
            <Calendar size={compact ? 14 : 16} />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: compact ? '0.75rem' : undefined }}>
              {result.sectionCount} section{result.sectionCount > 1 ? 's' : ''}
            </Typography>
          </Box>
        )}

        {result.status === 'not_in_term' && result.availableIn && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: compact ? 0.5 : 2,
              p: compact ? 1 : 1.5,
              borderRadius: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: compact ? '0.75rem' : undefined }}>
              {result.targetTerm}
            </Typography>
            <ArrowRight size={compact ? 14 : 16} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: config.color, fontSize: compact ? '0.75rem' : undefined }}>
              {result.availableIn}
            </Typography>
          </Box>
        )}

        {result.status === 'not_found' && onRemove && (
          <Box sx={{ mt: compact ? 1 : 1.5 }}>
            <Button
              variant="outlined"
              color="error"
              size={compact ? 'small' : 'medium'}
              startIcon={<Trash2 size={compact ? 14 : 16} />}
              onClick={onRemove}
              fullWidth
              sx={{
                borderColor: '#ef4444',
                color: '#ef4444',
                '&:hover': {
                  borderColor: '#dc2626',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                },
              }}
            >
              Do Not Schedule
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function CourseValidationResults({ summary, results, compact = false, onRemoveCourse }: CourseValidationResultsProps) {
  const hasAnyResults = summary.total > 0;

  if (!hasAnyResults) {
    return (
      <Alert severity="info">
        <Typography variant="body2">No courses to validate. Add course codes to get started.</Typography>
      </Alert>
    );
  }

  const spacing = compact ? 1.5 : 2;
  const sectionSpacing = compact ? 2 : 4;

  return (
    <Box>
      <CourseValidationSummary summary={summary} compact={compact} />

      {/* Available Courses */}
      {results.available.length > 0 && (
        <Box sx={{ mb: sectionSpacing }}>
          <Typography
            variant={compact ? 'body1' : 'h6'}
            sx={{ mb: spacing, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CheckCircle size={compact ? 16 : 20} color="#10b981" />
            Available ({results.available.length})
          </Typography>
          <Stack spacing={spacing}>
            {results.available.map((result, index) => (
              <CourseValidationItem key={index} result={result} compact={compact} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Courses Needing Rescheduling */}
      {results.notInTerm.length > 0 && (
        <Box sx={{ mb: sectionSpacing }}>
          <Typography
            variant={compact ? 'body1' : 'h6'}
            sx={{ mb: spacing, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AlertCircle size={compact ? 16 : 20} color="#f59e0b" />
            Needs Rescheduling ({results.notInTerm.length})
          </Typography>
          {!compact && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                These courses aren't offered in the target term, but are available in future terms. Consider moving them to
                the suggested term.
              </Typography>
            </Alert>
          )}
          <Stack spacing={spacing}>
            {results.notInTerm.map((result, index) => (
              <CourseValidationItem key={index} result={result} compact={compact} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Courses Not Found */}
      {results.notFound.length > 0 && (
        <Box sx={{ mb: sectionSpacing }}>
          <Typography
            variant={compact ? 'body1' : 'h6'}
            sx={{ mb: spacing, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <XCircle size={compact ? 16 : 20} color="#ef4444" />
            Not Found ({results.notFound.length})
          </Typography>
          {!compact && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                These courses couldn't be found in the target term or next 4 terms. They may be deprecated or the course
                code may be incorrect. Remove them to continue.
              </Typography>
            </Alert>
          )}
          <Stack spacing={spacing}>
            {results.notFound.map((result, index) => (
              <CourseValidationItem
                key={index}
                result={result}
                compact={compact}
                onRemove={onRemoveCourse ? () => onRemoveCourse(result.courseCode) : undefined}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
