'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import WizardFormLayout from '../WizardFormLayout';
import OptionTile from '../OptionTile';

const SEMESTERS = ['Winter', 'Spring', 'Summer', 'Fall'] as const;

interface GraduationDateScreenProps {
  defaultDate?: string;
  defaultSemester?: string;
  onSubmit: (date: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

/**
 * Calculates the graduation date based on semester and year
 * Winter: April 30
 * Spring: May 31
 * Summer: August 31
 * Fall: December 15
 */
function calculateGraduationDate(semester: string, year: number): string {
  switch (semester) {
    case 'Winter':
      return `${year}-04-30`;
    case 'Spring':
      return `${year}-05-31`;
    case 'Summer':
      return `${year}-08-31`;
    case 'Fall':
      return `${year}-12-15`;
    default:
      return '';
  }
}

/**
 * Extracts semester and year from ISO date string
 */
function extractSemesterAndYear(dateStr: string): { semester: string; year: number } | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth is 0-indexed

  let semester = '';
  if (month === 4) {
    semester = 'Winter';
  } else if (month === 5) {
    semester = 'Spring';
  } else if (month === 8) {
    semester = 'Summer';
  } else if (month === 12) {
    semester = 'Fall';
  }

  return semester ? { semester, year } : null;
}

export default function GraduationDateScreen({
  defaultDate = '',
  defaultSemester = '',
  onSubmit,
  onBack,
  isLoading = false,
}: Readonly<GraduationDateScreenProps>) {
  const currentYear = new Date().getFullYear();

  // Initialize from defaultDate if available, otherwise use defaultSemester
  const initialData = useMemo(() => {
    if (defaultDate) {
      const extracted = extractSemesterAndYear(defaultDate);
      if (extracted) {
        return { semester: extracted.semester, year: extracted.year };
      }
    }
    return {
      semester: defaultSemester || 'Fall',
      year: currentYear,
    };
  }, [defaultDate, defaultSemester, currentYear]);

  const [semester, setSemester] = useState(initialData.semester);
  const [year, setYear] = useState(String(initialData.year));

  const isValid = semester && year && Number(year) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (semester && year) {
      const date = calculateGraduationDate(semester, Number(year));
      onSubmit(date);
    }
  };

  // Generate year options (current year to 10 years from now)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i <= 10; i++) {
      years.push(currentYear + i);
    }
    return years;
  }, [currentYear]);

  return (
    <WizardFormLayout
      title="When do you plan to graduate?"
      subtitle="Select your graduation semester and year."
      footerButtons={
        <div className="flex gap-3 justify-between">
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-2 text-base font-medium"
          >
            ← Back
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-6 py-2 text-base font-medium"
          >
            {isLoading ? 'Continuing...' : 'Continue →'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Semester Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Graduation Semester
          </label>
          <div className="grid grid-cols-2 gap-3">
            {SEMESTERS.map((sem) => (
              <OptionTile
                key={sem}
                title={sem}
                selected={semester === sem}
                onClick={() => setSemester(sem)}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* Year Selection */}
        <div>
          <label htmlFor="grad-year" className="block text-sm font-medium text-gray-900 mb-2">
            Graduation Year
          </label>
          <select
            id="grad-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white"
            disabled={isLoading}
          >
            <option value="">Select a year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </form>
    </WizardFormLayout>
  );
}
