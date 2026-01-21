/**
 * Mock graduation plan data for testing and development
 * This data is used for component testing - no backend connection required
 */

// Multiple plans for testing plan switching
export const mockGradPlans = [
  {
    planId: 'preview-001',
    planName: 'Finance Major - Class of 2027',
    studentName: 'Preview Student',
    programName: 'Finance',
    totalCredits: 120,
    earnedCredits: 78,

    terms: [
      // Fall 2023 - Completed term
      {
        id: 1,
        label: 'Fall 2023',
        isActive: false,
        courses: [
          {
            id: 'c1',
            code: 'FIN 201',
            title: 'Principles of Finance',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['Major', 'Finance Core'],
            grade: 'A-'
          },
          {
            id: 'c2',
            code: 'ACC 200',
            title: 'Principles of Accounting',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['Major'],
            grade: 'B+'
          },
          {
            id: 'c3',
            code: 'MATH 112',
            title: 'Calculus I',
            credits: 4,
            status: 'completed' as const,
            fulfills: ['General Education', 'Foundations'],
            grade: 'A'
          },
          {
            id: 'c4',
            code: 'WRTG 150',
            title: 'Writing & Rhetoric',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['General Education'],
            grade: 'A-'
          },
        ]
      },

      // Winter 2024 - Completed term
      {
        id: 2,
        label: 'Winter 2024',
        isActive: false,
        courses: [
          {
            id: 'c5',
            code: 'ECON 110',
            title: 'Economic Principles',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['Major', 'General Education'],
            grade: 'B'
          },
          {
            id: 'c6',
            code: 'STAT 121',
            title: 'Intro to Statistical Data Analysis',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['Major'],
            grade: 'A-'
          },
          {
            id: 'c7',
            code: 'REL A 121',
            title: 'Book of Mormon I',
            credits: 2,
            status: 'completed' as const,
            fulfills: ['Religion'],
            grade: 'A'
          },
          {
            id: 'c8',
            code: 'BIO 100',
            title: 'Principles of Biology',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['General Education', 'Life Sciences'],
            grade: 'B+'
          },
        ]
      },

      // Fall 2024 - Active term
      {
        id: 3,
        label: 'Fall 2024',
        isActive: true,
        courses: [
          {
            id: 'c9',
            code: 'FIN 326',
            title: 'Professional Development',
            credits: 2,
            status: 'in-progress' as const,
            fulfills: ['Major', 'Finance Core'],
          },
          {
            id: 'c10',
            code: 'ACC 310',
            title: 'Intermediate Accounting',
            credits: 3,
            status: 'in-progress' as const,
            fulfills: ['Major'],
          },
          {
            id: 'c11',
            code: 'REL A 122',
            title: 'Book of Mormon II',
            credits: 2,
            status: 'in-progress' as const,
            fulfills: ['Religion'],
          },
          {
            id: 'c12',
            code: 'HIST 201',
            title: 'Western Civilization I',
            credits: 3,
            status: 'in-progress' as const,
            fulfills: ['General Education', 'Civilization'],
          },
        ]
      },

      // Winter 2025 - Planned term
      {
        id: 4,
        label: 'Winter 2025',
        isActive: false,
        courses: [
          {
            id: 'c13',
            code: 'FIN 400',
            title: 'Analytical Methods in Finance',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['Major', 'Finance Core'],
          },
          {
            id: 'c14',
            code: 'FIN 401',
            title: 'Advanced Financial Management',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['Major', 'Finance Core'],
          },
          {
            id: 'c15',
            code: 'REL C 211',
            title: 'New Testament I',
            credits: 2,
            status: 'planned' as const,
            fulfills: ['Religion'],
          },
          {
            id: 'c16',
            code: 'PSYCH 111',
            title: 'General Psychology',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['General Education', 'Social Sciences'],
          },
        ]
      },

      // Fall 2025 - Planned term
      {
        id: 5,
        label: 'Fall 2025',
        isActive: false,
        courses: [
          {
            id: 'c17',
            code: 'FIN 410',
            title: 'Investments',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['Major', 'Finance Core'],
          },
          {
            id: 'c18',
            code: 'FIN 409',
            title: 'Modeling and Valuation',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['Major', 'Elective'],
          },
          {
            id: 'c19',
            code: 'HRM 391',
            title: 'Organizational Effectiveness',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['Major'],
          },
          {
            id: 'c20',
            code: 'PHIL 201',
            title: 'Ethics and Values',
            credits: 3,
            status: 'planned' as const,
            fulfills: ['General Education', 'Arts & Letters'],
          },
        ]
      },

      // Winter 2026 - Future term with remaining courses
      {
        id: 6,
        label: 'Winter 2026',
        isActive: false,
        courses: [
          {
            id: 'c21',
            code: 'FIN 453',
            title: 'Money, Banking, & Business',
            credits: 3,
            status: 'remaining' as const,
            fulfills: ['Major', 'Finance Core'],
          },
          {
            id: 'c22',
            code: 'STRAT 392',
            title: 'Strategy and Economics',
            credits: 3,
            status: 'remaining' as const,
            fulfills: ['Major'],
          },
          {
            id: 'c23',
            code: 'REL C 212',
            title: 'New Testament II',
            credits: 2,
            status: 'remaining' as const,
            fulfills: ['Religion'],
          },
          {
            id: 'c24',
            code: 'ELECTIVE',
            title: 'Free Elective',
            credits: 3,
            status: 'remaining' as const,
            fulfills: ['Electives'],
          },
        ]
      },
    ],

    events: [
      {
        id: 'e1',
        title: 'Finance Internship Application',
        term: 'Summer 2025',
        type: 'internship' as const,
        notes: 'Apply by March 15th for summer internships at top financial institutions'
      },
      {
        id: 'e2',
        title: 'Study Abroad Program',
        term: 'Fall 2025',
        type: 'study-abroad' as const,
        notes: 'Consider London School of Economics exchange program'
      },
      {
        id: 'e3',
        title: 'Apply for Graduation',
        term: 'Fall 2026',
        type: 'graduation' as const,
        notes: 'Submit graduation application by October 1st'
      },
    ]
  },
  {
    planId: 'preview-002',
    planName: 'Accelerated Plan - Graduate Early',
    studentName: 'Preview Student',
    programName: 'Finance',
    totalCredits: 120,
    earnedCredits: 78,

    terms: [
      {
        id: 1,
        label: 'Fall 2023',
        isActive: false,
        courses: [
          {
            id: 'c1-alt',
            code: 'FIN 201',
            title: 'Principles of Finance',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['Major'],
            grade: 'A'
          },
        ]
      },
      {
        id: 2,
        label: 'Winter 2024',
        isActive: false,
        courses: [
          {
            id: 'c2-alt',
            code: 'ACC 200',
            title: 'Principles of Accounting',
            credits: 3,
            status: 'completed' as const,
            fulfills: ['Major'],
            grade: 'A-'
          },
        ]
      },
    ],

    events: []
  },
];

// Default plan for initial load
export const mockGradPlan = mockGradPlans[0];
