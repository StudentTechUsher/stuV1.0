'use client';

import React from 'react';
import type { CourseRecommendation } from '@/lib/services/courseRecommendationService';

interface CourseRecommendationPanelProps {
  recommendations: CourseRecommendation[];
  dropdownCount: number;
  onCourseSelect: (courseCode: string) => void;
  readOnly?: boolean;
  reviewMode?: boolean;
}

export default function CourseRecommendationPanel({
  recommendations,
  dropdownCount,
  onCourseSelect,
  readOnly,
  reviewMode,
}: Readonly<CourseRecommendationPanelProps>) {
  const isReadOnly = Boolean(readOnly || reviewMode);
  if (dropdownCount <= 3 || recommendations.length === 0) {
    return null; // Only show if more than 3 options
  }

  const topRecommendations = recommendations.slice(0, 3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 0:
        return 'Top Match';
      case 1:
        return 'Strong Match';
      case 2:
        return 'Good Match';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Recommended Courses Section */}
      <div className="rounded-lg border border-[var(--primary)] bg-[rgba(18,249,135,0.05)] p-4 dark:bg-[rgba(18,249,135,0.12)]">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Recommended Courses</h3>
          <p className="mt-1 text-xs text-muted-foreground">Based on your goals, interests, and major</p>
        </div>

        <div className="space-y-2">
          {topRecommendations.map((rec, idx) => (
            <div
              key={rec.courseId}
              className="cursor-pointer rounded-lg border border-[var(--primary)] bg-white p-3 transition-all hover:shadow-sm dark:bg-zinc-900/70 dark:hover:bg-zinc-900/90"
              onClick={() => {
                if (isReadOnly) return;
                onCourseSelect(rec.courseCode);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">
                      {rec.courseCode} — {rec.courseTitle}
                    </p>
                  </div>
                  {rec.matchReasons.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rec.matchReasons.join(' • ')}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 whitespace-nowrap rounded bg-[rgba(18,249,135,0.2)] px-2 py-1 text-xs font-medium text-black dark:bg-[rgba(18,249,135,0.28)]">
                  {getRankBadge(idx)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
