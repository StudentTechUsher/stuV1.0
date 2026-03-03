import { describe, it, expect } from 'vitest';
import {
  OnboardingSchema,
  UpdatePlanNameSchema,
  UpdateGoalGradeSchema,
  GradPlanEditSchema,
} from '@/lib/validation/zodSchemas';

describe('Zod Schemas - Validation Tests', () => {
  describe('OnboardingSchema', () => {
    it('should validate a complete student profile', () => {
      const validData = {
        university_id: 1,
        email: 'student@example.com',
        fname: 'John',
        lname: 'Doe',
        est_grad_sem: 'Spring 2025',
        est_grad_date: '2025-05-15',
      };

      const result = OnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.university_id).toBe(1);
        expect(result.data.email).toBe('student@example.com');
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        university_id: 1,
        email: 'not-an-email',
        est_grad_sem: 'Spring 2025',
        est_grad_date: '2025-05-15',
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('email'))).toBe(
          true
        );
      }
    });

    it('should reject email exceeding max length', () => {
      const invalidData = {
        university_id: 1,
        email: 'a'.repeat(250) + '@example.com',
        est_grad_sem: 'Spring 2025',
        est_grad_date: '2025-05-15',
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative university ID', () => {
      const invalidData = {
        university_id: -1,
        email: 'student@example.com',
        est_grad_sem: 'Spring 2025',
        est_grad_date: '2025-05-15',
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject student without graduation semester', () => {
      const invalidData = {
        university_id: 1,
        email: 'student@example.com',
        est_grad_date: '2025-05-15',
        // missing est_grad_sem
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject student without graduation date', () => {
      const invalidData = {
        university_id: 1,
        email: 'student@example.com',
        est_grad_sem: 'Spring 2025',
        // missing est_grad_date
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from fname and lname', () => {
      const validData = {
        university_id: 1,
        email: 'student@example.com',
        fname: '  John  ',
        lname: '  Doe  ',
        est_grad_sem: 'Spring 2025',
        est_grad_date: '2025-05-15',
      };

      const result = OnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fname).toBe('John');
        expect(result.data.lname).toBe('Doe');
      }
    });

    it('should reject fname exceeding max length', () => {
      const invalidData = {
        university_id: 1,
        email: 'student@example.com',
        fname: 'a'.repeat(101),
        est_grad_sem: 'Spring 2025',
        est_grad_date: '2025-05-15',
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        email: 'student@example.com',
        // missing university_id, est_grad_sem, est_grad_date
      };

      const result = OnboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdatePlanNameSchema', () => {
    it('should validate a valid plan name', () => {
      const validData = { name: 'My Graduation Plan' };

      const result = UpdatePlanNameSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Graduation Plan');
      }
    });

    it('should reject empty name', () => {
      const invalidData = { name: '' };

      const result = UpdatePlanNameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('should reject name with only whitespace', () => {
      const invalidData = { name: '   ' };

      const result = UpdatePlanNameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from name', () => {
      const validData = { name: '  My Plan  ' };

      const result = UpdatePlanNameSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Plan');
      }
    });

    it('should reject name exceeding max length', () => {
      const invalidData = { name: 'a'.repeat(256) };

      const result = UpdatePlanNameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept name at max length boundary', () => {
      const validData = { name: 'a'.repeat(255) };

      const result = UpdatePlanNameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing name field', () => {
      const invalidData = {};

      const result = UpdatePlanNameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept special characters in name', () => {
      const validData = { name: 'Plan 2024-2025 (v2.1)' };

      const result = UpdatePlanNameSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject non-string name', () => {
      const invalidData = { name: 123 };

      const result = UpdatePlanNameSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateGoalGradeSchema', () => {
    it('should validate grade A', () => {
      const validData = { goalGrade: 'A' };

      const result = UpdateGoalGradeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate all valid grade values', () => {
      const validGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E'];

      validGrades.forEach((grade) => {
        const result = UpdateGoalGradeSchema.safeParse({ goalGrade: grade });
        expect(result.success).toBe(true);
      });
    });

    it('should validate null grade', () => {
      const validData = { goalGrade: null };

      const result = UpdateGoalGradeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid grade format', () => {
      const invalidData = { goalGrade: 'F' };

      const result = UpdateGoalGradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject lowercase grades', () => {
      const invalidData = { goalGrade: 'a' };

      const result = UpdateGoalGradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject numeric grades', () => {
      const invalidData = { goalGrade: 4.0 };

      const result = UpdateGoalGradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing goalGrade field', () => {
      const invalidData = {};

      const result = UpdateGoalGradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const invalidData = { goalGrade: '' };

      const result = UpdateGoalGradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      const invalidData = { goalGrade: '   ' };

      const result = UpdateGoalGradeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('GradPlanEditSchema', () => {
    it('should validate addCourse operation', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate removeCourse operation', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'removeCourse',
            courseId: 'PHYS-101',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate moveCourse operation', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'moveCourse',
            courseId: 'CHEM-101',
            fromTerm: 'SP2024',
            toTerm: 'FA2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate setAttr operation with string value', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'setAttr',
            key: 'notes',
            value: 'Plan updated',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate setAttr operation with number value', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'setAttr',
            key: 'priority',
            value: 1,
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate setAttr operation with boolean value', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'setAttr',
            key: 'isActive',
            value: true,
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate setAttr operation with null value', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'setAttr',
            key: 'description',
            value: null,
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate multiple operations', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
          {
            op: 'removeCourse',
            courseId: 'PHYS-101',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept non-UUID planId', () => {
      const validData = {
        planId: 'plan-123',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional version field', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
        ],
        version: 'v1.0.0',
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional actorUserId field', () => {
      const validData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
        ],
        actorUserId: 'user-456',
      };

      const result = GradPlanEditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty operations array', () => {
      const invalidData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing planId', () => {
      const invalidData = {
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty planId', () => {
      const invalidData = {
        planId: '',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
            termCode: 'SP2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject addCourse without courseId', () => {
      const invalidData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'addCourse',
            termCode: 'SP2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject addCourse without termCode', () => {
      const invalidData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'addCourse',
            courseId: 'MATH-101',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject moveCourse without fromTerm', () => {
      const invalidData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'moveCourse',
            courseId: 'CHEM-101',
            toTerm: 'FA2024',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid operation type', () => {
      const invalidData = {
        planId: '550e8400-e29b-41d4-a716-446655440000',
        operations: [
          {
            op: 'invalidOp',
            courseId: 'MATH-101',
          },
        ],
      };

      const result = GradPlanEditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
