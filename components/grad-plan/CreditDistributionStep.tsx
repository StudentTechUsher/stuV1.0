/**
 * Credit Distribution Step Component
 *
 * Allows users to select a credit distribution strategy and see an estimated
 * completion term based on their preferences.
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  Alert,
} from '@mui/material';
import { Zap, Scale, Compass } from 'lucide-react';
import {
  calculateSemesterDistribution,
  SemesterAllocation,
  AcademicTermsConfig,
  CreditDistributionError,
  InvalidGraduationDateError,
  estimateCompletionTerm,
} from '@/lib/services/gradPlanGenerationService';
import { GraduationDateErrorBanner } from './GraduationDateErrorBanner';

interface CreditDistributionStepProps {
  totalCredits: number;
  totalCourses?: number;
  studentData: {
    admission_year: number;
    admission_term: string;
    est_grad_date: string;
  };
  hasTranscript?: boolean;
  academicTerms: AcademicTermsConfig;
  onComplete: (data: {
    type: 'fast_track' | 'balanced' | 'explore';
    includeSecondaryCourses: boolean;
    selectedTermIds: string[];
    suggestedDistribution: SemesterAllocation[];
  }) => void;
  onUpdateGraduationTimeline: (data: {
    est_grad_term: string;
    est_grad_date: string;
  }) => Promise<{ success: boolean; error?: string }>;
  initialStrategy?: 'fast_track' | 'balanced' | 'explore';
  initialIncludeSecondary?: boolean;
  onStudentDataChanged?: () => void;
}

const STRATEGIES = [
  {
    id: 'fast_track' as const,
    label: 'Fast Track',
    icon: Zap,
    description: '15-18 credits per semester',
    details: 'Graduate as quickly as possible with higher course loads',
    color: '#F59E0B', // amber
  },
  {
    id: 'balanced' as const,
    label: 'Balanced',
    icon: Scale,
    description: '12-18 credits per semester (variable)',
    details: 'Flexible approach that adapts to your needs each term',
    color: '#10B981', // green
  },
  {
    id: 'explore' as const,
    label: 'Explore',
    icon: Compass,
    description: '12-15 credits per semester',
    details: 'Lighter loads to explore interests and maintain balance',
    color: '#6366F1', // indigo
  },
];

const STRATEGY_YEAR_OFFSETS: Record<'fast_track' | 'balanced' | 'explore', number> = {
  fast_track: 3,
  balanced: 4,
  explore: 5,
};

export function CreditDistributionStep({
  totalCredits,
  totalCourses,
  studentData,
  hasTranscript = true,
  academicTerms,
  onComplete,
  onUpdateGraduationTimeline,
  initialStrategy,
  initialIncludeSecondary = false,
  onStudentDataChanged,
}: CreditDistributionStepProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'fast_track' | 'balanced' | 'explore' | null>(
    initialStrategy || null
  );

  // Initialize with all primary terms selected by default, secondary terms based on initialIncludeSecondary
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>(() => {
    const primaryTermIds = academicTerms.terms.primary.map(t => t.id);
    if (initialIncludeSecondary) {
      const secondaryTermIds = academicTerms.terms.secondary.map(t => t.id);
      return [...primaryTermIds, ...secondaryTermIds];
    }
    return primaryTermIds;
  });

  // Helper to determine if we should include secondary courses (for backward compatibility)
  const includeSecondaryCourses = academicTerms.terms.secondary.some(t =>
    selectedTermIds.includes(t.id)
  );

  const resolveTermLabel = React.useCallback((termId: string) => {
    const allTerms = [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
    const match = allTerms.find(
      term => term.id.toLowerCase() === termId.toLowerCase() || term.label.toLowerCase() === termId.toLowerCase()
    );
    if (match?.label) return match.label;
    return termId.charAt(0).toUpperCase() + termId.slice(1);
  }, [academicTerms]);

  const getTermMonthIndex = (termId: string) => {
    const termLower = termId.toLowerCase();
    const monthMap: Record<string, number> = {
      fall: 8,
      autumn: 8,
      winter: 0,
      spring: 4,
      summer: 5,
    };
    return monthMap[termLower] ?? 0;
  };

  const getFallbackCompletion = React.useCallback((
    strategy: 'fast_track' | 'balanced' | 'explore',
    includeSecondary: boolean
  ) => {
    const currentYear = new Date().getFullYear();
    const completionYear = currentYear + STRATEGY_YEAR_OFFSETS[strategy];
    const baseTermId = academicTerms.academic_year_start || studentData.admission_term || 'Fall';
    let termId = baseTermId;
    let year = completionYear;

    if (includeSecondary) {
      const ordering = academicTerms.ordering || [];
      const baseIndex = ordering.findIndex(
        term => term.toLowerCase() === baseTermId.toLowerCase()
      );
      if (ordering.length > 0 && baseIndex !== -1) {
        const prevIndex = (baseIndex - 1 + ordering.length) % ordering.length;
        const prevTermId = ordering[prevIndex];
        const baseMonth = getTermMonthIndex(baseTermId);
        const prevMonth = getTermMonthIndex(prevTermId);
        termId = prevTermId;
        if (prevMonth > baseMonth) {
          year -= 1;
        }
      }
    }

    return {
      termLabel: resolveTermLabel(termId),
      year,
    };
  }, [academicTerms, studentData, resolveTermLabel]);

  // Calculate distribution whenever strategy or selected terms change
  const distributionResult = useMemo(() => {
    if (!selectedStrategy) {
      return { distribution: null as SemesterAllocation[] | null, error: null as InvalidGraduationDateError | Error | null };
    }

    try {
      const distribution = calculateSemesterDistribution({
        totalCredits,
        strategy: selectedStrategy,
        selectedTermIds,
        academicTerms,
        admissionYear: studentData.admission_year,
        admissionTerm: studentData.admission_term,
        graduationDate: new Date(studentData.est_grad_date),
      });
      return { distribution, error: null };
    } catch (err) {
      console.error('Failed to calculate credit distribution:', err);
      if (err instanceof InvalidGraduationDateError) {
        return { distribution: null, error: err };
      }
      if (err instanceof CreditDistributionError) {
        return { distribution: null, error: new Error(err.message) };
      }
      return { distribution: null, error: new Error('Failed to calculate credit distribution. Please check your profile settings.') };
    }
  }, [
    selectedStrategy,
    selectedTermIds,
    totalCredits,
    academicTerms,
    studentData,
  ]);

  const { distribution, error } = distributionResult;

  // Calculate estimated completion for ALL strategies (for display on cards)
  const allStrategyCompletions = useMemo(() => {
    const completions: Record<'fast_track' | 'balanced' | 'explore', string | null> = {
      fast_track: null,
      balanced: null,
      explore: null,
    };

    STRATEGIES.forEach((strategy) => {
      try {
        if (!hasTranscript) {
          const fallback = getFallbackCompletion(strategy.id, includeSecondaryCourses);
          completions[strategy.id] = `${fallback.termLabel} ${fallback.year}`;
        } else {
          const estimate = estimateCompletionTerm({
            totalCredits,
            strategy: strategy.id,
            selectedTermIds,
            academicTerms,
            admissionYear: studentData.admission_year,
            admissionTerm: studentData.admission_term,
          });
          completions[strategy.id] = `${estimate.term} ${estimate.year}`;
        }
      } catch (err) {
        console.error(`Failed to estimate completion for ${strategy.id}:`, err);
        completions[strategy.id] = null;
      }
    });

    return completions;
  }, [
    selectedTermIds,
    totalCredits,
    academicTerms,
    studentData,
    hasTranscript,
    includeSecondaryCourses,
    getFallbackCompletion,
  ]);

  const handleDateUpdated = () => {
    // Notify parent to refresh student data
    if (onStudentDataChanged) {
      onStudentDataChanged();
    }
  };

  const handleContinue = () => {
    if (!selectedStrategy || !distribution) return;

    onComplete({
      type: selectedStrategy,
      includeSecondaryCourses,
      selectedTermIds,
      suggestedDistribution: distribution,
    });
  };

  const canContinue = selectedStrategy !== null && distribution !== null && !error;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Credit Distribution Strategy
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        Choose how you&apos;d like to distribute your {totalCredits} credits across semesters.
      </Typography>

      {/* Error Display */}
      {error && (
        error instanceof InvalidGraduationDateError ? (
          <GraduationDateErrorBanner
            error={error}
            studentData={studentData}
            onDateUpdated={handleDateUpdated}
            onUpdateGraduationTimeline={onUpdateGraduationTimeline}
          />
        ) : (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.message}
          </Alert>
        )
      )}

      {/* Total Credits and Courses */}
      <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
            Total Credits to Complete
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {totalCredits} credits
          </Typography>
          {totalCourses !== undefined && totalCourses > 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              {totalCourses} course{totalCourses !== 1 ? 's' : ''} selected
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Strategy Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {STRATEGIES.map((strategy) => {
          const Icon = strategy.icon;
          const isSelected = selectedStrategy === strategy.id;
          const completion = allStrategyCompletions[strategy.id];

          return (
            <Card
              key={strategy.id}
              onClick={() => setSelectedStrategy(strategy.id)}
              sx={{
                cursor: 'pointer',
                border: '2px solid',
                borderColor: isSelected ? strategy.color : 'divider',
                bgcolor: isSelected ? `${strategy.color}10` : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                  borderColor: strategy.color,
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: `${strategy.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={24} color={strategy.color} />
                  </Box>

                  <Box sx={{ width: '100%' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {strategy.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      {strategy.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                      {strategy.details}
                    </Typography>

                    {/* Estimated Completion for this strategy */}
                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                        Estimated Completion
                      </Typography>
                      {completion ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: strategy.color }}>
                          {completion}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          Unable to estimate
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Term Selection */}
      {selectedStrategy && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Select Terms to Include in Your Plan
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Choose which terms you want to take courses. Primary terms are typical full semesters, while secondary terms are optional lighter sessions.
          </Typography>

          {/* Primary Terms */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
            Primary Terms
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
            {academicTerms.terms.primary.map((term) => {
              const isSelected = selectedTermIds.includes(term.id);
              return (
                <Card
                  key={term.id}
                  onClick={() => {
                    setSelectedTermIds(prev =>
                      prev.includes(term.id)
                        ? prev.filter(id => id !== term.id)
                        : [...prev, term.id]
                    );
                  }}
                  sx={{
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'primary.50' : 'background.paper',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent sx={{ py: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Checkbox
                        checked={isSelected}
                        sx={{ p: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {term.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Full semester
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Secondary Terms */}
          {academicTerms.terms.secondary.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                Secondary Terms (Optional)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                {academicTerms.terms.secondary.map((term) => {
                  const isSelected = selectedTermIds.includes(term.id);
                  return (
                    <Card
                      key={term.id}
                      onClick={() => {
                        setSelectedTermIds(prev =>
                          prev.includes(term.id)
                            ? prev.filter(id => id !== term.id)
                            : [...prev, term.id]
                        );
                      }}
                      sx={{
                        cursor: 'pointer',
                        border: '1.5px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.50' : 'background.paper',
                        transition: 'all 0.2s ease-in-out',
                        opacity: isSelected ? 1 : 0.85,
                        '&:hover': {
                          borderColor: 'primary.main',
                          opacity: 1,
                          transform: 'translateY(-2px)',
                          boxShadow: 1,
                        },
                      }}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Checkbox
                            checked={isSelected}
                            size="small"
                            sx={{ p: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {term.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                              Lighter session
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* Continue Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          disabled={!canContinue}
          sx={{
            backgroundColor: 'var(--primary)',
            color: 'var(--foreground)',
            '&:hover': {
              backgroundColor: 'var(--hover-green)',
            },
          }}
        >
          Continue to Milestones & Constraints
        </Button>
      </Box>
    </Box>
  );
}

export default CreditDistributionStep;
