import type { Meta, StoryObj } from '@storybook/react';
import { CreditDistributionStep } from './CreditDistributionStep';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';

const meta = {
  title: 'Grad Plan/Create/CreditDistributionStep',
  component: CreditDistributionStep,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onComplete: { action: 'complete' },
    onUpdateGraduationTimeline: { action: 'update graduation timeline' },
    onStudentDataChanged: { action: 'refresh student data' },
  },
} satisfies Meta<typeof CreditDistributionStep>;

export default meta;

type Story = StoryObj<typeof meta>;

const academicTerms: AcademicTermsConfig = {
  terms: {
    primary: [
      { id: 'fall', label: 'Fall' },
      { id: 'spring', label: 'Spring' },
    ],
    secondary: [
      { id: 'summer', label: 'Summer' },
    ],
  },
  system: 'semester_with_terms',
  ordering: ['fall', 'spring', 'summer'],
  academic_year_start: 'fall',
};

export const Default: Story = {
  args: {
    totalCredits: 120,
    totalCourses: 40,
    studentData: {
      admission_year: 2024,
      admission_term: 'Fall',
      est_grad_date: '2028-05-01',
    },
    hasTranscript: true,
    academicTerms,
    initialStrategy: 'balanced',
    onUpdateGraduationTimeline: async () => ({ success: true }),
    onComplete: (data) => {
      console.log('Completed with:', data);
    },
  },
};
