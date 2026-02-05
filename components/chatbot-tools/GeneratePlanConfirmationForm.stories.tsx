import type { Meta, StoryObj } from '@storybook/react';
import GeneratePlanConfirmationForm from './GeneratePlanConfirmationForm';
import type { AcademicTermsConfig } from '@/lib/services/gradPlanGenerationService';

const meta = {
  title: 'Grad Plan/Create/GeneratePlanConfirmationForm',
  component: GeneratePlanConfirmationForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submit' },
  },
} satisfies Meta<typeof GeneratePlanConfirmationForm>;

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

export const ModeSelection: Story = {
  args: {
    academicTerms,
    lastCompletedTerm: 'Spring 2026',
    preferredStartTerms: ['Fall'],
  },
};
