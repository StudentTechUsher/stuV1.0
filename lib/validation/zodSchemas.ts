import { z } from 'zod';

/**
 * AUTHORIZATION: PUBLIC
 * Schema for user onboarding/profile completion after signup
 * Validates university selection, role assignment, and conditional graduation fields
 */
export const OnboardingSchema = z
  .object({
    university_id: z.number().int().positive('University ID must be a positive integer'),
    email: z
      .string()
      .email('Invalid email format')
      .max(254, 'Email must be at most 254 characters'),
    role: z
      .enum(['student', 'advisor', 'admin']),
    fname: z.string().trim().min(1).max(100).optional(),
    lname: z.string().trim().min(1).max(100).optional(),
    est_grad_sem: z.string().min(1).optional(),
    est_grad_date: z.string().optional(),
  })
  .refine(
    (data) =>
      data.role !== 'student' || (data.est_grad_sem && data.est_grad_date),
    {
      message: 'Graduation semester and date are required for student role',
      path: ['est_grad_sem'],
    }
  );

export type OnboardingInput = z.infer<typeof OnboardingSchema>;

/**
 * AUTHORIZATION: AUTHENTICATED (plan owner)
 * Schema for updating graduation plan name
 * Validates plan name format and length
 */
export const UpdatePlanNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Plan name cannot be empty')
    .max(255, 'Plan name must be at most 255 characters'),
});

export type UpdatePlanNameInput = z.infer<typeof UpdatePlanNameSchema>;

/**
 * AUTHORIZATION: AUTHENTICATED (plan owner)
 * Schema for updating course goal grade
 * Validates grade value (A, A-, B+, B, B-, C+, C, C-, D+, D, E, or null)
 */
export const UpdateGoalGradeSchema = z.object({
  goalGrade: z
    .enum(
      ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E'],
      {
        message: 'Goal grade must be one of: A, A-, B+, B, B-, C+, C, C-, D+, D, E',
      }
    )
    .or(z.null()),
});

export type UpdateGoalGradeInput = z.infer<typeof UpdateGoalGradeSchema>;

/**
 * AUTHORIZATION: AUTHENTICATED (plan owner)
 * Schema for graduation plan edit operations
 * Supports batch operations: addCourse, removeCourse, moveCourse, setAttr
 * Uses discriminated union for type safety across operation types
 *
 * @example
 * {
 *   planId: "plan-123",
 *   operations: [
 *     { op: "addCourse", courseId: "MATH-101", termCode: "SP2024" },
 *     { op: "removeCourse", courseId: "PHYS-101" }
 *   ]
 * }
 */
const PlanOperation = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('addCourse'),
    courseId: z.string().min(1, 'Course ID is required'),
    termCode: z.string().min(1, 'Term code is required'),
  }),
  z.object({
    op: z.literal('removeCourse'),
    courseId: z.string().min(1, 'Course ID is required'),
  }),
  z.object({
    op: z.literal('moveCourse'),
    courseId: z.string().min(1, 'Course ID is required'),
    fromTerm: z.string().min(1, 'From term is required'),
    toTerm: z.string().min(1, 'To term is required'),
  }),
  z.object({
    op: z.literal('setAttr'),
    key: z.string().min(1, 'Attribute key is required'),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
]);

export const GradPlanEditSchema = z.object({
  planId: z
    .string()
    .uuid('Invalid plan ID format'),
  operations: z
    .array(PlanOperation)
    .min(1, 'At least one operation is required'),
  version: z.string().optional(),
  actorUserId: z.string().optional(),
});

export type GradPlanEditInput = z.infer<typeof GradPlanEditSchema>;
