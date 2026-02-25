'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Alert,
  Stack,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  Star,
  Clock,
  User,
  TrendingUp,
} from 'lucide-react';

export interface ConflictDetail {
  conflictType: 'time_overlap' | 'back_to_back' | 'exceeds_daily_hours' | 'blocks_lunch' | 'outside_time_window';
  message: string;
  conflictingWith: string;
}

export interface SectionAnalysis {
  offering_id?: number;
  section_label: string;
  instructor: string;
  days?: string;
  time?: string;
  location?: string;
  hasConflict: boolean;
  conflictCount: number;
  score: number;
  originalScore: number;
  recommended: boolean;
  conflicts: ConflictDetail[];
}

export interface CourseAnalysisData {
  courseCode: string;
  courseName: string;
  totalSections: number;
  sectionsWithConflicts: number;
  sectionsWithoutConflicts: number;
  allHaveConflicts: boolean;
  bestSection: SectionAnalysis | null;
  sections: SectionAnalysis[];
}

export interface SectionSelection {
  courseCode: string;
  sectionLabel: string;
  rank: 'primary' | 'backup1' | 'backup2';
}

interface CourseAnalysisResultsProps {
  analyses: CourseAnalysisData[];
  compact?: boolean;
  selections?: SectionSelection[];
  onSelectSection?: (courseCode: string, sectionLabel: string, rank: 'primary' | 'backup1' | 'backup2') => void;
  onDeselectSection?: (courseCode: string, sectionLabel: string) => void;
  allowBackups?: boolean;
}

function ScoreMeter({ score, compact = false }: { score: number; compact?: boolean }) {
  const theme = useTheme();

  const getColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontSize: compact ? '0.65rem' : '0.75rem' }}>
          Match Score
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: getColor(score),
            fontSize: compact ? '0.65rem' : '0.75rem',
          }}
        >
          {score}/100 - {getLabel(score)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          height: compact ? 4 : 6,
          borderRadius: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: getColor(score),
          },
        }}
      />
    </Box>
  );
}

