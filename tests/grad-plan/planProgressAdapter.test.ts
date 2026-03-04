import { describe, expect, it } from 'vitest';
import { buildPlanProgress } from '@/components/progress-overview/planProgressAdapter';
import type { Term } from '@/components/grad-planner/types';
import type { ProgramRow } from '@/types/program';
import type { ParsedCourse } from '@/lib/services/userCoursesService';

function makeProgram(): ProgramRow {
  return {
    id: 'prog-1',
    university_id: 1,
    name: 'Strategic Management (BS)',
    program_type: 'major',
    version: '1.0',
    created_at: '2026-01-01T00:00:00.000Z',
    modified_at: null,
    target_total_credits: 3,
    requirements: {
      programRequirements: [
        {
          requirementId: 1,
          description: 'Core',
          type: 'allOf',
          courses: [
            { code: 'ACCT 200', title: 'Managerial Accounting', credits: 3 },
          ],
        },
      ],
    },
  };
}

describe('planProgressAdapter', () => {
  it('treats completed transcript equivalents as completed over planned plan entries', () => {
    const terms: Term[] = [
      {
        term: 'Fall 2026',
        is_active: false,
        courses: [
          {
            code: 'ACCT 200',
            title: 'Managerial Accounting',
            credits: 3,
            fulfills: ['[Strategic Management (BS)] requirement 1'],
          },
        ],
      },
    ];

    const transcriptCourses: ParsedCourse[] = [
      {
        term: 'Winter 2025',
        subject: 'ACC',
        number: '200',
        title: 'Managerial Accounting',
        credits: 3,
        grade: 'A',
        status: 'completed',
      },
    ];

    const progress = buildPlanProgress({
      terms,
      programs: [makeProgram()],
      transcriptCourses,
    });

    const strategicMgmt = progress.categories.find((c) => c.name === 'Strategic Management (BS)');
    expect(strategicMgmt).toBeTruthy();
    expect(strategicMgmt?.completed).toBe(3);
    expect(strategicMgmt?.planned).toBe(0);

    const requirementCourse = strategicMgmt?.requirements[0]?.courses?.[0];
    expect(requirementCourse?.status).toBe('completed');
  });

  it('does not treat "In Progress" grade text as completed', () => {
    const transcriptCourses: ParsedCourse[] = [
      {
        term: 'Fall 2099',
        subject: 'ACC',
        number: '200',
        title: 'Managerial Accounting',
        credits: 3,
        grade: 'In Progress',
        status: undefined,
      },
    ];

    const progress = buildPlanProgress({
      terms: [],
      programs: [makeProgram()],
      transcriptCourses,
    });

    expect(progress.overallProgress.completedCredits).toBe(0);
    expect(progress.overallProgress.inProgressCredits).toBe(3);
  });

  it('treats historical "In Progress" transcript entries as completed', () => {
    const transcriptCourses: ParsedCourse[] = [
      {
        term: 'Fall Semester 2023',
        subject: 'ACC',
        number: '200',
        title: 'Principles of Accounting',
        credits: 3,
        grade: 'In Progress',
        status: 'in-progress',
      },
    ];

    const progress = buildPlanProgress({
      terms: [],
      programs: [makeProgram()],
      transcriptCourses,
    });

    expect(progress.overallProgress.completedCredits).toBe(3);
    expect(progress.overallProgress.inProgressCredits).toBe(0);
  });

  it('infers chooseNOf from "X of Y" descriptions so planned picks can fully satisfy requirement progress', () => {
    const program: ProgramRow = {
      id: 'prog-2',
      university_id: 1,
      name: 'Strategic Management (BS)',
      program_type: 'major',
      version: '1.0',
      created_at: '2026-01-01T00:00:00.000Z',
      modified_at: null,
      target_total_credits: 6,
      requirements: {
        programRequirements: [
          {
            requirementId: 5,
            description: 'Complete 2 of 6 Courses',
            type: 'allOf',
            courses: [
              { code: 'ENT 381', title: 'Entrep Lecture Series', credits: 1 },
              { code: 'ENT 382', title: 'Tech Entrep Lecture Series', credits: 1 },
              { code: 'MSB 289R', title: 'Healthcare Leadership Lectures', credits: 1 },
              { code: 'MSB 342', title: 'Product Lecture Series', credits: 1 },
              { code: 'MSB 380', title: 'Executive Lectures', credits: 1 },
              { code: 'MSB 381R', title: 'Social Impact Lectures', credits: 1 },
            ],
          },
        ],
      },
    };

    const terms: Term[] = [
      {
        term: 'Fall 2027',
        is_active: false,
        courses: [
          { code: 'ENT 381', title: 'Entrep Lecture Series', credits: 1 },
        ],
      },
      {
        term: 'Fall 2028',
        is_active: false,
        courses: [
          { code: 'ENT 382', title: 'Tech Entrep Lecture Series', credits: 1 },
        ],
      },
    ];

    const progress = buildPlanProgress({
      terms,
      programs: [program],
      transcriptCourses: [],
    });

    const category = progress.categories.find((c) => c.name === 'Strategic Management (BS)');
    expect(category).toBeTruthy();

    const requirement = category?.requirements[0];
    expect(requirement).toBeTruthy();
    expect(requirement?.title).toBe('Complete 2 of 6 Courses');
    expect(requirement?.description).toBe('Complete 2 courses');
    expect(requirement?.total).toBe(2);
    expect(requirement?.planned).toBe(2);
    expect(requirement?.progress).toBe(2);
    expect(requirement?.remaining).toBe(0);
  });
});
