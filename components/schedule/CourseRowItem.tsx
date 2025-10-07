'use client';

import React, { useState, useRef } from 'react';
import { CourseRow, SectionOption, InstructorOption } from '@/types/schedule';
import { RequirementBadges } from './RequirementBadges';
import { DayTimeChips } from './DayTimeChips';
import { CoursePopover } from './CoursePopover';
import { SectionPicker } from './SectionPicker';
import { InstructorPicker } from './InstructorPicker';
import { formatDifficulty } from '@/lib/utils/creditMath';
import { cn } from '@/lib/utils';

interface CourseRowItemProps {
  course: CourseRow;
  sectionOptions: SectionOption[];
  instructorOptions: InstructorOption[];
  onChangeSection: (courseId: string, newSectionId: string) => Promise<void>;
  onWithdraw: (courseId: string) => Promise<void>;
  onHover?: (courseId: string | null) => void;
  className?: string;
}

export function CourseRowItem({
  course,
  sectionOptions,
  instructorOptions,
  onChangeSection,
  onWithdraw,
  onHover,
  className,
}: CourseRowItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showInstructorPicker, setShowInstructorPicker] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const rowRef = useRef<HTMLTableRowElement>(null);
  const sectionRef = useRef<HTMLButtonElement>(null);
  const instructorRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowPopover(true);
    onHover?.(course.id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowPopover(false);
    onHover?.(null);
  };

  const handleWithdraw = async () => {
    if (!course.actions?.withdrawable) return;

    const confirmed = window.confirm(
      `Are you sure you want to withdraw from ${course.code}: ${course.title}?`
    );

    if (!confirmed) return;

    setIsWithdrawing(true);
    try {
      await onWithdraw(course.id);
    } catch (error) {
      console.error('Failed to withdraw:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <>
      <tr
        ref={rowRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'transition-colors group',
          isHovered && 'bg-[var(--muted)]/30',
          className
        )}
      >
        {/* Course */}
        <td className="px-4 py-4">
          <div>
            <div className="font-semibold text-sm text-[var(--foreground)]">
              {course.code}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {course.title}
            </div>
          </div>
        </td>

        {/* Section */}
        <td className="px-4 py-4">
          <button
            ref={sectionRef}
            onClick={() => setShowSectionPicker(true)}
            className={cn(
              'text-sm font-medium text-[var(--primary)]',
              'hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ring)] rounded',
              'px-1 -mx-1'
            )}
          >
            {course.section}
          </button>
        </td>

        {/* Difficulty */}
        <td className="px-4 py-4">
          <span className="text-sm text-[var(--foreground)]">
            {formatDifficulty(course.difficulty)}
          </span>
        </td>

        {/* Instructor */}
        <td className="px-4 py-4">
          <button
            ref={instructorRef}
            onClick={() => setShowInstructorPicker(true)}
            className={cn(
              'text-sm text-[var(--primary)]',
              'hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ring)] rounded',
              'px-1 -mx-1 text-left'
            )}
          >
            {course.instructorName}
          </button>
        </td>

        {/* Schedule */}
        <td className="px-4 py-4">
          <DayTimeChips meeting={course.meeting} compact />
        </td>

        {/* Location */}
        <td className="px-4 py-4">
          <div className="text-sm text-[var(--foreground)]">
            {course.location.building}
            {course.location.room && ` ${course.location.room}`}
          </div>
        </td>

        {/* Credits */}
        <td className="px-4 py-4">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {course.credits.toFixed(1)}
          </span>
        </td>

        {/* Requirement */}
        <td className="px-4 py-4">
          <RequirementBadges tags={course.requirementTags} />
        </td>

        {/* Actions */}
        <td className="px-4 py-4">
          <button
            onClick={handleWithdraw}
            disabled={!course.actions?.withdrawable || isWithdrawing}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium',
              'border border-[var(--border)]',
              'bg-transparent text-[var(--foreground)]',
              'hover:bg-[var(--muted)] transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </button>
        </td>
      </tr>

      {/* Course Popover */}
      {showPopover && rowRef.current && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{
            top: `${rowRef.current.getBoundingClientRect().top + window.scrollY - 10}px`,
            left: `${rowRef.current.getBoundingClientRect().right + 16}px`,
          }}
        >
          <div className="bg-[var(--popover)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)]">
            <CoursePopover course={course} />
          </div>
        </div>
      )}

      {/* Section Picker Modal */}
      <SectionPicker
        isOpen={showSectionPicker}
        onClose={() => setShowSectionPicker(false)}
        sections={sectionOptions}
        currentSectionId={course.id}
        onSelectSection={(sectionId) => onChangeSection(course.id, sectionId)}
        courseCode={course.code}
      />

      {/* Instructor Picker Popover */}
      <InstructorPicker
        isOpen={showInstructorPicker}
        onClose={() => setShowInstructorPicker(false)}
        instructors={instructorOptions}
        currentInstructorId={course.instructorId}
        onSelectInstructor={(sectionId) => onChangeSection(course.id, sectionId)}
        courseCode={course.code}
        anchorEl={instructorRef.current}
      />
    </>
  );
}
