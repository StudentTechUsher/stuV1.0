"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ParsedCourse = {
  id?: string;
  term: string;
  subject: string;
  number: string;
  title: string;
  credits: number;
  grade: string | null;
  confidence: number | null;
  source_document?: string | null;
};

interface ParsedCoursesTableProps {
  documentId: string;
  onSaveComplete?: () => void;
}

export default function ParsedCoursesTable({
  documentId,
  onSaveComplete,
}: ParsedCoursesTableProps) {
  const [courses, setCourses] = useState<ParsedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_courses')
        .select('*')
        .eq('source_document', documentId)
        .order('term', { ascending: false })
        .order('subject', { ascending: true })
        .order('number', { ascending: true });

      if (error) {
        console.error('Load courses error:', error);
        setError('Failed to load courses');
        return;
      }

      setCourses(data || []);
    } catch (err) {
      console.error('Load courses error:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/courses/bulk-upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courses }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save courses');
      }

      onSaveComplete?.();
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save courses');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (index: number, field: keyof ParsedCourse, value: string | number) => {
    const updated = [...courses];
    updated[index] = { ...updated[index], [field]: value };
    setCourses(updated);
  };

  const handleDelete = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;

    const isLow = confidence < 0.7;
    return (
      <span
        className={`
          inline-flex items-center px-2 py-0.5 rounded text-xs font-body-medium
          ${isLow
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
            : 'bg-green-100 text-green-800 border border-green-300'
          }
        `}
      >
        {(confidence * 100).toFixed(0)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="font-body text-sm text-muted-foreground text-center py-8">
          No courses found. Please upload a transcript first.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-brand-bold text-lg">Parsed Courses</h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="
            px-4 py-2 rounded-lg
            bg-primary text-white font-body-medium text-sm
            hover:bg-hover-green transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="font-body text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-body-semi py-3 px-2">Term</th>
              <th className="text-left font-body-semi py-3 px-2">Subject</th>
              <th className="text-left font-body-semi py-3 px-2">Number</th>
              <th className="text-left font-body-semi py-3 px-2">Title</th>
              <th className="text-left font-body-semi py-3 px-2">Credits</th>
              <th className="text-left font-body-semi py-3 px-2">Grade</th>
              <th className="text-left font-body-semi py-3 px-2">Confidence</th>
              <th className="text-left font-body-semi py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, index) => (
              <tr
                key={course.id || index}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={course.term}
                    onChange={(e) => handleEdit(index, 'term', e.target.value)}
                    className="
                      w-full px-2 py-1 rounded border border-border
                      font-body text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    "
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={course.subject}
                    onChange={(e) => handleEdit(index, 'subject', e.target.value)}
                    className="
                      w-full px-2 py-1 rounded border border-border
                      font-body text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    "
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={course.number}
                    onChange={(e) => handleEdit(index, 'number', e.target.value)}
                    className="
                      w-full px-2 py-1 rounded border border-border
                      font-body text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    "
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={course.title}
                    onChange={(e) => handleEdit(index, 'title', e.target.value)}
                    className="
                      w-full px-2 py-1 rounded border border-border
                      font-body text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    "
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="number"
                    step="0.5"
                    value={course.credits}
                    onChange={(e) => handleEdit(index, 'credits', parseFloat(e.target.value))}
                    className="
                      w-20 px-2 py-1 rounded border border-border
                      font-body text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    "
                  />
                </td>
                <td className="py-3 px-2">
                  <input
                    type="text"
                    value={course.grade || ''}
                    onChange={(e) => handleEdit(index, 'grade', e.target.value)}
                    className="
                      w-16 px-2 py-1 rounded border border-border
                      font-body text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                    "
                  />
                </td>
                <td className="py-3 px-2">
                  {getConfidenceBadge(course.confidence)}
                </td>
                <td className="py-3 px-2">
                  <button
                    onClick={() => handleDelete(index)}
                    className="
                      text-destructive hover:text-destructive/80
                      font-body-medium text-xs
                      transition-colors
                    "
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-xs text-muted-foreground mt-4">
        Review and edit courses above. Low confidence scores (&lt;70%) are highlighted for your review.
      </p>
    </div>
  );
}
