'use client';

import React from 'react';
import { CourseRow, SectionOption, InstructorOption } from '@/types/schedule';
import { CourseRowItem } from './CourseRowItem';
import { formatCredits, formatDifficulty } from '@/lib/utils/creditMath';
import { cn } from '@/lib/utils';

export interface SemesterDetailsCardProps {
  termLabel: string;            // "Winter 2025"
  addDropDeadline: string;      // ISO or label ("12 Sept")
  scheduleDifficulty?: number;  // 0..5 | undefined
  rows: CourseRow[];
  sectionOptionsMap: Record<string, SectionOption[]>;
  instructorOptionsMap: Record<string, InstructorOption[]>;
  onRowHover?: (courseId: string | null) => void; // to highlight in calendar
  onChangeSection: (courseId: string, newSectionId: string) => Promise<void>;
  onWithdraw: (courseId: string) => Promise<void>;
  className?: string;
}

export function SemesterDetailsCard({
  termLabel,
  addDropDeadline,
  scheduleDifficulty,
  rows,
  sectionOptionsMap,
  instructorOptionsMap,
  onRowHover,
  onChangeSection,
  onWithdraw,
  className,
}: SemesterDetailsCardProps) {
  const totalCredits = rows.reduce((sum, row) => sum + row.credits, 0);

  return (
    <div
      className={cn(
        'bg-[var(--card)] rounded-2xl shadow-[var(--shadow-lg)]',
        'overflow-hidden',
        className
      )}
      id="semester-details"
    >
      {/* Header Section - Black background with white text */}
      <div className="bg-black text-white px-6 md:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {termLabel} Classes
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="font-bold text-lg">{formatCredits(totalCredits)}</span>
              <span className="ml-1.5 opacity-90">total credit hours</span>
            </div>

            <div>
              <span className="font-bold text-lg">{formatDifficulty(scheduleDifficulty)}</span>
              <span className="ml-1.5 opacity-90">schedule difficulty</span>
            </div>

            <div className="text-sm opacity-90">
              <span className="font-medium">1st Term Add/Drop Deadline: </span>
              <span className="font-bold text-lg">{addDropDeadline}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Column Headers - Green band */}
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Course
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Sec
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Dif
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Instructor
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Hrs
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Requirement
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]"
                >
                  No courses scheduled for this semester
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <CourseRowItem
                  key={row.id}
                  course={row}
                  sectionOptions={sectionOptionsMap[row.id] || []}
                  instructorOptions={instructorOptionsMap[row.id] || []}
                  onChangeSection={onChangeSection}
                  onWithdraw={onWithdraw}
                  onHover={onRowHover}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
