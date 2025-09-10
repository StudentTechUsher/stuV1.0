'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import type { Course, SemesterMeta, SemesterId } from '@/types/graduation-plan';

interface JsonPreviewProps {
  courses: Course[];
  semestersMeta: Record<SemesterId, SemesterMeta>;
  termsPlanned: number;
  headerTitle: string;
  leftovers: Record<string, unknown>;
}

export default function JsonPreview({
  courses,
  semestersMeta,
  termsPlanned,
  headerTitle,
  leftovers,
}: Readonly<JsonPreviewProps>) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Build the complete data structure that would be saved to DB
  const graduationPlanData = {
    program: headerTitle.includes('—') ? headerTitle.split('—')[1].trim() : null,
    termsPlanned,
    courses: courses.map(course => ({
      id: course.id,
      code: course.code,
      title: course.title,
      credits: course.credits,
      semester: course.semester,
      requirement: course.requirement,
      // Add any other course properties
    })),
    semestersMeta,
    leftovers,
    metadata: {
      totalCredits: courses.reduce((sum, course) => sum + course.credits, 0),
      coursesCount: courses.length,
      lastUpdated: new Date().toISOString(),
    },
  };

  const jsonString = JSON.stringify(graduationPlanData, null, 2);

  return (
    <div className="mt-8 border border-gray-200 rounded-lg bg-gray-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Database JSON Preview (Dev Tool)
        </h3>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{
            fontSize: '0.75rem',
            textTransform: 'none',
            minWidth: 'auto',
            px: 2,
            py: 0.5,
          }}
        >
          {isExpanded ? 'Hide' : 'Show'} JSON
        </Button>
      </div>
      
      {isExpanded && (
        <div className="p-4">
          <div className="text-xs text-gray-600 mb-2">
            This shows the data structure that would be saved to your database:
          </div>
          <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-auto max-h-96 font-mono">
            {jsonString}
          </pre>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigator.clipboard.writeText(jsonString)}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                minWidth: 'auto',
                px: 2,
                py: 0.5,
              }}
            >
              Copy JSON
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => console.log('Graduation Plan Data:', graduationPlanData)}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                minWidth: 'auto',
                px: 2,
                py: 0.5,
              }}
            >
              Log to Console
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
