import type { Meta, StoryObj } from '@storybook/react';
import { CourseValidationResults, CourseValidationSummary } from './CourseValidationResults';
import type { CourseValidationResult, CourseValidationSummaryData } from './CourseValidationResults';

/**
 * Course Validation Results component displays validation status for courses
 * being scheduled. It shows which courses are available, which need rescheduling,
 * and which weren't found.
 */
const meta = {
  title: 'Scheduler/Course Validation Results',
  component: CourseValidationResults,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CourseValidationResults>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * All courses are available in the target term - ideal scenario
 */
export const AllAvailable: Story = {
  args: {
    summary: {
      total: 3,
      available: 3,
      needsRescheduling: 0,
      notFound: 0,
    },
    results: {
      available: [
        {
          courseCode: 'IS 455',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'CS 450',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 2,
          message: 'Available in Winter 2026 (2 sections)',
        },
        {
          courseCode: 'MATH 221',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 6,
          message: 'Available in Winter 2026 (6 sections)',
        },
      ],
      notInTerm: [],
      notFound: [],
    },
  },
};

/**
 * Mixed results - some available, some need rescheduling
 */
export const MixedResults: Story = {
  args: {
    summary: {
      total: 5,
      available: 2,
      needsRescheduling: 2,
      notFound: 1,
    },
    results: {
      available: [
        {
          courseCode: 'IS 455',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'MATH 221',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 6,
          message: 'Available in Winter 2026 (6 sections)',
        },
      ],
      notInTerm: [
        {
          courseCode: 'CS 450',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Spring 2026',
          message: 'Not available in Winter 2026, but offered in Spring 2026',
        },
        {
          courseCode: 'ECON 201',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Fall 2026',
          message: 'Not available in Winter 2026, but offered in Fall 2026',
        },
      ],
      notFound: [
        {
          courseCode: 'FAKE 999',
          status: 'not_found',
          targetTerm: 'Winter 2026',
          message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
        },
      ],
    },
    onRemoveCourse: (courseCode: string) => {
      console.log(`🗑️ Removing course: ${courseCode}`);
      alert(`Removed course: ${courseCode}`);
    },
  },
};

/**
 * Some courses need rescheduling
 */
export const NeedsRescheduling: Story = {
  args: {
    summary: {
      total: 4,
      available: 2,
      needsRescheduling: 2,
      notFound: 0,
    },
    results: {
      available: [
        {
          courseCode: 'IS 455',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'MATH 221',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 6,
          message: 'Available in Winter 2026 (6 sections)',
        },
      ],
      notInTerm: [
        {
          courseCode: 'CS 450',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Spring 2026',
          message: 'Not available in Winter 2026, but offered in Spring 2026',
        },
        {
          courseCode: 'PHYS 220',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Summer 2026',
          message: 'Not available in Winter 2026, but offered in Summer 2026',
        },
      ],
      notFound: [],
    },
  },
};

/**
 * Some courses not found - error scenario with removal action
 */
export const CoursesNotFound: Story = {
  args: {
    summary: {
      total: 4,
      available: 2,
      needsRescheduling: 0,
      notFound: 2,
    },
    results: {
      available: [
        {
          courseCode: 'IS 455',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'CS 450',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 2,
          message: 'Available in Winter 2026 (2 sections)',
        },
      ],
      notInTerm: [],
      notFound: [
        {
          courseCode: 'OLD 101',
          status: 'not_found',
          targetTerm: 'Winter 2026',
          message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
        },
        {
          courseCode: 'TYPO 999',
          status: 'not_found',
          targetTerm: 'Winter 2026',
          message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
        },
      ],
    },
    onRemoveCourse: (courseCode: string) => {
      console.log(`🗑️ Removing course: ${courseCode}`);
      alert(`Removed course: ${courseCode}`);
    },
  },
};

/**
 * Empty state - no courses to validate
 */
export const Empty: Story = {
  args: {
    summary: {
      total: 0,
      available: 0,
      needsRescheduling: 0,
      notFound: 0,
    },
    results: {
      available: [],
      notInTerm: [],
      notFound: [],
    },
  },
};

/**
 * Large course list scenario
 */
export const LargeCourseList: Story = {
  args: {
    summary: {
      total: 12,
      available: 8,
      needsRescheduling: 3,
      notFound: 1,
    },
    results: {
      available: [
        {
          courseCode: 'IS 455',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'CS 450',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 2,
          message: 'Available in Winter 2026 (2 sections)',
        },
        {
          courseCode: 'MATH 221',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 6,
          message: 'Available in Winter 2026 (6 sections)',
        },
        {
          courseCode: 'ENGL 316',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 3,
          message: 'Available in Winter 2026 (3 sections)',
        },
        {
          courseCode: 'STAT 201',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 5,
          message: 'Available in Winter 2026 (5 sections)',
        },
        {
          courseCode: 'BUS 310',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 2,
          message: 'Available in Winter 2026 (2 sections)',
        },
        {
          courseCode: 'MKT 301',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'FIN 320',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 3,
          message: 'Available in Winter 2026 (3 sections)',
        },
      ],
      notInTerm: [
        {
          courseCode: 'ECON 201',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Spring 2026',
          message: 'Not available in Winter 2026, but offered in Spring 2026',
        },
        {
          courseCode: 'PHYS 220',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Fall 2026',
          message: 'Not available in Winter 2026, but offered in Fall 2026',
        },
        {
          courseCode: 'CHEM 105',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Summer 2026',
          message: 'Not available in Winter 2026, but offered in Summer 2026',
        },
      ],
      notFound: [
        {
          courseCode: 'OLD 999',
          status: 'not_found',
          targetTerm: 'Winter 2026',
          message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
        },
      ],
    },
  },
};

/**
 * Summary component only - shows just the stats
 */
export const SummaryOnly: StoryObj<typeof CourseValidationSummary> = {
  render: () => (
    <CourseValidationSummary
      summary={{
        total: 10,
        available: 6,
        needsRescheduling: 3,
        notFound: 1,
      }}
    />
  ),
};

/**
 * Constrained width - simulates wizard/modal environment (600px)
 */
export const ConstrainedWidth: Story = {
  render: () => (
    <div style={{ maxWidth: '600px', margin: '0 auto', border: '2px dashed #ccc', padding: '16px' }}>
      <CourseValidationResults
        summary={{
          total: 5,
          available: 2,
          needsRescheduling: 2,
          notFound: 1,
        }}
        results={{
          available: [
            {
              courseCode: 'IS 455',
              status: 'available',
              targetTerm: 'Winter 2026',
              sectionCount: 4,
              message: 'Available in Winter 2026 (4 sections)',
            },
            {
              courseCode: 'MATH 221',
              status: 'available',
              targetTerm: 'Winter 2026',
              sectionCount: 6,
              message: 'Available in Winter 2026 (6 sections)',
            },
          ],
          notInTerm: [
            {
              courseCode: 'CS 450',
              status: 'not_in_term',
              targetTerm: 'Winter 2026',
              availableIn: 'Spring 2026',
              message: 'Not available in Winter 2026, but offered in Spring 2026',
            },
            {
              courseCode: 'ECON 201',
              status: 'not_in_term',
              targetTerm: 'Winter 2026',
              availableIn: 'Fall 2026',
              message: 'Not available in Winter 2026, but offered in Fall 2026',
            },
          ],
          notFound: [
            {
              courseCode: 'FAKE 999',
              status: 'not_found',
              targetTerm: 'Winter 2026',
              message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
            },
          ],
        }}
      />
    </div>
  ),
};

/**
 * Very narrow - mobile/sidebar width (400px)
 */
export const VeryNarrow: Story = {
  render: () => (
    <div style={{ maxWidth: '400px', margin: '0 auto', border: '2px dashed #ccc', padding: '16px' }}>
      <CourseValidationResults
        summary={{
          total: 4,
          available: 2,
          needsRescheduling: 1,
          notFound: 1,
        }}
        results={{
          available: [
            {
              courseCode: 'IS 455',
              status: 'available',
              targetTerm: 'Winter 2026',
              sectionCount: 4,
              message: 'Available in Winter 2026 (4 sections)',
            },
            {
              courseCode: 'MATH 221',
              status: 'available',
              targetTerm: 'Winter 2026',
              sectionCount: 6,
              message: 'Available in Winter 2026 (6 sections)',
            },
          ],
          notInTerm: [
            {
              courseCode: 'CS 450',
              status: 'not_in_term',
              targetTerm: 'Winter 2026',
              availableIn: 'Spring 2026',
              message: 'Not available in Winter 2026, but offered in Spring 2026',
            },
          ],
          notFound: [
            {
              courseCode: 'FAKE 999',
              status: 'not_found',
              targetTerm: 'Winter 2026',
              message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
            },
          ],
        }}
      />
    </div>
  ),
};

/**
 * Compact mode - smaller spacing and sizing for constrained spaces
 */
export const CompactMode: Story = {
  args: {
    compact: true,
    summary: {
      total: 5,
      available: 2,
      needsRescheduling: 2,
      notFound: 1,
    },
    results: {
      available: [
        {
          courseCode: 'IS 455',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 4,
          message: 'Available in Winter 2026 (4 sections)',
        },
        {
          courseCode: 'MATH 221',
          status: 'available',
          targetTerm: 'Winter 2026',
          sectionCount: 6,
          message: 'Available in Winter 2026 (6 sections)',
        },
      ],
      notInTerm: [
        {
          courseCode: 'CS 450',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Spring 2026',
          message: 'Not available in Winter 2026, but offered in Spring 2026',
        },
        {
          courseCode: 'ECON 201',
          status: 'not_in_term',
          targetTerm: 'Winter 2026',
          availableIn: 'Fall 2026',
          message: 'Not available in Winter 2026, but offered in Fall 2026',
        },
      ],
      notFound: [
        {
          courseCode: 'FAKE 999',
          status: 'not_found',
          targetTerm: 'Winter 2026',
          message: 'Not found in Winter 2026 or next 4 terms. May be deprecated or incorrect code.',
        },
      ],
    },
  },
};

/**
 * Minimal - shows compact mode in wizard-like constrained space
 */
export const MinimalDisplay: Story = {
  render: () => (
    <div style={{ maxWidth: '500px', margin: '0 auto', border: '2px dashed #ccc', padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          📱 Simulates a compact wizard step where space is limited (500px width)
        </p>
      </div>
      <CourseValidationResults
        compact={true}
        summary={{
          total: 3,
          available: 1,
          needsRescheduling: 1,
          notFound: 1,
        }}
        results={{
          available: [
            {
              courseCode: 'IS 455',
              status: 'available',
              targetTerm: 'Winter 2026',
              sectionCount: 4,
              message: 'Available in Winter 2026 (4 sections)',
            },
          ],
          notInTerm: [
            {
              courseCode: 'CS 450',
              status: 'not_in_term',
              targetTerm: 'Winter 2026',
              availableIn: 'Spring 2026',
              message: 'Not available in Winter 2026, but offered in Spring 2026',
            },
          ],
          notFound: [
            {
              courseCode: 'FAKE 999',
              status: 'not_found',
              targetTerm: 'Winter 2026',
              message: 'Not found in Winter 2026 or next 4 terms.',
            },
          ],
        }}
      />
    </div>
  ),
};

/**
 * Side-by-side comparison of standard vs compact modes
 */
export const StandardVsCompact: Story = {
  render: () => {
    const sampleData = {
      summary: {
        total: 3,
        available: 1,
        needsRescheduling: 1,
        notFound: 1,
      },
      results: {
        available: [
          {
            courseCode: 'IS 455',
            status: 'available' as const,
            targetTerm: 'Winter 2026',
            sectionCount: 4,
            message: 'Available in Winter 2026 (4 sections)',
          },
        ],
        notInTerm: [
          {
            courseCode: 'CS 450',
            status: 'not_in_term' as const,
            targetTerm: 'Winter 2026',
            availableIn: 'Spring 2026',
            message: 'Not available in Winter 2026, but offered in Spring 2026',
          },
        ],
        notFound: [
          {
            courseCode: 'FAKE 999',
            status: 'not_found' as const,
            targetTerm: 'Winter 2026',
            message: 'Not found in Winter 2026 or next 4 terms.',
          },
        ],
      },
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '1200px' }}>
        <div>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Standard Mode</h3>
          <div style={{ border: '2px dashed #ccc', padding: '16px' }}>
            <CourseValidationResults {...sampleData} />
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Compact Mode</h3>
          <div style={{ border: '2px dashed #ccc', padding: '16px' }}>
            <CourseValidationResults {...sampleData} compact={true} />
          </div>
        </div>
      </div>
    );
  },
};
