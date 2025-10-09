'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import { useDraggable } from '@dnd-kit/core';
import { RequirementBubbles } from './RequirementBubbles';
import { CourseMoveField } from './CourseMoveField';

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
}

interface Term {
  term: string;
  notes?: string;
  courses?: Course[];
  credits_planned?: number;
}

interface DraggableCourseProps {
  course: Course;
  termIndex: number;
  courseIndex: number;
  isEditMode: boolean;
  onMoveCourse: (fromTermIndex: number, courseIndex: number, toTermNumber: number) => void;
  currentPlanData: Term[];
  movedCourses: Set<string>;
}

export function DraggableCourse({
  course,
  termIndex,
  courseIndex,
  isEditMode,
  onMoveCourse,
  currentPlanData,
  movedCourses,
}: DraggableCourseProps) {
  const courseId = `course-${termIndex}-${courseIndex}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: courseId,
    data: {
      course,
      termIndex,
      courseIndex,
    },
    disabled: !isEditMode,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0 : 1,
  } : undefined;

  // Check if this course has been moved
  const courseIdentifier = `${course.code}-${course.title}`;
  const hasMoved = movedCourses.has(courseIdentifier);

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      sx={{
        p: 2,
        backgroundColor: 'white',
        borderRadius: 2,
        border: hasMoved ? '2px solid var(--action-edit)' : (isEditMode ? '1px solid var(--primary)' : '1px solid var(--border)'),
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: isEditMode ? 'grab' : 'default',
        boxShadow: hasMoved ? '0 4px 12px rgba(255, 165, 0, 0.25)' : undefined,
        '&:hover': isEditMode ? {
          backgroundColor: hasMoved ? 'rgba(255, 165, 0, 0.1)' : 'var(--primary-22)',
          borderColor: hasMoved ? 'var(--action-edit)' : 'var(--hover-green)',
          transform: 'translateY(-2px)',
          boxShadow: hasMoved ? '0 6px 16px rgba(255, 165, 0, 0.35)' : '0 4px 12px rgba(18, 249, 135, 0.15)'
        } : {},
        '&:active': isEditMode ? {
          cursor: 'grabbing',
        } : {},
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="body2" className="font-body-medium" sx={{ fontWeight: 'bold', mb: 1 }}>
          {course.code}: {course.title}
        </Typography>
        {isEditMode && (
          <IconButton
            size="small"
            sx={{
              ml: 1,
              p: 0.5,
              color: 'var(--primary)',
              '&:hover': { backgroundColor: 'var(--primary-15)' }
            }}
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Add course edit functionality
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box>
        <Typography variant="caption" className="font-body" color="text.secondary" display="block">
          {course.credits} credits
        </Typography>
        {course.fulfills && Array.isArray(course.fulfills) && course.fulfills.length > 0 && (
          <RequirementBubbles fulfills={course.fulfills} />
        )}
        {isEditMode && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" className="font-body" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Move:
            </Typography>
            <CourseMoveField
              currentTerm={termIndex + 1}
              maxTerms={currentPlanData.length}
              course={course}
              termIndex={termIndex}
              courseIndex={courseIndex}
              onMoveCourse={onMoveCourse}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
