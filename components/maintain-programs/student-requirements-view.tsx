'use client';

import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Badge
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockIcon from '@mui/icons-material/Lock';
import WarningIcon from '@mui/icons-material/Warning';
import type { ProgramRequirement, Course } from '@/types/programRequirements';

export interface StudentRequirementsViewProps {
  requirements: ProgramRequirement[];
  completedCourses?: string[]; // Course codes that are completed
}

export default function StudentRequirementsView({
  requirements,
  completedCourses = []
}: Readonly<StudentRequirementsViewProps>) {
  const [localCompleted, setLocalCompleted] = React.useState<Set<string>>(
    new Set(completedCourses)
  );
  const [expandedReqs, setExpandedReqs] = React.useState<Set<number | string>>(
    new Set(requirements.map((r) => r.requirementId))
  );

  const toggleCourse = (courseCode: string) => {
    const newSet = new Set(localCompleted);
    if (newSet.has(courseCode)) {
      newSet.delete(courseCode);
    } else {
      newSet.add(courseCode);
    }
    setLocalCompleted(newSet);
  };

  const toggleExpanded = (reqId: number | string) => {
    const newSet = new Set(expandedReqs);
    if (newSet.has(reqId)) {
      newSet.delete(reqId);
    } else {
      newSet.add(reqId);
    }
    setExpandedReqs(newSet);
  };

  const calculateProgress = (req: ProgramRequirement) => {
    if (req.type === 'noteOnly') {
      return { completed: 0, total: 0, percentage: 100, isComplete: true, earnedCredits: 0, requiredCredits: 0 };
    }

    if (req.type === 'allOf' || req.type === 'chooseNOf' || req.type === 'creditBucket') {
      const courses = req.courses || [];
      const completed = courses.filter((c) => localCompleted.has(c.code)).length;
      const total = courses.length;

      let isComplete = false;
      let earnedCredits = 0;
      let requiredCredits = 0;

      if (req.type === 'allOf') {
        isComplete = completed === total;
      } else if (req.type === 'chooseNOf') {
        const n = req.constraints.n || 1;
        isComplete = completed >= n;
      } else if (req.type === 'creditBucket') {
        earnedCredits = courses
          .filter((c) => localCompleted.has(c.code))
          .reduce((sum, c) => sum + c.credits, 0);
        requiredCredits = req.constraints.minTotalCredits || 0;
        isComplete = earnedCredits >= requiredCredits;
      }

      // Calculate percentage based on type
      let percentage = 0;
      if (req.type === 'creditBucket' && requiredCredits > 0) {
        percentage = Math.min((earnedCredits / requiredCredits) * 100, 100);
      } else if (total > 0) {
        percentage = (completed / total) * 100;
      }

      return { completed, total, percentage, isComplete, earnedCredits, requiredCredits };
    }

    return { completed: 0, total: 0, percentage: 0, isComplete: false, earnedCredits: 0, requiredCredits: 0 };
  };

  const getStatusColor = (req: ProgramRequirement) => {
    const progress = calculateProgress(req);
    if (progress.isComplete) return 'success';
    if (progress.completed > 0) return 'warning';
    return 'default';
  };

  const getStatusIcon = (req: ProgramRequirement) => {
    const progress = calculateProgress(req);
    if (progress.isComplete) {
      return <CheckCircleIcon color="success" />;
    }
    if (req.constraints?.admissionsGate) {
      return <LockIcon color="action" />;
    }
    return <RadioButtonUncheckedIcon color="action" />;
  };

  const renderCourseList = (courses: Course[], req: ProgramRequirement) => {
    return (
      <List dense>
        {courses.map((course, idx) => {
          const isCompleted = localCompleted.has(course.code);
          return (
            <ListItem
              key={idx}
              sx={{
                bgcolor: isCompleted ? 'success.50' : 'background.paper',
                borderRadius: 1,
                mb: 0.5,
                border: '1px solid',
                borderColor: isCompleted ? 'success.main' : 'divider'
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={isCompleted}
                  onChange={() => toggleCourse(course.code)}
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}
                    >
                      {course.code}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}
                    >
                      {course.title}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${course.credits} credits`}
                      size="small"
                      variant="outlined"
                    />
                    {course.prerequisite && course.prerequisite !== 'none' && (
                      <Chip
                        label={`Prereq: ${course.prerequisite}`}
                        size="small"
                        variant="outlined"
                        color="warning"
                      />
                    )}
                    {(course.terms && course.terms.length > 0) || (course.termsOffered && course.termsOffered.length > 0) && (
                      <Chip
                        label={(course.termsOffered || course.terms)?.join(', ')}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {course.maxRepeats && (
                      <Chip
                        label={course.maxRepeats === 1 ? 'Take once' : `Max ${course.maxRepeats}x`}
                        size="small"
                        variant="outlined"
                        color="info"
                      />
                    )}
                    {course.sequenceGroup && (
                      <Chip
                        label={`${course.sequenceGroup}${course.sequenceOrder ? ` (Block ${course.sequenceOrder})` : ''}`}
                        size="small"
                        variant="filled"
                        color="secondary"
                      />
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    );
  };

  const renderRequirementCard = (req: ProgramRequirement, index: number) => {
    const progress = calculateProgress(req);
    const isExpanded = expandedReqs.has(req.requirementId);

    return (
      <Card
        key={req.requirementId}
        sx={{
          mb: 2,
          border: '2px solid',
          borderColor: progress.isComplete ? 'success.main' : 'divider'
        }}
      >
        <Accordion
          expanded={isExpanded}
          onChange={() => toggleExpanded(req.requirementId)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                width: '100%',
                pr: 2
              }}
            >
              {getStatusIcon(req)}

              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  {req.description || `Requirement ${index + 1}`}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <Chip
                    label={req.type}
                    size="small"
                    color={getStatusColor(req)}
                    variant="outlined"
                  />
                  {req.constraints?.admissionsGate && (
                    <Chip
                      label="Admissions Gate"
                      size="small"
                      color="warning"
                      icon={<LockIcon />}
                    />
                  )}
                  {req.constraints?.minGrade && (
                    <Chip
                      label={`Min Grade: ${req.constraints.minGrade}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                {req.type !== 'noteOnly' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress.percentage}
                      sx={{ flex: 1, height: 8, borderRadius: 1 }}
                      color={progress.isComplete ? 'success' : 'primary'}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {req.type === 'creditBucket'
                        ? `${progress.earnedCredits} / ${progress.requiredCredits} credits`
                        : `${progress.completed} / ${progress.total}`
                      }
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </AccordionSummary>

          <AccordionDetails>
            {req.notes && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {req.notes}
              </Alert>
            )}

            {req.sequencingNotes && (
              <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Sequencing Information
                </Typography>
                <Typography variant="body2">{req.sequencingNotes}</Typography>
              </Alert>
            )}

            {req.otherRequirement && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Additional Requirement
                </Typography>
                <Typography variant="body2">{req.otherRequirement}</Typography>
              </Alert>
            )}

            {req.type === 'chooseNOf' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Complete {req.constraints.n} course{req.constraints.n !== 1 ? 's' : ''}{' '}
                from the following:
              </Alert>
            )}

            {req.type === 'creditBucket' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Earn at least {req.constraints.minTotalCredits} credits
                {req.constraints.maxTotalCredits && ` (up to ${req.constraints.maxTotalCredits} credits maximum)`}
                {' '}from the following courses:
              </Alert>
            )}

            {(req.type === 'allOf' ||
              req.type === 'chooseNOf' ||
              req.type === 'creditBucket') &&
              renderCourseList(req.courses || [], req)}

            {/* Sub-requirements placeholder */}
            {(req.type === 'allOf' || req.type === 'chooseNOf' || req.type === 'creditBucket') &&
              ((req as { subRequirements?: ProgramRequirement[] }).subRequirements?.length ||
               (req as { subrequirements?: ProgramRequirement[] }).subrequirements?.length) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Sub-Requirements
                </Typography>
                <Typography variant="body2">
                  This requirement has nested sub-requirements. Full visualization coming soon.
                </Typography>
              </Alert>
            )}

            {req.type === 'noteOnly' && (
              <List>
                {(req.steps || []).map((step, idx) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <Typography variant="body2" fontWeight="bold">
                        {idx + 1}.
                      </Typography>
                    </ListItemIcon>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            )}

            {req.type === 'sequence' && (
              <Alert severity="info">
                Sequence requirements not yet implemented in preview.
              </Alert>
            )}

            {req.type === 'optionGroup' && (
              <Alert severity="info">
                Option group requirements not yet implemented in preview.
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      </Card>
    );
  };

  const overallProgress = React.useMemo(() => {
    const completed = requirements.filter((r) => calculateProgress(r).isComplete).length;
    const total = requirements.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  }, [requirements, localCompleted]);

  return (
    <Box>
      {/* Overall Progress */}
      <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Overall Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={overallProgress.percentage}
              sx={{ flex: 1, height: 12, borderRadius: 2 }}
            />
            <Typography variant="h6">
              {overallProgress.completed} / {overallProgress.total}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {overallProgress.completed === overallProgress.total
              ? 'All requirements completed!'
              : `${overallProgress.total - overallProgress.completed} requirement${
                  overallProgress.total - overallProgress.completed !== 1 ? 's' : ''
                } remaining`}
          </Typography>
        </CardContent>
      </Card>

      {/* Individual Requirements */}
      {requirements.length === 0 ? (
        <Alert severity="info">No requirements defined yet.</Alert>
      ) : (
        requirements.map((req, idx) => renderRequirementCard(req, idx))
      )}

      {/* Demo Note */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Preview Mode
        </Typography>
        <Typography variant="body2">
          This is a demo of how students will see and interact with requirements.
          Check/uncheck courses to see progress tracking in action. Real student data
          will be populated from their transcripts and course history.
        </Typography>
      </Alert>
    </Box>
  );
}