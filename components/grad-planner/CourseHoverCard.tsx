import React, { useEffect, useState } from 'react';

interface Course {
  code: string;
  title: string;
  credits: number;
  fulfills?: string[];
  grade?: string;
  completed?: boolean;
  description?: string;
  offeredTerms?: string[];
}

interface CourseHoverCardProps {
  course: Course;
  visible: boolean;
  position?: { x: number; y: number };
  onClose?: () => void;
}

/**
 * Modern hover card that displays detailed course information
 * Shows on hover over course codes in space view
 * Displays: code, title, credits, description, offered terms, status, and grade (if completed)
 */
export function CourseHoverCard({
  course,
  visible,
  position,
  onClose
}: CourseHoverCardProps) {
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (position) {
      // Position card slightly above and centered on the course code
      const offsetX = -75; // Center the card horizontally
      const offsetY = -10; // Position above the course code

      setCardPosition({
        top: position.y + offsetY,
        left: position.x + offsetX
      });
    }
  }, [position]);

  if (!visible) return null;

  const isCompleted = course.completed || !!course.grade;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        top: `${cardPosition.top}px`,
        left: `${cardPosition.left}px`,
        transform: 'translateX(-50%) translateY(-100%)'
      }}
    >
      {/* Popover Arrow */}
      <div
        className="absolute bottom-0 left-1/2 w-2 h-2 bg-[var(--card)] border-b border-r border-[var(--border)] pointer-events-none"
        style={{
          transform: 'translateX(-50%) translateY(50%) rotate(45deg)',
          boxShadow: '1px 1px 2px rgba(0,0,0,0.05)'
        }}
      />

      {/* Card Container */}
      <div className="
        max-w-xs w-80 rounded-lg border border-[var(--border)] bg-[var(--card)]
        shadow-lg p-4 space-y-3 animate-in fade-in duration-200
        pointer-events-auto
      ">
        {/* Course Code & Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-header-bold text-sm text-[var(--primary)] uppercase tracking-wide">
              {course.code}
            </h4>
            <p className="font-body text-xs text-[var(--muted-foreground)] mt-0.5">
              {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
            </p>
          </div>

          {/* Status Badge */}
          {isCompleted ? (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-15)] px-2.5 py-1 text-xs font-body-semi text-[var(--hover-green)]">
                ✓ Complete
              </span>
              {course.grade && (
                <span className="text-sm font-header-bold text-[var(--foreground)]">
                  Grade: {course.grade}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[var(--primary-15)] px-2.5 py-1 text-xs font-body-semi text-[var(--primary)]">
              Planned
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)]" />

        {/* Course Title */}
        <div>
          <p className="font-body-semi text-sm text-[var(--foreground)] leading-snug">
            {course.title}
          </p>
        </div>

        {/* Description (if available) */}
        {course.description && (
          <div>
            <p className="font-body text-xs text-[var(--muted-foreground)] leading-relaxed">
              {course.description}
            </p>
          </div>
        )}

        {/* Offered Terms (if available) */}
        {course.offeredTerms && course.offeredTerms.length > 0 && (
          <div>
            <p className="font-body-semi text-xs text-[var(--muted-foreground)] mb-1.5">
              Typically offered:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {course.offeredTerms.map((term, idx) => (
                <span
                  key={idx}
                  className="inline-flex px-2 py-1 rounded bg-[var(--secondary)] text-[var(--secondary-foreground)] text-xs font-body"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Requirements Fulfilled (if available) */}
        {course.fulfills && course.fulfills.length > 0 && (
          <div>
            <p className="font-body-semi text-xs text-[var(--muted-foreground)] mb-1.5">
              Fulfills:
            </p>
            <div className="space-y-1">
              {course.fulfills.map((req, idx) => (
                <div
                  key={idx}
                  className="text-xs font-body text-[var(--foreground)] flex items-start gap-2"
                >
                  <span className="text-[var(--primary)] mt-0.5 flex-shrink-0">•</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
