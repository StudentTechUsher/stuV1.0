import { describe, expect, it } from 'vitest';
import { validateAutomaticPlan } from '@/lib/grad-plan/automaticPlanValidator';

describe('validateAutomaticPlan', () => {
  const basePayload = {
    takenCourses: [
      {
        code: 'ENG 101',
        status: 'Completed',
        grade: 'A',
      },
    ],
    programs: [
      {
        programType: 'major',
        requirements: [
          {
            requirementId: 'major-core',
            selectedCourses: [{ code: 'CS 101' }],
          },
        ],
      },
      {
        programType: 'minor',
        requirements: [
          {
            requirementId: 'minor-core',
            selectedCourses: [{ code: 'MATH 201' }],
          },
        ],
      },
    ],
    generalEducation: [
      {
        requirementId: 'gen-ed-writing',
        selectedCourses: [{ code: 'ENG 101' }],
      },
    ],
    suggestedDistribution: [
      { term: 'Fall', year: 2026, minCredits: 12, maxCredits: 18 },
      { term: 'Spring', year: 2027, minCredits: 12, maxCredits: 18 },
    ],
  };

  it('returns valid when requirements and envelopes are satisfied', () => {
    const result = validateAutomaticPlan({
      payload: basePayload,
      finalPlan: {
        plan: [
          {
            term: 'Fall 2026',
            courses: [{ code: 'CS 101', credits: 15 }],
          },
          {
            term: 'Spring 2027',
            courses: [{ code: 'MATH 201', credits: 15 }],
          },
        ],
      },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags duplicate planned courses', () => {
    const result = validateAutomaticPlan({
      payload: basePayload,
      finalPlan: {
        plan: [
          {
            term: 'Fall 2026',
            courses: [{ code: 'CS 101', credits: 12 }],
          },
          {
            term: 'Spring 2027',
            courses: [{ code: 'CS 101', credits: 12 }],
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some(issue => issue.code === 'duplicate_course')).toBe(true);
    expect(result.suggestedRepairPhases).toContain('elective_fill');
  });

  it('flags completed transcript courses when re-planned', () => {
    const result = validateAutomaticPlan({
      payload: basePayload,
      finalPlan: {
        plan: [
          {
            term: 'Fall 2026',
            courses: [{ code: 'ENG 101', credits: 3 }],
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some(issue => issue.code === 'completed_course_replanned')).toBe(true);
  });

  it('flags missing requirements and envelope violations with phase hints', () => {
    const result = validateAutomaticPlan({
      payload: basePayload,
      finalPlan: {
        plan: [
          {
            term: 'Fall 2026',
            courses: [{ code: 'CS 101', credits: 4 }],
          },
          {
            term: 'Spring 2027',
            courses: [],
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some(issue => issue.code === 'missing_requirement')).toBe(true);
    expect(result.issues.some(issue => issue.code === 'credit_envelope_violation')).toBe(true);
    expect(result.suggestedRepairPhases).toContain('minor_fill');
    expect(result.suggestedRepairPhases).toContain('elective_fill');
  });

  it('requires all selected courses in a requirement to be satisfied', () => {
    const result = validateAutomaticPlan({
      payload: {
        ...basePayload,
        programs: [
          {
            programType: 'major',
            requirements: [
              {
                requirementId: 'major-sequence',
                selectedCourses: [{ code: 'CS 101' }, { code: 'CS 102' }],
              },
            ],
          },
        ],
        generalEducation: [],
      },
      finalPlan: {
        plan: [
          {
            term: 'Fall 2026',
            courses: [{ code: 'CS 101', credits: 15 }],
          },
          {
            term: 'Spring 2027',
            courses: [{ code: 'MATH 201', credits: 15 }],
          },
        ],
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some(issue => issue.code === 'missing_requirement')).toBe(true);
    expect(result.issues[0].details?.missingCourseCodes).toContain('CS 102');
  });
});
