'use client';

import * as React from 'react';
import type { ProgramRequirement, Course } from '@/types/programRequirements';
import {
  Box,
  Typography,
  Chip,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface RequirementViewProps {
  requirement: ProgramRequirement;
}

// Helper to get sub-requirements (handles both naming conventions)
function getSubRequirements(req: ProgramRequirement): ProgramRequirement[] {
  if ('subRequirements' in req && req.subRequirements) return req.subRequirements;
  if ('subrequirements' in req && req.subrequirements) return req.subrequirements;
  return [];
}

function CourseView({ course }: { course: Course }) {
  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="body1" fontWeight={600} gutterBottom>
        {course.code} - {course.title}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Chip label={`${course.credits} credits`} size="small" color="primary" />

        {course.minCredits !== undefined && course.maxCredits !== undefined && (
          <Chip
            label={`Variable: ${course.minCredits}-${course.maxCredits} credits`}
            size="small"
            variant="outlined"
          />
        )}

        {course.prerequisite && course.prerequisite !== 'none' && (
          <Chip
            label={`Prereq: ${course.prerequisite}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}

        {course.termsOffered && course.termsOffered.length > 0 && (
          <Chip
            label={`Offered: ${course.termsOffered.join(', ')}`}
            size="small"
            sx={{ bgcolor: '#e3f2fd' }}
          />
        )}
      </Box>

      {(course.sequenceGroup || course.maxRepeats) && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {course.sequenceGroup && (
            <Chip
              label={`Sequence: ${course.sequenceGroup} (Order ${course.sequenceOrder || 1})`}
              size="small"
              sx={{ bgcolor: '#f3e5f5' }}
            />
          )}

          {course.maxRepeats && (
            <Chip
              label={`Max Repeats: ${course.maxRepeats}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );
}

function SubRequirementView({ subReq }: { subReq: ProgramRequirement }) {
  const nestedSubReqs = getSubRequirements(subReq);

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'grey.50'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Chip label={subReq.requirementId} size="small" color="primary" />
        <Typography variant="body2" fontWeight={600}>
          {subReq.description}
        </Typography>
      </Box>

      {subReq.notes && (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          {subReq.notes}
        </Alert>
      )}

      {'courses' in subReq && subReq.courses && subReq.courses.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Courses ({subReq.courses.length}):
          </Typography>
          {subReq.courses.map((course, idx) => (
            <CourseView key={idx} course={course} />
          ))}
        </Box>
      )}

      {/* Handle nested sub-requirements */}
      {nestedSubReqs.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Nested Requirements ({nestedSubReqs.length}):
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {nestedSubReqs.map((nestedReq, idx) => (
              <SubRequirementView key={idx} subReq={nestedReq} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function RequirementView({ requirement }: Readonly<RequirementViewProps>) {
  const subReqs = getSubRequirements(requirement);
  const directCourses = ('courses' in requirement && requirement.courses) ? requirement.courses : [];

  // Count all courses including from sub-requirements
  const totalCourses = React.useMemo(() => {
    let count = directCourses.length;
    const countSubReqCourses = (reqs: ProgramRequirement[]): number => {
      return reqs.reduce((sum, req) => {
        const courses = ('courses' in req && req.courses) ? req.courses.length : 0;
        const nested = getSubRequirements(req);
        return sum + courses + countSubReqCourses(nested);
      }, 0);
    };
    count += countSubReqCourses(subReqs);
    return count;
  }, [directCourses, subReqs]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip label={`ID: ${requirement.requirementId}`} size="small" color="primary" />
          <Chip label={`${totalCourses} total course${totalCourses !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: '#e8f5e9' }} />
        </Box>

        <Typography variant="h6" gutterBottom>
          {requirement.description}
        </Typography>

        {requirement.notes && (
          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="body2">{requirement.notes}</Typography>
          </Alert>
        )}
      </Box>


      {/* Sequencing Notes */}
      {'sequencingNotes' in requirement && requirement.sequencingNotes && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Sequencing Information
          </Typography>
          <Alert severity="warning">
            <Typography variant="body2">{requirement.sequencingNotes}</Typography>
          </Alert>
        </Box>
      )}

      {/* Other Requirement */}
      {'otherRequirement' in requirement && requirement.otherRequirement && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Additional Requirement
          </Typography>
          <Alert severity="warning">
            <Typography variant="body2">{requirement.otherRequirement}</Typography>
          </Alert>
        </Box>
      )}

      <Divider />

      {/* Direct Courses Section */}
      {directCourses.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Direct Courses ({directCourses.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {directCourses.map((course, index) => (
              <CourseView key={index} course={course} />
            ))}
          </Box>
        </Box>
      )}

      {/* Sub-Requirements Section */}
      {subReqs.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Sub-Requirements ({subReqs.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {subReqs.map((subReq, index) => (
              <Accordion key={index} defaultExpanded={index === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={subReq.requirementId} size="small" />
                    <Typography variant="body2">{subReq.description}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <SubRequirementView subReq={subReq} />
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      )}

      {/* Steps Section (for noteOnly type) */}
      {'steps' in requirement && requirement.steps && requirement.steps.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Steps
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {requirement.steps.map((step, index) => (
              <Box
                key={index}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  gap: 2
                }}
              >
                <Typography variant="body2" fontWeight={600} color="primary">
                  {index + 1}.
                </Typography>
                <Typography variant="body2">{step}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {!('steps' in requirement && requirement.steps && requirement.steps.length > 0) &&
       directCourses.length === 0 &&
       subReqs.length === 0 && (
        <Alert severity="warning">
          No courses, sub-requirements, or steps have been added to this requirement yet.
        </Alert>
      )}
    </Box>
  );
}
