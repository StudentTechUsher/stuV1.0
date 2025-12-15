'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';
import OptionTile from '@/components/grad-plan/OptionTile';
import { ProfileUpdateInput } from '@/lib/chatbot/tools/profileUpdateTool';

interface ProfileUpdateFormProps {
  currentValues: {
    est_grad_date?: string | null;
    est_grad_sem?: string | null;
    career_goals?: string | null;
    admission_year?: number | null;
    is_transfer?: boolean | null;
  };
  hasActivePlan?: boolean;
  onSubmit: (data: ProfileUpdateInput) => void;
  onSkip?: () => void;
  onCareerPathfinderClick?: (industries?: string) => void;
}

const SEMESTER_OPTIONS = ['Winter', 'Spring', 'Summer', 'Fall'] as const;

const INDUSTRY_OPTIONS = [
  'Technology & Software',
  'Healthcare & Medical',
  'Finance & Business',
  'Engineering & Manufacturing',
  'Education & Training',
  'Creative & Media',
] as const;

type ProfileStep = 'graduation' | 'admission' | 'industry-choice' | 'industry-selection' | 'career';

/**
 * Calculates the graduation date based on semester and year
 * Winter: April 30, Spring: May 31, Summer: August 31, Fall: December 15
 */
function calculateGraduationDate(semester: string, year: number): string {
  switch (semester) {
    case 'Winter':
      return `${year}-04-30`;
    case 'Spring':
      return `${year}-05-31`;
    case 'Summer':
      return `${year}-08-31`;
    case 'Fall':
      return `${year}-12-15`;
    default:
      return '';
  }
}

/**
 * Extracts semester and year from ISO date string
 */
function extractSemesterAndYear(dateStr: string): { semester: string; year: number } | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  let semester = '';
  if (month === 4) semester = 'Winter';
  else if (month === 5) semester = 'Spring';
  else if (month === 8) semester = 'Summer';
  else if (month === 12) semester = 'Fall';

  return semester ? { semester, year } : null;
}

