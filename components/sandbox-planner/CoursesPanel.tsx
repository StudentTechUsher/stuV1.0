'use client';

import React, { useState } from 'react';
import { Course, CourseFilters } from './types';
import { CoursePill } from './CoursePill';

export interface CoursesPanelProps {
  courses: Course[];
  filters: CourseFilters;
  onFilterChange: (filters: CourseFilters) => void;
  onCoursePillClick: (course: Course) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

/**
 * CoursesPanel: Left sidebar with course list and filters
 */
export function CoursesPanel({
  courses,
  filters,
  onFilterChange,
  onCoursePillClick,
  isMobileOpen,
  onMobileClose,
}: CoursesPanelProps) {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const requirementTypes = ['Major', 'Minor', 'Gen Ed', 'Electives'];

  const handleRequirementToggle = (type: string) => {
    const updated = filters.requirementType.includes(type)
      ? filters.requirementType.filter((t) => t !== type)
      : [...filters.requirementType, type];

    onFilterChange({ ...filters, requirementType: updated });
  };

  const handleCreditsChange = (range: [number, number]) => {
    onFilterChange({ ...filters, creditRange: range });
  };

  const handleSearch = (term: string) => {
    onFilterChange({ ...filters, searchTerm: term });
  };

  const handleClearFilters = () => {
    onFilterChange({
      requirementType: [],
      creditRange: [0, 6],
      searchTerm: '',
    });
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed md:static top-0 left-0 h-screen md:h-full w-80 bg-white border-r border-muted-foreground/10 flex flex-col shadow-lg md:shadow-none transform transition-transform duration-300 z-40 md:z-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-muted-foreground/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-foreground">
              Courses Left to Complete
            </h3>
            <button
              onClick={onMobileClose}
              className="md:hidden p-1 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close courses panel"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {courses.length} course{courses.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Filters Section */}
        <div className="border-b border-muted-foreground/10">
          {/* Filter toggle */}
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">Filters</span>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${
                isFilterExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>

          {/* Filter content */}
          {isFilterExpanded && (
            <div className="px-6 py-4 space-y-4 bg-muted/30">
              {/* Requirement type */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Requirement Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {requirementTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleRequirementToggle(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        filters.requirementType.includes(type)
                          ? 'bg-primary text-background'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Credits range */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Credits: {filters.creditRange[0]} – {filters.creditRange[1]}
                </label>
                <input
                  type="range"
                  min="0"
                  max="6"
                  defaultValue={filters.creditRange[1]}
                  onChange={(e) =>
                    handleCreditsChange([filters.creditRange[0], parseInt(e.target.value)])
                  }
                  className="w-full"
                />
              </div>

              {/* Clear filters */}
              <button
                onClick={handleClearFilters}
                className="w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-muted-foreground/10">
          <input
            type="text"
            placeholder="Search by code or name..."
            value={filters.searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Courses list */}
        <div className="flex-1 overflow-y-auto">
          {courses.length > 0 ? (
            <div className="space-y-2 p-4">
              {courses.map((course) => (
                <CoursePill
                  key={course.id}
                  course={course}
                  onClick={() => {
                    onCoursePillClick(course);
                    // Close mobile panel after selection
                    onMobileClose();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {filters.searchTerm || filters.requirementType.length > 0
                  ? 'No courses match your filters'
                  : 'All courses have been placed!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
