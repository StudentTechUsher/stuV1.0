import type { Meta, StoryObj } from '@storybook/react';
import { CourseAnalysisResults } from './CourseAnalysisResults';
import type { CourseAnalysisData } from './CourseAnalysisResults';

/**
 * Course Analysis Results component displays comprehensive analysis for course sections,
 * including conflict detection, preference-based ranking, and section selection functionality.
 */
const meta = {
  title: 'Scheduler/Course Analysis Results',
  component: CourseAnalysisResults,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CourseAnalysisResults>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Ideal scenario - all courses have sections without conflicts
 */
export const AllCoursesHaveOptions: Story = {
  args: {
    analyses: [
      {
        courseCode: 'IS 455',
        courseName: 'Machine Learning',
        totalSections: 4,
        sectionsWithConflicts: 2,
        sectionsWithoutConflicts: 2,
        allHaveConflicts: false,
        bestSection: {
          section_label: '003',
          instructor: 'Mark Keith',
          days: 'TTh',
          time: '2:00 PM - 3:15 PM',
          hasConflict: false,
          conflictCount: 0,
          score: 85,
          originalScore: 85,
          recommended: true,
          conflicts: [],
        },
        sections: [
          {
            section_label: '003',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '2:00 PM - 3:15 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 85,
            originalScore: 85,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '004',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '12:30 PM - 1:45 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 75,
            originalScore: 75,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '001',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '9:30 AM - 10:45 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 55,
            originalScore: 85,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Tue 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
          {
            section_label: '002',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '8:00 AM - 9:15 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 50,
            originalScore: 80,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Tue 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
        ],
      },
      {
        courseCode: 'CS 450',
        courseName: 'Advanced Algorithms',
        totalSections: 3,
        sectionsWithConflicts: 0,
        sectionsWithoutConflicts: 3,
        allHaveConflicts: false,
        bestSection: {
          section_label: '001',
          instructor: 'Dr. Smith',
          days: 'MWF',
          time: '3:00 PM - 4:00 PM',
          hasConflict: false,
          conflictCount: 0,
          score: 90,
          originalScore: 90,
          recommended: true,
          conflicts: [],
        },
        sections: [
          {
            section_label: '001',
            instructor: 'Dr. Smith',
            days: 'MWF',
            time: '3:00 PM - 4:00 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 90,
            originalScore: 90,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '002',
            instructor: 'Dr. Johnson',
            days: 'TTh',
            time: '2:30 PM - 3:45 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 80,
            originalScore: 80,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '003',
            instructor: 'Dr. Williams',
            days: 'MWF',
            time: '4:00 PM - 5:00 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 70,
            originalScore: 70,
            recommended: false,
            conflicts: [],
          },
        ],
      },
    ],
  },
};

/**
 * One course has all sections with conflicts - needs calendar adjustment
 */
export const SomeSectionsNeedAdjustment: Story = {
  args: {
    analyses: [
      {
        courseCode: 'MATH 221',
        courseName: 'Calculus I',
        totalSections: 3,
        sectionsWithConflicts: 3,
        sectionsWithoutConflicts: 0,
        allHaveConflicts: true,
        bestSection: null,
        sections: [
          {
            section_label: '001',
            instructor: 'Prof. Anderson',
            days: 'MWF',
            time: '9:00 AM - 10:00 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 55,
            originalScore: 85,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Mon 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
          {
            section_label: '002',
            instructor: 'Prof. Anderson',
            days: 'MWF',
            time: '11:00 AM - 12:00 PM',
            hasConflict: true,
            conflictCount: 1,
            score: 50,
            originalScore: 80,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Mon 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
          {
            section_label: '003',
            instructor: 'Prof. Taylor',
            days: 'TTh',
            time: '10:00 AM - 11:15 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 45,
            originalScore: 75,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Study Group (Tue 14:00-16:00)',
                conflictingWith: 'Study Group - Calculus',
              },
            ],
          },
        ],
      },
      {
        courseCode: 'IS 455',
        courseName: 'Machine Learning',
        totalSections: 2,
        sectionsWithConflicts: 0,
        sectionsWithoutConflicts: 2,
        allHaveConflicts: false,
        bestSection: {
          section_label: '003',
          instructor: 'Mark Keith',
          days: 'TTh',
          time: '2:00 PM - 3:15 PM',
          hasConflict: false,
          conflictCount: 0,
          score: 85,
          originalScore: 85,
          recommended: true,
          conflicts: [],
        },
        sections: [
          {
            section_label: '003',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '2:00 PM - 3:15 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 85,
            originalScore: 85,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '004',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '12:30 PM - 1:45 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 75,
            originalScore: 75,
            recommended: true,
            conflicts: [],
          },
        ],
      },
    ],
  },
};

/**
 * Single course analysis
 */
export const SingleCourse: Story = {
  args: {
    analyses: [
      {
        courseCode: 'IS 455',
        courseName: 'Machine Learning',
        totalSections: 4,
        sectionsWithConflicts: 2,
        sectionsWithoutConflicts: 2,
        allHaveConflicts: false,
        bestSection: {
          section_label: '003',
          instructor: 'Mark Keith',
          days: 'TTh',
          time: '2:00 PM - 3:15 PM',
          hasConflict: false,
          conflictCount: 0,
          score: 85,
          originalScore: 85,
          recommended: true,
          conflicts: [],
        },
        sections: [
          {
            section_label: '003',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '2:00 PM - 3:15 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 85,
            originalScore: 85,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '004',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '12:30 PM - 1:45 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 75,
            originalScore: 75,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '001',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '9:30 AM - 10:45 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 55,
            originalScore: 85,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Tue 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
          {
            section_label: '002',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '8:00 AM - 9:15 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 50,
            originalScore: 80,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Tue 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Compact mode for constrained spaces
 */
export const CompactMode: Story = {
  args: {
    compact: true,
    analyses: [
      {
        courseCode: 'IS 455',
        courseName: 'Machine Learning',
        totalSections: 4,
        sectionsWithConflicts: 2,
        sectionsWithoutConflicts: 2,
        allHaveConflicts: false,
        bestSection: {
          section_label: '003',
          instructor: 'Mark Keith',
          days: 'TTh',
          time: '2:00 PM - 3:15 PM',
          hasConflict: false,
          conflictCount: 0,
          score: 85,
          originalScore: 85,
          recommended: true,
          conflicts: [],
        },
        sections: [
          {
            section_label: '003',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '2:00 PM - 3:15 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 85,
            originalScore: 85,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '004',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '12:30 PM - 1:45 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 75,
            originalScore: 75,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '001',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '9:30 AM - 10:45 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 55,
            originalScore: 85,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Tue 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
          {
            section_label: '002',
            instructor: 'Mark Keith',
            days: 'TTh',
            time: '8:00 AM - 9:15 AM',
            hasConflict: true,
            conflictCount: 1,
            score: 50,
            originalScore: 80,
            recommended: false,
            conflicts: [
              {
                conflictType: 'time_overlap',
                message: 'Overlaps with Morning Internship (Tue 08:00-14:00)',
                conflictingWith: 'Morning Internship',
              },
            ],
          },
        ],
      },
      {
        courseCode: 'CS 450',
        courseName: 'Advanced Algorithms',
        totalSections: 2,
        sectionsWithConflicts: 0,
        sectionsWithoutConflicts: 2,
        allHaveConflicts: false,
        bestSection: {
          section_label: '001',
          instructor: 'Dr. Smith',
          days: 'MWF',
          time: '3:00 PM - 4:00 PM',
          hasConflict: false,
          conflictCount: 0,
          score: 90,
          originalScore: 90,
          recommended: true,
          conflicts: [],
        },
        sections: [
          {
            section_label: '001',
            instructor: 'Dr. Smith',
            days: 'MWF',
            time: '3:00 PM - 4:00 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 90,
            originalScore: 90,
            recommended: true,
            conflicts: [],
          },
          {
            section_label: '002',
            instructor: 'Dr. Johnson',
            days: 'TTh',
            time: '2:30 PM - 3:45 PM',
            hasConflict: false,
            conflictCount: 0,
            score: 80,
            originalScore: 80,
            recommended: true,
            conflicts: [],
          },
        ],
      },
    ],
  },
};

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    analyses: [],
  },
};

/**
 * Dark mode preview against a themed surface
 */
export const DarkMode: Story = {
  args: AllCoursesHaveOptions.args,
  globals: {
    colorMode: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => (
    <div className="rounded-xl border border-border bg-background p-6">
      <CourseAnalysisResults {...args} />
    </div>
  ),
};