export default function ProfileUpdateForm({
  currentValues,
  hasActivePlan = false,
  onSubmit,
  onSkip,
  onCareerPathfinderClick,
}: Readonly<ProfileUpdateFormProps>) {
  const currentYear = new Date().getFullYear();

  // Initialize from currentValues if available
  const initialData = useMemo(() => {
    if (currentValues.est_grad_date) {
      const extracted = extractSemesterAndYear(currentValues.est_grad_date);
      if (extracted) {
        return extracted;
      }
    }
    return {
      semester: currentValues.est_grad_sem || '',
      year: currentYear,
    };
  }, [currentValues.est_grad_date, currentValues.est_grad_sem, currentYear]);

  const [step, setStep] = useState<ProfileStep>('graduation');
  const [semester, setSemester] = useState<string>(initialData.semester);
  const [year, setYear] = useState<string>(String(initialData.year));
  const [admissionYear, setAdmissionYear] = useState<string>(
    currentValues.admission_year ? String(currentValues.admission_year) : ''
  );
  const [isTransfer, setIsTransfer] = useState<boolean | null>(
    currentValues.is_transfer !== null && currentValues.is_transfer !== undefined
      ? currentValues.is_transfer
      : null
  );
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState('');
  const [careerGoals, setCareerGoals] = useState(currentValues.career_goals || '');

  // Generate year options (current year to 10 years from now)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i <= 10; i++) {
      years.push(currentYear + i);
    }
    return years;
  }, [currentYear]);

  // Generate admission year options (10 years ago to current year)
  const admissionYearOptions = useMemo(() => {
    const years = [];
    for (let i = 10; i >= 0; i--) {
      years.push(currentYear - i);
    }
    return years;
  }, [currentYear]);

  const isGraduationValid = semester && year;
  const isAdmissionValid = admissionYear && isTransfer !== null;
  const isIndustryValid = selectedIndustries.length > 0 || customIndustry.trim().length > 0;
  const isCareerValid = careerGoals.trim().length > 0;

  const handleGraduationContinue = () => {
    if (isGraduationValid) {
      // Move to admission info step
      setStep('admission');
    }
  };

  const handleAdmissionContinue = () => {
    if (admissionYear && isTransfer !== null) {
      // Submit graduation and admission info together
      const gradDate = calculateGraduationDate(semester, Number(year));
      onSubmit({
        estGradDate: gradDate,
        estGradSem: (semester as ProfileUpdateInput['estGradSem']),
        admissionYear: Number(admissionYear),
        isTransfer,
        isGraduationOnly: true,
      });
      setStep('industry-choice');
    }
  };

  const handleIndustryChoice = (choice: 'select' | 'know' | 'keep') => {
    if (choice === 'select') {
      setStep('industry-selection');
    } else if (choice === 'keep') {
      // Keep existing career goal - submit it and move to next step
      if (currentValues.career_goals) {
        onSubmit({
          careerGoals: currentValues.career_goals,
        });
      }
    } else {
      setStep('career');
    }
  };

  const handleIndustryToggle = (industry: string) => {
    setSelectedIndustries(prev => {
      const newSelection = prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry];
      // Limit to 2 selections
      return newSelection.slice(-2);
    });
  };

  const handleIndustryContinue = () => {
    if (isIndustryValid && onCareerPathfinderClick) {
      // User selected industry, trigger career pathfinder with context
      const industries = selectedIndustries.length > 0
        ? selectedIndustries.join(', ')
        : customIndustry;
      onCareerPathfinderClick(industries);
    }
  };

  const handleFinalSubmit = () => {
    if (!isCareerValid) return;

    // Only submit career goals (graduation was already submitted)
    onSubmit({
      careerGoals: careerGoals.trim(),
    });
  };

  // Step 1: Graduation Date & Semester
  if (step === 'graduation') {
    return (
      <div className="my-4 p-5 border rounded-xl bg-card shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">When do you plan to graduate?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            * This should be your best estimate or when you would like to be finished.
          </p>
        </div>

        <div className="space-y-4">
          {/* Semester Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Graduation Semester
            </label>
            <div className="space-y-2">
              {SEMESTER_OPTIONS.map((sem) => (
                <OptionTile
                  key={sem}
                  title={sem}
                  selected={semester === sem}
                  onClick={() => setSemester(sem)}
                />
              ))}
            </div>
          </div>

          {/* Year Selection */}
          <div>
            <label htmlFor="grad-year" className="block text-sm font-medium text-gray-900 mb-2">
              Graduation Year
            </label>
            <select
              id="grad-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white text-sm"
            >
              <option value="">Select a year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <Button
            onClick={handleGraduationContinue}
            disabled={!isGraduationValid}
            className="w-full bg-[#0a1f1a] hover:bg-[#043322]"
          >
            Continue
          </Button>

          {hasActivePlan && onSkip && (
            <Button
              onClick={onSkip}
              variant="outline"
              className="w-full"
            >
              Skip to Student Classification
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Admission Info
  if (step === 'admission') {
    return (
      <div className="my-4 p-5 border rounded-xl bg-card shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">When were you admitted?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This helps us determine which requirements apply to you.
          </p>
        </div>

        <div className="space-y-4">
          {/* Admission Year Selection */}
          <div>
            <label htmlFor="admission-year" className="block text-sm font-medium text-gray-900 mb-2">
              Admission Year
            </label>
            <select
              id="admission-year"
              value={admissionYear}
              onChange={(e) => setAdmissionYear(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white text-sm"
            >
              <option value="">Select a year</option>
              {admissionYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Status */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Student Type
            </label>
            <div className="space-y-2">
              <OptionTile
                title="Freshman (started here)"
                description="I started my undergraduate degree at this university"
                selected={isTransfer === false}
                onClick={() => setIsTransfer(false)}
              />
              <OptionTile
                title="Transfer Student"
                description="I transferred from another institution"
                selected={isTransfer === true}
                onClick={() => setIsTransfer(true)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5">
          <Button
            variant="outline"
            onClick={() => setStep('graduation')}
            className="px-6"
          >
            ← Back
          </Button>
          <Button
            onClick={handleAdmissionContinue}
            disabled={!isAdmissionValid}
            className="flex-1 bg-[#0a1f1a] hover:bg-[#043322]"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Industry Choice
  if (step === 'industry-choice') {
    const hasExistingCareerGoal = currentValues.career_goals && currentValues.career_goals.trim().length > 0;

    return (
      <div className="my-4 p-5 border rounded-xl bg-card shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {hasExistingCareerGoal ? 'Do you want to update your career goal?' : 'Do you know what career you want?'}
          </h3>
          {hasExistingCareerGoal ? (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your current career goal:</p>
              <p className="text-sm text-foreground">{currentValues.career_goals}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Choose how you&apos;d like to explore career options.
            </p>
          )}
        </div>

        <div className="space-y-3">
          {hasExistingCareerGoal && (
            <Button
              onClick={() => handleIndustryChoice('keep')}
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-start gap-1"
            >
              <span className="font-semibold text-base">Keep my current career goal</span>
              <span className="text-xs text-muted-foreground font-normal">
                Continue with &quot;{currentValues.career_goals}&quot;
              </span>
            </Button>
          )}

          <Button
            onClick={() => handleIndustryChoice('select')}
            variant="outline"
            className="w-full h-auto py-4 flex flex-col items-start gap-1"
          >
            <span className="font-semibold text-base">Select an industry first</span>
            <span className="text-xs text-muted-foreground font-normal">
              I want to explore careers within a specific industry
            </span>
          </Button>

          <Button
            onClick={() => handleIndustryChoice('know')}
            variant="outline"
            className="w-full h-auto py-4 flex flex-col items-start gap-1"
          >
            <span className="font-semibold text-base">
              {hasExistingCareerGoal ? 'Update my career goal' : 'I know what I want to do!'}
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {hasExistingCareerGoal ? 'Edit or refine my career information' : 'I have a specific career in mind'}
            </span>
          </Button>
        </div>

        <div className="mt-5">
          <Button
            variant="ghost"
            onClick={() => setStep('admission')}
            className="w-full"
          >
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Industry Selection
  if (step === 'industry-selection') {
    return (
      <div className="my-4 p-5 border rounded-xl bg-card shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Which industry interests you?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select up to 2 industries, or enter your own.
          </p>
        </div>

        <div className="space-y-4">
          {/* Industry Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INDUSTRY_OPTIONS.map((industry) => (
              <OptionTile
                key={industry}
                title={industry}
                selected={selectedIndustries.includes(industry)}
                onClick={() => handleIndustryToggle(industry)}
              />
            ))}
          </div>

          {/* Custom Industry Input */}
          <div>
            <label htmlFor="custom-industry" className="block text-sm font-medium text-gray-900 mb-2">
              Or enter your own industry
            </label>
            <input
              id="custom-industry"
              type="text"
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              placeholder="e.g., Environmental Science, Social Work..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white text-sm"
            />
          </div>

          {/* Disclaimer */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              💡 <strong>You&apos;re not committing to this yet!</strong> Use the career explorer in Pathfinder if you want to change, or you can make a new graduation plan!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5">
          <Button
            variant="outline"
            onClick={() => setStep('industry-choice')}
            className="px-6"
          >
            ← Back
          </Button>
          <Button
            onClick={handleIndustryContinue}
            disabled={!isIndustryValid}
            className="flex-1 bg-[#0a1f1a] hover:bg-[#043322]"
          >
            Continue with Career Explorer
          </Button>
        </div>
      </div>
    );
  }

  // Step 5: Career Goals (Direct Entry)
  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">What are your career goals?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your target career or professional aspirations.
        </p>
      </div>

      {/* Pathfinder Help Button */}
      {onCareerPathfinderClick && (
        <div className="flex justify-center mb-6">
          <Button
            type="button"
            onClick={() =>
              onCareerPathfinderClick?.(
                selectedIndustries.length > 0
                  ? selectedIndustries.join(', ')
                  : customIndustry || undefined
              )
            }
            variant="outline"
            className="gap-2"
          >
            <Compass size={18} />
            Need help finding your career path?
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {/* Career Goals Input */}
        <div>
          <textarea
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            placeholder="e.g., Software Engineer, Data Scientist, Marketing Manager..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 bg-white resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Describe your target career or professional goals
          </p>
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            💡 <strong>You&apos;re not committing to this yet!</strong> Use the career explorer in Pathfinder if you want to change, or you can make a new graduation plan!
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => setStep('industry-choice')}
          className="px-6"
        >
          ← Back
        </Button>
        <Button
          onClick={handleFinalSubmit}
          disabled={!isCareerValid}
          className="flex-1 bg-[#0a1f1a] hover:bg-[#043322]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
