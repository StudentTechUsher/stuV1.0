'use client';

import React from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showAll, setShowAll] = React.useState(false);

  if (dropdownCount <= 3 || recommendations.length === 0) {
    return null; // Only show if more than 3 options
  }

  const topRecommendations = recommendations.slice(0, 3);
  const otherCourses = recommendations.slice(3);
  const displayedOthers = showAll ? otherCourses : otherCourses.slice(0, 3);
  const hasMoreCourses = otherCourses.length > 3;

  const getScoreBadgeColor = (score: number) => {
    switch (score) {
      case 3:
        return 'bg-green-100 border-green-300 text-green-900';
      case 2:
        return 'bg-blue-100 border-blue-300 text-blue-900';
      case 1:
        return 'bg-amber-100 border-amber-300 text-amber-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Recommendations Section */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-2 border-amber-400 rounded-lg p-4 shadow-lg relative">
        <div className="absolute top-3 right-3 text-2xl">⭐</div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={24} className="text-amber-600" />
          <div>
            <h3 className="font-bold text-amber-900 text-lg">Recommended For You</h3>
            <p className="text-xs text-amber-700">Courses matching your goals, interests & major</p>
          </div>
        </div>

        <div className="space-y-2">
          {topRecommendations.map((rec, idx) => (
            <div
              key={rec.courseId}
              className="bg-white border-2 border-amber-300 rounded-lg p-3 cursor-pointer hover:bg-amber-50 hover:shadow-md transition-all hover:scale-101"
              onClick={() => onCourseSelect(rec.courseCode)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block text-lg">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    <p className="font-bold text-gray-900">
                      {rec.courseCode} — {rec.courseTitle}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 font-medium">
                    ✓ {rec.matchReasons.join(' • ')}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${getScoreBadgeColor(
                    rec.score
                  )}`}
                >
                  {rec.score}/3
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other Courses Section */}
      {otherCourses.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-between text-sm font-bold text-blue-900 hover:text-blue-700 mb-3 hover:bg-blue-100 px-2 py-2 rounded transition-colors"
          >
            <span>📚 {otherCourses.length} More Recommended Courses</span>
            {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {(showAll || !showAll) && (
            <div className="space-y-2">
              {displayedOthers.map(rec => (
                <div
                  key={rec.courseId}
                  className="bg-white border border-blue-200 rounded p-3 cursor-pointer hover:bg-blue-50 hover:shadow transition-all"
                  onClick={() => onCourseSelect(rec.courseCode)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {rec.courseCode} — {rec.courseTitle}
                      </p>
                      {rec.matchReasons.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          ✓ {rec.matchReasons.join(' • ')}
                        </p>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold border whitespace-nowrap ${getScoreBadgeColor(
                        rec.score
                      )}`}
                    >
                      {rec.score}/3
                    </span>
                  </div>
                </div>
              ))}

              {showAll && hasMoreCourses && (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="w-full text-center py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Show Less
                </button>
              )}

              {!showAll && hasMoreCourses && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full text-center py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Show All {otherCourses.length} Options
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
