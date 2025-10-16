'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// === Type Definitions ===

export type CourseStatus = 'completed' | 'in-progress' | 'planned' | 'remaining';

export interface CourseDetail {
  id: string;
  code: string;
  title: string;
  credits: number;
  status: CourseStatus;
  term?: string;
  instructor?: string;
}

export interface Requirement {
  id: string | number;
  title: string;
  description: string;
  progress: number;
  total: number;
  status: 'completed' | 'in-progress' | 'remaining';
  courses: CourseDetail[];
}

export interface ExpandableCategoryData {
  name: string;
  totalCredits: number;
  percentComplete: number;
  color: string;
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  requirements: Requirement[];
}

// === Course Item Component ===

interface CourseItemProps {
  course: CourseDetail;
  categoryColor: string;
}

function CourseItem({ course, categoryColor }: CourseItemProps) {
  const statusConfig = {
    'completed': {
      icon: '✓',
      bg: 'bg-[color-mix(in_srgb,var(--primary)_12%,white)]',
      border: 'border-[color-mix(in_srgb,var(--primary)_38%,transparent)]',
      text: 'text-[color-mix(in_srgb,var(--foreground)_80%,var(--primary)_20%)]',
      label: 'Completed'
    },
    'in-progress': {
      icon: '⟳',
      bg: 'bg-[color-mix(in_srgb,var(--action-edit)_14%,white)]',
      border: 'border-[color-mix(in_srgb,var(--action-edit)_42%,transparent)]',
      text: 'text-[color-mix(in_srgb,var(--foreground)_82%,var(--action-edit)_18%)]',
      label: 'In Progress'
    },
    'planned': {
      icon: '◌',
      bg: 'bg-[color-mix(in_srgb,var(--muted)_22%,white)]',
      border: 'border-[color-mix(in_srgb,var(--muted-foreground)_36%,transparent)]',
      text: 'text-[color-mix(in_srgb,var(--foreground)_78%,var(--muted-foreground)_22%)]',
      label: 'Planned'
    },
    'remaining': {
      icon: '−',
      bg: 'bg-[color-mix(in_srgb,var(--muted)_18%,white)]',
      border: 'border-[color-mix(in_srgb,var(--muted-foreground)_32%,transparent)]',
      text: 'text-[color-mix(in_srgb,var(--muted-foreground)_75%,var(--foreground)_25%)]',
      label: 'Remaining'
    }
  };

  const config = statusConfig[course.status];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-white px-4 py-2.5 transition-all hover:shadow-sm">
      <div className="flex items-center gap-3">
        {/* Status badge */}
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold',
            config.bg,
            config.border,
            config.text
          )}
          aria-label={config.label}
          title={config.label}
        >
          {config.icon}
        </span>

        {/* Course info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)]">
              {course.code}
            </span>
            <span className="text-xs font-medium text-[color-mix(in_srgb,var(--muted-foreground)_75%,var(--foreground)_25%)]">
              {course.credits} cr
            </span>
          </div>
          <span className="text-xs text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
            {course.title}
          </span>
          {course.term && (
            <span className="text-[10px] text-[color-mix(in_srgb,var(--muted-foreground)_65%,transparent)]">
              {course.term}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// === Requirement Group Component ===

interface RequirementGroupProps {
  requirement: Requirement;
  requirementNumber: number;
  categoryColor: string;
}

function RequirementGroup({ requirement, requirementNumber, categoryColor }: RequirementGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const progressPercent = requirement.total > 0
    ? Math.round((requirement.progress / requirement.total) * 100)
    : 0;

  const statusColorMap = {
    'completed': 'var(--primary)',
    'in-progress': 'var(--action-edit)',
    'remaining': 'var(--muted-foreground)'
  };

  const statusColor = statusColorMap[requirement.status];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-white shadow-sm transition-all hover:shadow-md">
      {/* Requirement header - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: categoryColor }}
        aria-expanded={isExpanded}
        aria-controls={`requirement-${requirement.id}-content`}
      >
        <div className="flex items-center gap-3">
          {/* Requirement number circle */}
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: categoryColor }}
            aria-label={`Requirement ${requirementNumber}`}
          >
            {requirementNumber}
          </div>

          {/* Requirement info */}
          <div className="flex flex-col">
            <span className="text-base font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)]">
              {requirement.title}
            </span>
            <span className="text-sm text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
              {requirement.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold" style={{ color: statusColor }}>
              {requirement.progress}/{requirement.total}
            </span>
            <span className="text-xs text-[color-mix(in_srgb,var(--muted-foreground)_68%,var(--foreground)_32%)]">
              {progressPercent}%
            </span>
          </div>

          {/* Expand/collapse icon */}
          {isExpanded ? (
            <ChevronUp size={20} className="text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]" aria-hidden="true" />
          ) : (
            <ChevronDown size={20} className="text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden bg-[color-mix(in_srgb,var(--muted)_30%,transparent)]">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: categoryColor,
            background: `linear-gradient(90deg, ${categoryColor} 0%, color-mix(in srgb, ${categoryColor} 80%, black) 100%)`
          }}
          role="progressbar"
          aria-valuenow={requirement.progress}
          aria-valuemin={0}
          aria-valuemax={requirement.total}
          aria-label={`${requirement.title} progress: ${requirement.progress} of ${requirement.total}`}
        />
      </div>

      {/* Expandable course list */}
      {isExpanded && (
        <div
          id={`requirement-${requirement.id}-content`}
          className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--border)_50%,transparent)] bg-[color-mix(in_srgb,var(--muted)_8%,transparent)] p-4"
        >
          {requirement.courses.length > 0 ? (
            requirement.courses.map((course) => (
              <CourseItem key={course.id} course={course} categoryColor={categoryColor} />
            ))
          ) : (
            <p className="text-sm text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
              No courses assigned to this requirement yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// === Expandable Progress Category Component ===

export interface ExpandableProgressCategoryProps {
  category: ExpandableCategoryData;
}

export function ExpandableProgressCategory({ category }: ExpandableProgressCategoryProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const completedPercent = category.totalCredits > 0
    ? Math.round((category.completed / category.totalCredits) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Category header - clickable to expand */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-white p-4 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: category.color }}
        aria-expanded={isExpanded}
        aria-controls={`category-${category.name}-content`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            <h3 className="text-xl font-semibold text-[color-mix(in_srgb,var(--foreground)_92%,transparent)]">
              {category.name}
            </h3>
          </div>

          {/* Expand/collapse icon */}
          {isExpanded ? (
            <ChevronUp size={22} className="text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]" aria-hidden="true" />
          ) : (
            <ChevronDown size={22} className="text-[color-mix(in_srgb,var(--muted-foreground)_65%,var(--foreground)_35%)]" aria-hidden="true" />
          )}
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-2 text-sm text-[color-mix(in_srgb,var(--muted-foreground)_72%,var(--foreground)_28%)]">
          <span className="font-medium">{category.totalCredits} required credit hours</span>
          <span>•</span>
          <span className="font-semibold" style={{ color: category.color }}>
            {completedPercent}% complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${completedPercent}%`,
              background: `linear-gradient(90deg, ${category.color} 0%, color-mix(in srgb, ${category.color} 85%, black) 100%)`
            }}
            role="progressbar"
            aria-valuenow={category.completed}
            aria-valuemin={0}
            aria-valuemax={category.totalCredits}
            aria-label={`${category.name} progress: ${category.completed} of ${category.totalCredits} credits`}
          />
        </div>

        {/* Quick stats badges */}
        <div className="flex flex-wrap items-center gap-2">
          {category.completed > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_38%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,white)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_80%,var(--primary)_20%)]">
              <span className="text-base font-bold">✓</span>
              {category.completed} Completed
            </span>
          )}
          {category.inProgress > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--action-edit)_42%,transparent)] bg-[color-mix(in_srgb,var(--action-edit)_14%,white)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_82%,var(--action-edit)_18%)]">
              <span className="text-base font-bold">⟳</span>
              {category.inProgress} In Progress
            </span>
          )}
          {category.planned > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_36%,transparent)] bg-[color-mix(in_srgb,var(--muted)_22%,white)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--foreground)_78%,var(--muted-foreground)_22%)]">
              <span className="text-base font-bold">◌</span>
              {category.planned} Planned
            </span>
          )}
          {category.remaining > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--muted-foreground)_32%,transparent)] bg-[color-mix(in_srgb,var(--muted)_18%,white)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--muted-foreground)_75%,var(--foreground)_25%)]">
              <span className="text-base font-bold">−</span>
              {category.remaining} Remaining
            </span>
          )}
        </div>
      </button>

      {/* Expanded requirement list */}
      {isExpanded && (
        <div
          id={`category-${category.name}-content`}
          className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--border)_60%,transparent)] p-4"
          style={{
            backgroundColor: `color-mix(in srgb, ${category.color} 4%, white)`
          }}
        >
          {category.requirements.length > 0 ? (
            category.requirements.map((requirement, index) => (
              <RequirementGroup
                key={requirement.id}
                requirement={requirement}
                requirementNumber={index + 1}
                categoryColor={category.color}
              />
            ))
          ) : (
            <p className="text-sm text-[color-mix(in_srgb,var(--muted-foreground)_70%,var(--foreground)_30%)]">
              No requirements defined for this category yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
