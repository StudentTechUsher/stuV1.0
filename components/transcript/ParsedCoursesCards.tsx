"use client";

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Chip, IconButton, Tooltip } from '@mui/material';
import { Delete, School, CalendarToday, Grade } from '@mui/icons-material';
import { supabase } from '@/lib/supabaseClient';

type ParsedCourse = {
  id?: string;
  term: string | null;
  subject: string;
  number: string;
  title: string | null;
  credits: number | null;
  grade: string | null;
  confidence: number | null;
  source_document?: string | null;
};

interface ParsedCoursesCardsProps {
  userId?: string | null;
  onCoursesLoaded?: (count: number) => void;
}

export default function ParsedCoursesCards({
  userId,
  onCoursesLoaded,
}: ParsedCoursesCardsProps) {
  const [courses, setCourses] = useState<ParsedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, [userId]);

  const loadCourses = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', userId)
        .order('term', { ascending: false })
        .order('subject', { ascending: true })
        .order('number', { ascending: true });

      if (error) {
        console.error('Load courses error:', error);
        return;
      }

      setCourses(data || []);
      onCoursesLoaded?.(data?.length || 0);
    } catch (err) {
      console.error('Load courses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId: string | undefined) => {
    if (!courseId) return;
    if (!confirm('Delete this course?')) return;

    try {
      const { error } = await supabase
        .from('user_courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Delete error:', error);
        return;
      }

      setCourses(courses.filter(c => c.id !== courseId));
      onCoursesLoaded?.(courses.length - 1);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">Loading courses...</Typography>
      </Box>
    );
  }

  if (courses.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center', bgcolor: 'background.default' }}>
        <School sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          No transcript courses uploaded yet. Upload a transcript to see parsed courses here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
      {courses.map((course) => {
        const isLowConfidence = course.confidence !== null && course.confidence < 0.7;

        return (
          <Paper
            key={course.id}
            elevation={2}
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              position: 'relative',
              border: isLowConfidence ? '2px solid #fbbf24' : undefined,
              '&:hover': {
                boxShadow: 4,
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                  {course.subject} {course.number}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
                  {course.title || 'Untitled Course'}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => handleDelete(course.id)}
                sx={{ ml: 1 }}
                aria-label="Delete course"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
              {course.term && (
                <Chip
                  icon={<CalendarToday sx={{ fontSize: 14 }} />}
                  label={course.term}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              {course.credits !== null && (
                <Chip
                  label={`${course.credits} credits`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              {course.grade && (
                <Chip
                  icon={<Grade sx={{ fontSize: 14 }} />}
                  label={course.grade}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>

            {course.confidence !== null && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Confidence: {(course.confidence * 100).toFixed(0)}%
                  {isLowConfidence && (
                    <Chip
                      label="Review"
                      size="small"
                      color="warning"
                      sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Typography>
              </Box>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
