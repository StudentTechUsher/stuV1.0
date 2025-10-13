"use client";

import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Chip, IconButton, Tooltip, TextField } from '@mui/material';
import { Delete, School, Grade, Edit, Save, Cancel } from '@mui/icons-material';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
  refreshTrigger?: number; // Add trigger prop for external refresh
}

export default function ParsedCoursesCards({
  userId,
  onCoursesLoaded,
  refreshTrigger = 0,
}: ParsedCoursesCardsProps) {
  const [courses, setCourses] = useState<ParsedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ParsedCourse>>({});
  const supabase = createSupabaseBrowserClient();

  const loadCourses = useCallback(async () => {
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
  }, [onCoursesLoaded, supabase, userId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses, refreshTrigger]); // Reload when refreshTrigger changes

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

  const handleEdit = (course: ParsedCourse) => {
    setEditingId(course.id || null);
    setEditForm({
      title: course.title,
      credits: course.credits,
      grade: course.grade,
      term: course.term,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (courseId: string | undefined) => {
    if (!courseId) return;

    try {
      const { error } = await supabase
        .from('user_courses')
        .update({
          title: editForm.title,
          credits: editForm.credits,
          grade: editForm.grade,
          term: editForm.term,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId);

      if (error) {
        console.error('Update error:', error);
        alert('Failed to update course');
        return;
      }

      // Update local state
      setCourses(courses.map(c =>
        c.id === courseId
          ? { ...c, ...editForm, updated_at: new Date().toISOString() }
          : c
      ));

      setEditingId(null);
      setEditForm({});
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update course');
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

  // Group courses by term
  const coursesByTerm = courses.reduce((acc, course) => {
    const term = course.term || 'Unknown Term';
    if (!acc[term]) {
      acc[term] = [];
    }
    acc[term].push(course);
    return acc;
  }, {} as Record<string, ParsedCourse[]>);

  // Sort terms (most recent first)
  const sortedTerms = Object.keys(coursesByTerm).sort((a, b) => b.localeCompare(a));

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {sortedTerms.map((term) => (
        <Box key={term} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {term}
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(auto-fill, minmax(280px, 1fr))',
            },
            gap: 2,
            width: '100%',
          }}>
            {coursesByTerm[term].map((course) => {
              const isLowConfidence = course.confidence !== null && course.confidence < 0.7;
              const isEditing = editingId === course.id;

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
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  {/* Header with course code and action buttons */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                        {course.subject} {course.number}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!isEditing ? (
                        <>
                          <Tooltip title="Edit course">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(course)}
                              aria-label="Edit course"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete course">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(course.id)}
                              aria-label="Delete course"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title="Save changes">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSaveEdit(course.id)}
                              aria-label="Save changes"
                            >
                              <Save fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              onClick={handleCancelEdit}
                              aria-label="Cancel"
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Course title - editable */}
                  {isEditing ? (
                    <TextField
                      size="small"
                      fullWidth
                      label="Course Title"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>
                      {course.title || 'Untitled Course'}
                    </Typography>
                  )}

                  {/* Course details - editable */}
                  {isEditing ? (
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <TextField
                        size="small"
                        label="Credits"
                        type="number"
                        value={editForm.credits || ''}
                        onChange={(e) => setEditForm({ ...editForm, credits: parseFloat(e.target.value) || null })}
                        sx={{ width: '100px' }}
                      />
                      <TextField
                        size="small"
                        label="Grade"
                        value={editForm.grade || ''}
                        onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                        sx={{ width: '80px' }}
                      />
                      <TextField
                        size="small"
                        label="Term"
                        value={editForm.term || ''}
                        onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
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
                  )}

                  {/* Confidence score */}
                  {course.confidence !== null && !isEditing && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">
                        Confidence: {(course.confidence * 100).toFixed(0)}%
                        {isLowConfidence && (
                          <Chip
                            label="Needs Review"
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
        </Box>
      ))}
    </Box>
  );
}
