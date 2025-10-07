import { describe, it, expect } from '@jest/globals';
import {
  calculateTotalCredits,
  calculateScheduleDifficulty,
  formatCredits,
  formatDifficulty,
  formatRating,
} from '../creditMath';
import { CourseRow } from '@/types/schedule';

const mockCourses: CourseRow[] = [
  {
    id: '1',
    code: 'CS 101',
    title: 'Intro to CS',
    section: '001',
    credits: 3.0,
    difficulty: 2.5,
    instructorId: 'i1',
    instructorName: 'Prof A',
    meeting: { days: ['M', 'W'], start: '09:00', end: '10:00' },
    location: { building: 'TMCB' },
    requirementTags: [{ type: 'MAJOR' }],
  },
  {
    id: '2',
    code: 'MATH 112',
    title: 'Calculus',
    section: '002',
    credits: 4.0,
    difficulty: 3.8,
    instructorId: 'i2',
    instructorName: 'Prof B',
    meeting: { days: ['Tu', 'Th'], start: '10:00', end: '11:00' },
    location: { building: 'TMCB' },
    requirementTags: [{ type: 'GE' }],
  },
  {
    id: '3',
    code: 'ENG 101',
    title: 'Writing',
    section: '003',
    credits: 3.0,
    instructorId: 'i3',
    instructorName: 'Prof C',
    meeting: { days: ['M', 'W', 'F'], start: '11:00', end: '12:00' },
    location: { building: 'JFSB' },
    requirementTags: [{ type: 'GE' }],
  },
];

describe('creditMath', () => {
  describe('calculateTotalCredits', () => {
    it('should calculate total credits correctly', () => {
      expect(calculateTotalCredits(mockCourses)).toBe(10.0);
    });

    it('should handle empty array', () => {
      expect(calculateTotalCredits([])).toBe(0);
    });

    it('should handle decimal credits', () => {
      const courses: CourseRow[] = [
        { ...mockCourses[0], credits: 2.5 },
        { ...mockCourses[1], credits: 3.5 },
      ];
      expect(calculateTotalCredits(courses)).toBe(6.0);
    });
  });

  describe('calculateScheduleDifficulty', () => {
    it('should calculate average difficulty', () => {
      const result = calculateScheduleDifficulty(mockCourses);
      expect(result).toBe(3.2); // (2.5 + 3.8) / 2 = 3.15, rounded to 3.2
    });

    it('should return undefined when no difficulty data', () => {
      expect(calculateScheduleDifficulty([mockCourses[2]])).toBeUndefined();
    });

    it('should ignore courses without difficulty', () => {
      const result = calculateScheduleDifficulty(mockCourses);
      expect(result).toBe(3.2);
    });

    it('should handle empty array', () => {
      expect(calculateScheduleDifficulty([])).toBeUndefined();
    });
  });

  describe('formatCredits', () => {
    it('should format credits with one decimal', () => {
      expect(formatCredits(14)).toBe('14.0');
      expect(formatCredits(14.5)).toBe('14.5');
    });
  });

  describe('formatDifficulty', () => {
    it('should format difficulty with /5', () => {
      expect(formatDifficulty(3.2)).toBe('3.2/5');
    });

    it('should show —/5 for undefined', () => {
      expect(formatDifficulty(undefined)).toBe('—/5');
    });
  });

  describe('formatRating', () => {
    it('should format rating with /5', () => {
      expect(formatRating(4.5)).toBe('4.5/5');
    });

    it('should show — for undefined', () => {
      expect(formatRating(undefined)).toBe('—');
    });
  });
});
