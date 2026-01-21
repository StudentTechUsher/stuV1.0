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
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { Zap, Scale, Compass } from 'lucide-react';
import {
  calculateSemesterDistribution,
  SemesterAllocation,
  AcademicTermsConfig,
  CreditDistributionError,
  estimateCompletionTerm,
} from '@/lib/services/gradPlanGenerationService';

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
    suggestedDistribution: SemesterAllocation[];
  }) => void;
  initialStrategy?: 'fast_track' | 'balanced' | 'explore';
  initialIncludeSecondary?: boolean;
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
  initialStrategy,
  initialIncludeSecondary = false,
}: CreditDistributionStepProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'fast_track' | 'balanced' | 'explore' | null>(
    initialStrategy || null
  );
  const [includeSecondaryCourses, setIncludeSecondaryCourses] = useState(initialIncludeSecondary);
  const [error, setError] = useState<string | null>(null);

  const resolveTermLabel = (termId: string) => {
    const allTerms = [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
    const match = allTerms.find(
      term => term.id.toLowerCase() === termId.toLowerCase() || term.label.toLowerCase() === termId.toLowerCase()
    );
    if (match?.label) return match.label;
    return termId.charAt(0).toUpperCase() + termId.slice(1);
  };

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

  const getFallbackCompletion = (
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
  };

  // Calculate distribution whenever strategy or secondary toggle changes
  const distribution = useMemo<SemesterAllocation[] | null>(() => {
    if (!selectedStrategy) return null;

    try {
      setError(null);
      return calculateSemesterDistribution({
        totalCredits,
        strategy: selectedStrategy,
        includeSecondaryCourses,
        academicTerms,
        admissionYear: studentData.admission_year,
        admissionTerm: studentData.admission_term,
        graduationDate: new Date(studentData.est_grad_date),
      });
    } catch (err) {
      console.error('Failed to calculate credit distribution:', err);
      if (err instanceof CreditDistributionError) {
        setError(err.message);
      } else {
        setError('Failed to calculate credit distribution. Please check your profile settings.');
      }
      return null;
    }
  }, [
    selectedStrategy,
    includeSecondaryCourses,
    totalCredits,
    academicTerms,
    studentData,
    hasTranscript,
  ]);

  // Estimate completion based on strategy, independent of profile target date
  const estimatedCompletion = useMemo(() => {
    if (!selectedStrategy) return null;

    try {
      if (!hasTranscript) {
        const fallback = getFallbackCompletion(selectedStrategy, includeSecondaryCourses);
        return `${fallback.termLabel} ${fallback.year}`;
      }
      const estimate = estimateCompletionTerm({
        totalCredits,
        strategy: selectedStrategy,
        includeSecondaryCourses,
        academicTerms,
        admissionYear: studentData.admission_year,
        admissionTerm: studentData.admission_term,
      });
      return `${estimate.term} ${estimate.year}`;
    } catch (err) {
      console.error('Failed to estimate completion term:', err);
      return null;
    }
  }, [
    selectedStrategy,
    includeSecondaryCourses,
    totalCredits,
    academicTerms,
    studentData,
    hasTranscript,
  ]);

  const handleContinue = () => {
    if (!selectedStrategy || !distribution) return;

    onComplete({
      type: selectedStrategy,
      includeSecondaryCourses,
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
        Choose how you'd like to distribute your {totalCredits} credits across semesters.
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
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

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {strategy.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      {strategy.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {strategy.details}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Secondary Terms Toggle */}
      {selectedStrategy && (
        <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
          <CardContent>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeSecondaryCourses}
                  onChange={(e) => setIncludeSecondaryCourses(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Include Spring & Summer terms when possible
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Take lighter loads during optional terms to graduate sooner
                  </Typography>
                </Box>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Estimated Completion */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>
            Estimated Completion
          </Typography>
          {estimatedCompletion ? (
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {estimatedCompletion}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {error
                ? 'Unable to estimate completion with your current profile settings.'
                : selectedStrategy
                  ? 'We could not estimate a completion term with your current settings.'
                  : 'Select a strategy to see your estimated completion term.'}
            </Typography>
          )}
        </CardContent>
      </Card>

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
