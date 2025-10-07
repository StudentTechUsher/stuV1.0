'use client';

import * as React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import type { SubRequirement, ProgressCategory } from '@/types/program-progress';
import { getCategoryColor, getCourseStatusColor, getStatusBadgeText } from '@/lib/utils/progress';

interface SubrequirementListProps {
  subrequirements: SubRequirement[];
  category: ProgressCategory;
  isAdvisor?: boolean;
}

export default function SubrequirementList({
  subrequirements,
  category,
  isAdvisor = false,
}: SubrequirementListProps) {
  const categoryColor = getCategoryColor(category);

  if (!subrequirements || subrequirements.length === 0) {
    return null;
  }

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      {subrequirements.map((subreq, idx) => (
        <Box
          key={subreq.id}
          sx={{
            p: 2,
            mb: idx < subrequirements.length - 1 ? 1.5 : 0,
            backgroundColor: 'var(--muted)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}
        >
          {/* Subrequirement Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography
              variant="subtitle2"
              className="font-body-semi"
              sx={{
                fontSize: '0.875rem',
                color: 'var(--foreground)',
              }}
            >
              {subreq.title}
            </Typography>
            <Chip
              label={getStatusBadgeText(subreq.status)}
              size="small"
              sx={{
                backgroundColor:
                  subreq.status === 'SATISFIED'
                    ? 'var(--primary-15)'
                    : subreq.status === 'PARTIAL'
                      ? 'rgba(25, 118, 210, 0.1)'
                      : 'var(--muted)',
                color:
                  subreq.status === 'SATISFIED'
                    ? 'var(--primary)'
                    : subreq.status === 'PARTIAL'
                      ? 'var(--action-info)'
                      : 'var(--muted-foreground)',
                fontWeight: 600,
                fontSize: '0.7rem',
                height: '20px',
              }}
            />
          </Box>

          {/* Description */}
          {subreq.description && (
            <Typography
              variant="caption"
              className="font-body"
              sx={{
                display: 'block',
                mb: 1.5,
                color: 'var(--muted-foreground)',
                fontSize: '0.75rem',
              }}
            >
              {subreq.description}
            </Typography>
          )}

          {/* Credits/Count Requirements */}
          {(subreq.minCredits || subreq.minCount) && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1,
                color: categoryColor,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {subreq.minCredits
                ? `Minimum: ${subreq.minCredits} credit hours`
                : `Minimum: ${subreq.minCount} course${subreq.minCount !== 1 ? 's' : ''}`}
            </Typography>
          )}

          {/* Courses */}
          {subreq.courses && subreq.courses.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {subreq.courses.map((course) => {
                const isApplied = subreq.appliedCourseIds.includes(course.id);
                const statusColor = getCourseStatusColor(course.status);

                return (
                  <Box
                    key={course.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      backgroundColor: 'var(--background)',
                      borderRadius: '4px',
                      border: isApplied
                        ? `2px solid ${categoryColor}40`
                        : '1px solid var(--border)',
                      opacity: course.status === 'NOT_APPLICABLE' ? 0.5 : 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        className="font-mono"
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--foreground)',
                        }}
                      >
                        {course.code}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="font-body"
                        sx={{
                          display: 'block',
                          fontSize: '0.75rem',
                          color: 'var(--muted-foreground)',
                          mt: 0.25,
                        }}
                      >
                        {course.title}
                      </Typography>
                      {course.term && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: 'var(--muted-foreground)',
                            mt: 0.25,
                          }}
                        >
                          {course.term}
                        </Typography>
                      )}
                      {course.note && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: 'var(--action-info)',
                            fontStyle: 'italic',
                            mt: 0.5,
                          }}
                        >
                          Note: {course.note}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, ml: 2 }}>
                      <Chip
                        label={course.status.replace('_', ' ')}
                        size="small"
                        sx={{
                          backgroundColor: `${statusColor}15`,
                          color: statusColor,
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: '18px',
                          textTransform: 'capitalize',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--foreground)',
                        }}
                      >
                        {course.credits} cr
                      </Typography>
                      {course.source && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.65rem',
                            color: 'var(--muted-foreground)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {course.source === 'TRANSCRIPT'
                            ? 'Transcript'
                            : course.source === 'PLAN'
                              ? 'Plan'
                              : 'Override'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'var(--muted-foreground)',
                fontStyle: 'italic',
                fontSize: '0.75rem',
              }}
            >
              No courses currently applied
            </Typography>
          )}

          {/* Advisor Note */}
          {isAdvisor && subreq.advisorNote && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                backgroundColor: 'rgba(25, 118, 210, 0.05)',
                borderLeft: '3px solid var(--action-info)',
                borderRadius: '4px',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.75rem',
                  color: 'var(--action-info)',
                  fontWeight: 600,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Advisor Note:
              </Typography>
              <Typography
                variant="caption"
                className="font-body"
                sx={{
                  fontSize: '0.75rem',
                  color: 'var(--foreground)',
                }}
              >
                {subreq.advisorNote}
              </Typography>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
