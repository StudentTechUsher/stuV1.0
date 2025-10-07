'use client';

import * as React from 'react';
import { Box, Paper, Typography, Alert, Skeleton } from '@mui/material';
import type { ProgramProgressPayload, ProgressCategory, AdvisorAction } from '@/types/program-progress';
import ProgressTabs from './ProgressTabs';
import CategoryHeader from './CategoryHeader';
import KpiCounters from './KpiCounters';
import RequirementRow from './RequirementRow';
import AdvisorActions from './AdvisorActions';
import ProgressSummaryView from './ProgressSummaryView';
import { getCategoryTint } from '@/lib/utils/progress';

interface ProgramProgressPanelProps {
  data: ProgramProgressPayload | null;
  isLoading?: boolean;
  error?: string | null;
  isAdvisor?: boolean;
  onAdvisorAction?: (action: AdvisorAction) => void;
}

export default function ProgramProgressPanel({
  data,
  isLoading = false,
  error = null,
  isAdvisor = false,
  onAdvisorAction,
}: ProgramProgressPanelProps) {
  const [viewMode, setViewMode] = React.useState<'summary' | 'detail'>('summary');
  const [selectedCategory, setSelectedCategory] = React.useState<ProgressCategory>('MAJOR');
  const [expandedRequirements, setExpandedRequirements] = React.useState<Set<string>>(new Set());

  // Update selected category when data loads
  React.useEffect(() => {
    if (data?.categories && data.categories.length > 0) {
      const firstCategory = data.categories[0].category;
      setSelectedCategory(firstCategory);
    }
  }, [data]);

  const handleToggleRequirement = (reqId: string) => {
    setExpandedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  const handleAdvisorAction = (action: AdvisorAction) => {
    if (onAdvisorAction) {
      onAdvisorAction(action);
    }
  };

  const handleCategoryClick = (category: ProgressCategory) => {
    setSelectedCategory(category);
    setViewMode('detail');
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          height: '100%',
          overflow: 'auto',
          borderRadius: '12px',
        }}
      >
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={120} sx={{ mb: 3, borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={80} sx={{ mb: 2, borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={64} sx={{ mb: 1, borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={64} sx={{ mb: 1, borderRadius: '8px' }} />
        <Skeleton variant="rectangular" height={64} sx={{ borderRadius: '8px' }} />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          height: '100%',
          borderRadius: '12px',
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Unable to load program progress. Please try again later.
        </Typography>
      </Paper>
    );
  }

  // No data state
  if (!data || !data.categories || data.categories.length === 0) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          height: '100%',
          borderRadius: '12px',
        }}
      >
        <Alert severity="info" sx={{ mb: 2 }}>
          No program progress data available
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Progress information will appear here once your graduation plan is approved.
        </Typography>
      </Paper>
    );
  }

  const currentCategory = data.categories.find((cat) => cat.category === selectedCategory);

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        onClick={handleBackToSummary}
        sx={{
          p: 1.5,
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          cursor: viewMode === 'detail' ? 'pointer' : 'default',
          transition: 'background-color 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: viewMode === 'detail' ? 'var(--muted)' : 'var(--card)',
          },
        }}
      >
        <Typography
          variant="h6"
          className="font-brand-bold"
          sx={{
            fontSize: '1.1rem',
            color: 'var(--foreground)',
          }}
        >
          Program Progress
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            color: 'var(--muted-foreground)',
          }}
        >
          {viewMode === 'detail' ? 'Click to see all categories' : `Last updated: ${new Date(data.lastUpdatedISO).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`}
        </Typography>
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: viewMode === 'detail' ? getCategoryTint(selectedCategory) : 'transparent',
          transition: 'background-color 0.3s ease-in-out',
        }}
      >
        {viewMode === 'summary' ? (
          /* Summary View - All category progress bars */
          <ProgressSummaryView
            categories={data.categories}
            onCategoryClick={handleCategoryClick}
          />
        ) : (
          /* Detail View - Selected category details */
          <>
            {/* Tabs */}
            <Box sx={{ px: 1.5, pt: 1.5 }}>
              <ProgressTabs
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={data.categories.map((cat) => ({
                  category: cat.category,
                  label: cat.label,
                  overallPercent: cat.overallPercent,
                }))}
              />
            </Box>

            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {currentCategory ? (
                <>
                  {/* Category Header */}
                  <CategoryHeader
                    category={currentCategory.category}
                    label={currentCategory.label}
                    requiredHours={currentCategory.requiredHours}
                    overallPercent={currentCategory.overallPercent}
                    kpis={currentCategory.kpis}
                  />

                  {/* KPI Counters */}
                  <KpiCounters
                    completed={currentCategory.kpis.completed}
                    inProgress={currentCategory.kpis.inProgress}
                    planned={currentCategory.kpis.planned}
                    remaining={currentCategory.kpis.remaining}
                  />

                  {/* Requirements List */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      className="font-body-semi"
                      sx={{
                        fontSize: '0.75rem',
                        color: 'var(--muted-foreground)',
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Requirements ({currentCategory.requirements.length})
                    </Typography>
                    {currentCategory.requirements.map((req) => (
                      <Box key={req.id}>
                        <RequirementRow
                          requirement={req}
                          category={currentCategory.category}
                          isAdvisor={isAdvisor}
                          expanded={expandedRequirements.has(req.id)}
                          onToggle={() => handleToggleRequirement(req.id)}
                        />
                        {isAdvisor && expandedRequirements.has(req.id) && (
                          <Box sx={{ pl: 3, pr: 1.5, pb: 1.5 }}>
                            <AdvisorActions
                              requirementId={req.id}
                              currentStatus={req.status}
                              onAction={handleAdvisorAction}
                            />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Alert severity="warning">
                  Selected category not found
                </Alert>
              )}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
}