function SectionCard({
  section,
  courseCode,
  compact = false,
  isExpanded = false,
  selectedRank,
  onSelect,
  onDeselect,
  disabledRanks = [],
}: {
  section: SectionAnalysis;
  courseCode: string;
  compact?: boolean;
  isExpanded?: boolean;
  selectedRank?: 'primary' | 'backup1' | 'backup2';
  onSelect?: (rank: 'primary' | 'backup1' | 'backup2') => void;
  onDeselect?: () => void;
  disabledRanks?: ('primary' | 'backup1' | 'backup2')[];
}) {
  const getBorderColor = () => {
    if (selectedRank === 'primary') return '#06C96C';
    if (selectedRank === 'backup1') return '#3b82f6';
    if (selectedRank === 'backup2') return '#f59e0b';
    if (section.recommended) return '#10b981';
    if (section.hasConflict) return '#ef4444';
    return '#d1d5db';
  };

  const getStatusChip = () => {
    if (selectedRank === 'primary') {
      return <Chip label="✓ Primary Choice" size="small" sx={{ bgcolor: '#06C96C', color: '#fff', fontWeight: 700 }} />;
    }
    if (selectedRank === 'backup1') {
      return <Chip label="✓ Backup 1" size="small" sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }} />;
    }
    if (selectedRank === 'backup2') {
      return <Chip label="✓ Backup 2" size="small" sx={{ bgcolor: '#f59e0b', color: '#fff', fontWeight: 700 }} />;
    }
    if (section.recommended) {
      return <Chip label="Recommended" color="success" size="small" icon={<Star size={14} />} />;
    }
    if (section.hasConflict) {
      return <Chip label={`${section.conflictCount} Conflict${section.conflictCount > 1 ? 's' : ''}`} color="error" size="small" />;
    }
    return <Chip label="Available" size="small" />;
  };

  const getRankLabel = (rank: 'primary' | 'backup1' | 'backup2') => {
    if (rank === 'primary') return 'Primary';
    if (rank === 'backup1') return 'Backup 1';
    return 'Backup 2';
  };

  return (
    <Accordion
      defaultExpanded={isExpanded}
      elevation={0}
      sx={{
        border: `2px solid ${getBorderColor()}`,
        borderRadius: 1,
        '&:before': { display: 'none' },
        mb: compact ? 0.75 : 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDown size={18} />}
        sx={{
          py: compact ? 1 : 1.5,
          minHeight: compact ? '48px' : '64px',
          '&.Mui-expanded': {
            minHeight: compact ? '48px' : '64px',
          }
        }}
      >
        <Box sx={{ width: '100%', pr: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: compact ? '0.875rem' : '1rem' }}>
              Section {section.section_label}
            </Typography>
            {getStatusChip()}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
            {section.days && section.time && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Clock size={14} />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {section.days} {section.time}
                </Typography>
              </Box>
            )}
            {section.instructor && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <User size={14} />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {section.instructor}
                </Typography>
              </Box>
            )}
          </Box>

          <ScoreMeter score={section.score} compact />
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 1 }}>
        {section.hasConflict && (
          <Alert severity="error" sx={{ mb: 1.5, py: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.8rem' }}>
              Conflicts:
            </Typography>
            <Stack spacing={0.25}>
              {section.conflicts.map((conflict, idx) => (
                <Typography key={idx} variant="body2" sx={{ fontSize: '0.75rem' }}>
                  • {conflict.message}
                </Typography>
              ))}
            </Stack>
          </Alert>
        )}

        {/* Single Conditional Selection Button */}
        {onSelect && onDeselect && (
          <Box sx={{ mt: 1.5 }}>
            {selectedRank ? (
              // Section is already selected - show remove button
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={onDeselect}
                fullWidth
                sx={{ textTransform: 'none', fontSize: '0.8rem', py: 0.5 }}
              >
                Remove from Calendar
              </Button>
            ) : (
              // Section not selected - show next available rank button
              (() => {
                // Determine which rank to offer next
                let nextRank: 'primary' | 'backup1' | 'backup2' | null = null;
                let buttonLabel = '';
                let buttonColor = '';
                let hoverColor = '';

                if (!disabledRanks.includes('primary')) {
                  nextRank = 'primary';
                  buttonLabel = 'Add as Primary';
                  buttonColor = '#06C96C';
                  hoverColor = '#059669';
                } else if (!disabledRanks.includes('backup1')) {
                  nextRank = 'backup1';
                  buttonLabel = 'Add as Backup 1';
                  buttonColor = '#3b82f6';
                  hoverColor = '#2563eb';
                } else if (!disabledRanks.includes('backup2')) {
                  nextRank = 'backup2';
                  buttonLabel = 'Add as Backup 2';
                  buttonColor = '#f59e0b';
                  hoverColor = '#d97706';
                }

                return nextRank ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onSelect(nextRank!)}
                    fullWidth
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      py: 0.5,
                      bgcolor: buttonColor,
                      '&:hover': {
                        bgcolor: hoverColor,
                      },
                    }}
                  >
                    {buttonLabel}
                  </Button>
                ) : null;
              })()
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function CourseAnalysisCard({
  analysis,
  compact = false,
  selections = [],
  onSelectSection,
  onDeselectSection,
  allowBackups = true,
}: {
  analysis: CourseAnalysisData;
  compact?: boolean;
  selections?: SectionSelection[];
  onSelectSection?: (courseCode: string, sectionLabel: string, rank: 'primary' | 'backup1' | 'backup2') => void;
  onDeselectSection?: (courseCode: string, sectionLabel: string) => void;
  allowBackups?: boolean;
}) {
  const theme = useTheme();

  // Get selections for this course
  const courseSelections = selections.filter(s => s.courseCode === analysis.courseCode);
  const usedRanks = courseSelections.map(s => s.rank);
  const primarySelection = courseSelections.find(s => s.rank === 'primary');
  const primarySectionLabel = primarySelection?.sectionLabel ?? null;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastPrimaryRef = useRef<string | null>(null);

  const getSelectionRank = (sectionLabel: string): 'primary' | 'backup1' | 'backup2' | undefined => {
    const selection = courseSelections.find(s => s.sectionLabel === sectionLabel);
    return selection?.rank;
  };

  // Check which ranks are available based on what's already selected
  const hasPrimary = usedRanks.includes('primary');
  const hasBackup1 = usedRanks.includes('backup1');

  // Get disabled ranks for each section
  const getDisabledRanks = (sectionLabel: string): ('primary' | 'backup1' | 'backup2')[] => {
    const selectedRank = getSelectionRank(sectionLabel);
    const disabled: ('primary' | 'backup1' | 'backup2')[] = [];

    // If this section is already selected, all other ranks are disabled
    if (selectedRank) {
      return ['primary', 'backup1', 'backup2'].filter(r => r !== selectedRank) as ('primary' | 'backup1' | 'backup2')[];
    }

    // Ranks already used by other sections
    disabled.push(...usedRanks);

    // Backup 1 is disabled if no primary selected yet or backups are not allowed
    if (!hasPrimary || !allowBackups) {
      disabled.push('backup1');
    }

    // Backup 2 is disabled if no backup 1 selected yet or backups are not allowed
    if (!hasBackup1 || !allowBackups) {
      disabled.push('backup2');
    }

    return disabled;
  };

  useEffect(() => {
    if (allowBackups || !primarySectionLabel) {
      setIsCollapsed(false);
      lastPrimaryRef.current = primarySectionLabel;
      return;
    }

    if (lastPrimaryRef.current !== primarySectionLabel) {
      setIsCollapsed(true);
      lastPrimaryRef.current = primarySectionLabel;
    }
  }, [allowBackups, primarySectionLabel]);

  const visibleSections = isCollapsed && primarySectionLabel
    ? analysis.sections.filter(section => section.section_label === primarySectionLabel)
    : analysis.sections;

  return (
    <Card
      elevation={0}
      sx={{
        border: '2px solid var(--border)',
        borderRadius: 2,
        mb: compact ? 1.5 : 2,
        boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <CardContent sx={{ p: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1.5 : 2 } }}>
        {/* Header - Compact */}
        <Box
          sx={{
            mb: 1.5,
            p: 1,
            borderRadius: 1,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(6, 201, 108, 0.12)' : 'rgba(6, 201, 108, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: compact ? '1rem' : '1.125rem' }}>
              {analysis.courseCode}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: hasPrimary ? '#06C96C' : 'text.secondary', fontSize: '0.7rem' }}>
              {hasPrimary ? 'P' : '-'}{hasBackup1 ? ' + B1' : ''}{hasBackup1 && usedRanks.includes('backup2') ? ' + B2' : ''}
            </Typography>
          </Box>
          {analysis.courseName && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {analysis.courseName}
            </Typography>
          )}
        </Box>

        {/* Summary Stats - Compact */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderRadius: 1,
            mb: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Total:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
              {analysis.totalSections}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircle size={14} color="#10b981" />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#10b981', fontSize: '0.7rem' }}>
              {analysis.sectionsWithoutConflicts}
            </Typography>
          </Box>
          {analysis.sectionsWithConflicts > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <XCircle size={14} color="#ef4444" />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#ef4444', fontSize: '0.7rem' }}>
                  {analysis.sectionsWithConflicts}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Warning if all have conflicts */}
        {analysis.allHaveConflicts && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ⚠️ All sections have conflicts with your schedule. You may need to adjust your calendar events or choose a different course.
            </Typography>
          </Alert>
        )}

        {/* All Sections */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Sections ({analysis.sections.length}):
            </Typography>
            {isCollapsed && primarySectionLabel && !allowBackups && (
              <Button
                size="small"
                variant="text"
                onClick={() => setIsCollapsed(false)}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Change primary
              </Button>
            )}
          </Box>
          <Stack spacing={compact ? 0.75 : 1}>
            {visibleSections.map((section) => (
              <SectionCard
                key={section.section_label}
                section={section}
                courseCode={analysis.courseCode}
                compact={compact}
                isExpanded={false}
                selectedRank={getSelectionRank(section.section_label)}
                onSelect={(rank) => onSelectSection?.(analysis.courseCode, section.section_label, rank)}
                onDeselect={() => onDeselectSection?.(analysis.courseCode, section.section_label)}
                disabledRanks={getDisabledRanks(section.section_label)}
              />
            ))}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export function CourseAnalysisResults({
  analyses,
  compact = false,
  selections = [],
  onSelectSection,
  onDeselectSection,
  allowBackups = true,
}: CourseAnalysisResultsProps) {
  const theme = useTheme();

  if (!analyses || analyses.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body2">No course analyses available. Run the analysis to get started.</Typography>
      </Alert>
    );
  }

  // Calculate how many courses have a primary selection (only primaries count!)
  const primarySelections = selections.filter(s => s.rank === 'primary');
  const coursesWithPrimary = new Set(primarySelections.map(s => s.courseCode)).size;
  const allCoursesHavePrimary = coursesWithPrimary === analyses.length;

  return (
    <Box>
      {/* Overall Summary - Compact */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid var(--border)',
          borderRadius: 2,
          mb: compact ? 1.5 : 2,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(6, 201, 108, 0.1)' : 'rgba(6, 201, 108, 0.05)',
        }}
      >
        <CardContent sx={{ py: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1.5 : 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}>
              <TrendingUp size={18} color="#06C96C" />
              Summary
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: allCoursesHavePrimary ? '#10b981' : '#f59e0b' }}>
              {coursesWithPrimary}/{analyses.length} Primary Selected
            </Typography>
          </Box>

          {/* Progress indicator - Compact */}
          {!allCoursesHavePrimary && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                ⚠️ Select a primary section for each course (then optionally add backups)
              </Typography>
            </Alert>
          )}
          {allCoursesHavePrimary && (
            <Alert severity="success" sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                ✅ All primary sections selected! Add backups if desired.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Individual Course Analyses */}
      {analyses.map((analysis, idx) => (
        <CourseAnalysisCard
          key={idx}
          analysis={analysis}
          compact={compact}
          selections={selections}
          onSelectSection={onSelectSection}
          onDeselectSection={onDeselectSection}
          allowBackups={allowBackups}
        />
      ))}
    </Box>
  );
}
