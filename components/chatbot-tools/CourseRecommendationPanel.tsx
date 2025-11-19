'use client';

import React from 'react';
import type { CourseRecommendation } from '@/lib/services/courseRecommendationService';

interface CourseRecommendationPanelProps {
  recommendations: CourseRecommendation[];
  dropdownCount: number;
  onCourseSelect: (courseCode: string) => void;
}

export default function CourseRecommendationPanel({
  recommendations,
  dropdownCount,
  onCourseSelect,
}: Readonly<CourseRecommendationPanelProps>) {
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
      <div className="rounded-lg p-4 border" style={{ borderColor: 'var(--primary)', backgroundColor: 'rgba(18, 249, 135, 0.05)' }}>
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 text-base">Recommended Courses</h3>
          <p className="text-xs text-gray-600 mt-1">Based on your goals, interests, and major</p>
        </div>

        <div className="space-y-2">
          {topRecommendations.map((rec, idx) => (
            <div
              key={rec.courseId}
              className="bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm hover:border-gray-400"
              style={{ borderColor: 'var(--primary)' }}
              onClick={() => onCourseSelect(rec.courseCode)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">
                      {rec.courseCode} — {rec.courseTitle}
                    </p>
                  </div>
                  {rec.matchReasons.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {rec.matchReasons.join(' • ')}
                    </p>
                  )}
                </div>
                <span
                  className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium whitespace-nowrap text-gray-700"
                  style={{ backgroundColor: 'rgba(18, 249, 135, 0.2)' }}
                >
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
