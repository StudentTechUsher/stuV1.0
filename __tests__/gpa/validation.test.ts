/**
 * Unit tests for GPA validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateTargetGpa,
  validateCredits,
  validateGrade,
  validateRemainingCourse,
  validateRemainingCourses,
  validateDistributionRequest,
} from '../../lib/gpa/validation';

describe('GPA Validation', () => {
  describe('validateTargetGpa', () => {
    it('should accept valid target GPAs', () => {
      expect(validateTargetGpa(3.5)).toBe(3.5);
      expect(validateTargetGpa(0.0)).toBe(0.0);
      expect(validateTargetGpa(4.0)).toBe(4.0);
      expect(validateTargetGpa(2.75)).toBe(2.75);
    });

    it('should reject non-numeric values', () => {
      expect(() => validateTargetGpa('3.5')).toThrow(ValidationError);
      expect(() => validateTargetGpa(null)).toThrow(ValidationError);
      expect(() => validateTargetGpa(undefined)).toThrow(ValidationError);
    });

    it('should reject out-of-range values', () => {
      expect(() => validateTargetGpa(-0.1)).toThrow(ValidationError);
      expect(() => validateTargetGpa(4.1)).toThrow(ValidationError);
      expect(() => validateTargetGpa(5.0)).toThrow(ValidationError);
    });

    it('should reject non-finite values', () => {
      expect(() => validateTargetGpa(Infinity)).toThrow(ValidationError);
      expect(() => validateTargetGpa(NaN)).toThrow(ValidationError);
    });
  });

  describe('validateCredits', () => {
    it('should accept valid credit values', () => {
      expect(validateCredits(3)).toBe(3);
      expect(validateCredits(0)).toBe(0);
      expect(validateCredits(1.5)).toBe(1.5);
      expect(validateCredits(100)).toBe(100);
    });

    it('should reject negative values', () => {
      expect(() => validateCredits(-1)).toThrow(ValidationError);
      expect(() => validateCredits(-0.5)).toThrow(ValidationError);
    });

    it('should reject non-numeric values', () => {
      expect(() => validateCredits('3')).toThrow(ValidationError);
      expect(() => validateCredits(null)).toThrow(ValidationError);
    });

    it('should reject non-finite values', () => {
      expect(() => validateCredits(Infinity)).toThrow(ValidationError);
      expect(() => validateCredits(NaN)).toThrow(ValidationError);
    });

    it('should allow custom field names in errors', () => {
      try {
        validateCredits('bad', 'myField');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).fieldName).toBe('myField');
      }
    });
  });

  describe('validateGrade', () => {
    it('should accept valid grades', () => {
      expect(validateGrade('A')).toBe('A');
      expect(validateGrade('A-')).toBe('A-');
      expect(validateGrade('B+')).toBe('B+');
      expect(validateGrade('B')).toBe('B');
      expect(validateGrade('C')).toBe('C');
      expect(validateGrade('E')).toBe('E');
    });

    it('should accept null/undefined/empty as null', () => {
      expect(validateGrade(null)).toBeNull();
      expect(validateGrade(undefined)).toBeNull();
      expect(validateGrade('')).toBeNull();
    });

    it('should reject invalid grades', () => {
      expect(() => validateGrade('F')).toThrow(ValidationError);
      expect(() => validateGrade('A+')).toThrow(ValidationError);
      expect(() => validateGrade('ABC')).toThrow(ValidationError);
    });

    it('should reject non-string grades', () => {
      expect(() => validateGrade(123)).toThrow(ValidationError);
      expect(() => validateGrade({})).toThrow(ValidationError);
    });
  });

  describe('validateRemainingCourse', () => {
    it('should accept valid course objects', () => {
      const course = validateRemainingCourse({
        id: 'course-1',
        credits: 3,
        goalGrade: 'A',
      });

      expect(course.id).toBe('course-1');
      expect(course.credits).toBe(3);
      expect(course.goalGrade).toBe('A');
    });

    it('should accept course without goal grade', () => {
      const course = validateRemainingCourse({
        credits: 3,
      });

      expect(course.credits).toBe(3);
      expect(course.goalGrade).toBeUndefined();
    });

    it('should accept course without id', () => {
      const course = validateRemainingCourse({
        credits: 4,
        goalGrade: 'B',
      });

      expect(course.id).toBeUndefined();
      expect(course.credits).toBe(4);
    });

    it('should reject non-object courses', () => {
      expect(() => validateRemainingCourse(null)).toThrow(ValidationError);
      expect(() => validateRemainingCourse('string')).toThrow(ValidationError);
    });

    it('should reject courses with invalid credits', () => {
      expect(() => validateRemainingCourse({ credits: -1 })).toThrow(ValidationError);
      expect(() => validateRemainingCourse({ credits: 'three' })).toThrow(ValidationError);
    });

    it('should reject courses with invalid goal grades', () => {
      expect(() => validateRemainingCourse({ credits: 3, goalGrade: 'F' })).toThrow(
        ValidationError
      );
    });
  });

  describe('validateRemainingCourses', () => {
    it('should accept valid array of courses', () => {
      const courses = validateRemainingCourses([
        { credits: 3, goalGrade: 'A' },
        { credits: 4 },
        { credits: 1.5, goalGrade: 'B' },
      ]);

      expect(courses).toHaveLength(3);
      expect(courses[0].goalGrade).toBe('A');
      expect(courses[1].goalGrade).toBeUndefined();
    });

    it('should accept empty array', () => {
      const courses = validateRemainingCourses([]);

      expect(courses).toHaveLength(0);
    });

    it('should reject non-array input', () => {
      expect(() => validateRemainingCourses({})).toThrow(ValidationError);
      expect(() => validateRemainingCourses('array')).toThrow(ValidationError);
    });

    it('should reject array with invalid courses', () => {
      expect(() => validateRemainingCourses([
        { credits: 3 },
        { credits: -1 }, // Invalid
      ])).toThrow(ValidationError);
    });
  });

  describe('validateDistributionRequest', () => {
    it('should accept valid distribution request', () => {
      const request = validateDistributionRequest({
        targetGpa: 3.5,
        completedCredits: 60,
        completedQualityPoints: 210,
        remaining: [
          { credits: 3, goalGrade: 'A' },
          { credits: 4 },
        ],
      });

      expect(request.targetGpa).toBe(3.5);
      expect(request.completedCredits).toBe(60);
      expect(request.completedQualityPoints).toBe(210);
      expect(request.remaining).toHaveLength(2);
    });

    it('should reject non-object payload', () => {
      expect(() => validateDistributionRequest(null)).toThrow(ValidationError);
      expect(() => validateDistributionRequest('payload')).toThrow(ValidationError);
    });

    it('should reject payload with invalid targetGpa', () => {
      expect(() => validateDistributionRequest({
        targetGpa: 5.0, // Invalid
        completedCredits: 60,
        completedQualityPoints: 210,
        remaining: [],
      })).toThrow(ValidationError);
    });

    it('should reject payload with invalid credits', () => {
      expect(() => validateDistributionRequest({
        targetGpa: 3.5,
        completedCredits: -10, // Invalid
        completedQualityPoints: 210,
        remaining: [],
      })).toThrow(ValidationError);
    });

    it('should reject payload with invalid remaining courses', () => {
      expect(() => validateDistributionRequest({
        targetGpa: 3.5,
        completedCredits: 60,
        completedQualityPoints: 210,
        remaining: [{ credits: 'invalid' }], // Invalid credits
      })).toThrow(ValidationError);
    });

    it('should provide detailed error messages', () => {
      try {
        validateDistributionRequest({
          targetGpa: 3.5,
          completedCredits: 60,
          completedQualityPoints: 210,
          remaining: [
            { credits: 3 },
            { credits: -1 }, // Invalid at index 1
          ],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const msg = (error as Error).message;
        expect(msg).toContain('Course 1'); // Should mention index
      }
    });
  });
});
