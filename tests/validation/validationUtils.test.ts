import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ValidationError,
  validateRequest,
  formatValidationError,
  ValidationIssue,
} from '@/lib/validation/validationUtils';

describe('ValidationUtils - Validation Error Handling', () => {
  describe('ValidationError class', () => {
    it('should create a ValidationError with issues', () => {
      const issues: ValidationIssue[] = [
        { path: 'email', code: 'invalid_string', message: 'Invalid email' },
      ];

      const error = new ValidationError(issues);

      expect(error.name).toBe('ValidationError');
      expect(error.issues).toEqual(issues);
      expect(error.status).toBe(400);
    });

    it('should use custom error message', () => {
      const issues: ValidationIssue[] = [];
      const error = new ValidationError(issues, 'Custom error message');

      expect(error.message).toBe('Custom error message');
    });

    it('should extend Error class', () => {
      const issues: ValidationIssue[] = [];
      const error = new ValidationError(issues);

      expect(error instanceof Error).toBe(true);
    });

    it('should have empty issues array', () => {
      const error = new ValidationError([]);

      expect(error.issues).toHaveLength(0);
    });

    it('should have multiple issues', () => {
      const issues: ValidationIssue[] = [
        { path: 'email', code: 'invalid_string', message: 'Invalid email' },
        { path: 'password', code: 'too_small', message: 'Password too short' },
      ];

      const error = new ValidationError(issues);

      expect(error.issues).toHaveLength(2);
    });
  });

  describe('validateRequest function', () => {
    const testSchema = z.object({
      email: z.string().email(),
      count: z.number().positive(),
      name: z.string().min(1),
    });

    it('should validate correct data', () => {
      const validData = {
        email: 'test@example.com',
        count: 5,
        name: 'John',
      };

      const result = validateRequest(testSchema, validData);

      expect(result).toEqual(validData);
    });

    it('should throw ValidationError on invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        count: 5,
        name: 'John',
      };

      expect(() => validateRequest(testSchema, invalidData)).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError on negative count', () => {
      const invalidData = {
        email: 'test@example.com',
        count: -1,
        name: 'John',
      };

      expect(() => validateRequest(testSchema, invalidData)).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError on empty name', () => {
      const invalidData = {
        email: 'test@example.com',
        count: 5,
        name: '',
      };

      expect(() => validateRequest(testSchema, invalidData)).toThrow(
        ValidationError
      );
    });

    it('should include issue details in thrown error', () => {
      const invalidData = {
        email: 'invalid',
        count: -5,
        name: 'John',
      };

      try {
        validateRequest(testSchema, invalidData);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
        const validationError = error as ValidationError;
        expect(validationError.issues.length).toBeGreaterThan(0);
        expect(
          validationError.issues.some((issue) => issue.path === 'email')
        ).toBe(true);
        expect(
          validationError.issues.some((issue) => issue.path === 'count')
        ).toBe(true);
      }
    });

    it('should handle nested paths in error issues', () => {
      const nestedSchema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const invalidData = {
        user: {
          email: 'not-email',
        },
      };

      try {
        validateRequest(nestedSchema, invalidData);
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
        const validationError = error as ValidationError;
        expect(
          validationError.issues.some((issue) => issue.path === 'user.email')
        ).toBe(true);
      }
    });

    it('should reject null data for non-nullable schema', () => {
      expect(() => validateRequest(testSchema, null)).toThrow(ValidationError);
    });

    it('should reject undefined data for required fields', () => {
      const invalidData = {
        email: 'test@example.com',
        count: 5,
        // missing name
      };

      expect(() => validateRequest(testSchema, invalidData)).toThrow(
        ValidationError
      );
    });

    it('should coerce data types when appropriate', () => {
      const coercingSchema = z.object({
        count: z.coerce.number(),
      });

      const result = validateRequest(coercingSchema, { count: '5' });

      expect(result.count).toBe(5);
      expect(typeof result.count).toBe('number');
    });

    it('should transform data when appropriate', () => {
      const transformSchema = z.object({
        email: z.string().email().toLowerCase(),
      });

      const result = validateRequest(transformSchema, {
        email: 'TEST@EXAMPLE.COM',
      });

      expect(result.email).toBe('test@example.com');
    });

    it('should validate arrays', () => {
      const arraySchema = z.object({
        items: z.array(z.string()),
      });

      const validData = { items: ['a', 'b', 'c'] };
      const result = validateRequest(arraySchema, validData);
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    it('should validate optional fields', () => {
      const optionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const dataWithoutOptional = { required: 'value' };
      const result = validateRequest(optionalSchema, dataWithoutOptional);

      expect(result.required).toBe('value');
      expect(result.optional).toBeUndefined();
    });

    it('should validate with default values', () => {
      const defaultSchema = z.object({
        role: z.enum(['user', 'admin']).default('user'),
      });

      const result = validateRequest(defaultSchema, {});

      expect(result.role).toBe('user');
    });
  });

  describe('formatValidationError function', () => {
    it('should format single issue', () => {
      const issues: ValidationIssue[] = [
        { path: 'email', code: 'invalid_string', message: 'Invalid email' },
      ];
      const error = new ValidationError(issues);

      const formatted = formatValidationError(error);

      expect(formatted.ok).toBe(false);
      expect(formatted.error).toBe('invalid_input');
      expect(formatted.issues).toEqual(issues);
    });

    it('should format multiple issues', () => {
      const issues: ValidationIssue[] = [
        { path: 'email', code: 'invalid_string', message: 'Invalid email' },
        { path: 'password', code: 'too_small', message: 'Too short' },
      ];
      const error = new ValidationError(issues);

      const formatted = formatValidationError(error);

      expect(formatted.ok).toBe(false);
      expect(formatted.error).toBe('invalid_input');
      expect(formatted.issues).toHaveLength(2);
    });

    it('should include all issue properties', () => {
      const issues: ValidationIssue[] = [
        {
          path: 'user.email',
          code: 'invalid_format',
          message: 'Must be a valid email',
        },
      ];
      const error = new ValidationError(issues);

      const formatted = formatValidationError(error);
      const issue = formatted.issues[0];

      expect(issue.path).toBe('user.email');
      expect(issue.code).toBe('invalid_format');
      expect(issue.message).toBe('Must be a valid email');
    });

    it('should maintain issue order', () => {
      const issues: ValidationIssue[] = [
        { path: 'a', code: 'error1', message: 'Error A' },
        { path: 'b', code: 'error2', message: 'Error B' },
        { path: 'c', code: 'error3', message: 'Error C' },
      ];
      const error = new ValidationError(issues);

      const formatted = formatValidationError(error);

      expect(formatted.issues[0].path).toBe('a');
      expect(formatted.issues[1].path).toBe('b');
      expect(formatted.issues[2].path).toBe('c');
    });

    it('should return correct response structure', () => {
      const issues: ValidationIssue[] = [];
      const error = new ValidationError(issues);

      const formatted = formatValidationError(error);

      expect(Object.keys(formatted)).toContain('ok');
      expect(Object.keys(formatted)).toContain('error');
      expect(Object.keys(formatted)).toContain('issues');
      expect(Object.keys(formatted)).toHaveLength(3);
    });

    it('should work with errors from real validation', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      try {
        validateRequest(schema, { email: 'invalid', age: 10 });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
        const formatted = formatValidationError(error as ValidationError);

        expect(formatted.ok).toBe(false);
        expect(formatted.error).toBe('invalid_input');
        expect(formatted.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error message translation', () => {
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      age: z.number().min(18, 'Must be 18 or older'),
    });

    it('should capture email validation message', () => {
      try {
        validateRequest(schema, { email: 'not-email', password: 'pass', age: 20 });
        expect.fail('Should have thrown');
      } catch (error) {
        const validationError = error as ValidationError;
        const emailIssue = validationError.issues.find((i) => i.path === 'email');
        expect(emailIssue?.message).toContain('Invalid email format');
      }
    });

    it('should capture password validation message', () => {
      try {
        validateRequest(schema, { email: 'test@example.com', password: 'short', age: 20 });
        expect.fail('Should have thrown');
      } catch (error) {
        const validationError = error as ValidationError;
        const passwordIssue = validationError.issues.find((i) => i.path === 'password');
        expect(passwordIssue?.message).toContain('at least 8 characters');
      }
    });

    it('should capture age validation message', () => {
      try {
        validateRequest(schema, { email: 'test@example.com', password: 'password123', age: 15 });
        expect.fail('Should have thrown');
      } catch (error) {
        const validationError = error as ValidationError;
        const ageIssue = validationError.issues.find((i) => i.path === 'age');
        expect(ageIssue?.message).toContain('18 or older');
      }
    });
  });
});
