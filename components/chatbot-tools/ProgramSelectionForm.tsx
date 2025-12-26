'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Autocomplete, { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { School, GraduationCap, Plus, Compass, FileCheck } from 'lucide-react';
import {
  ProgramSelectionInput,
  ProgramOption,
  fetchProgramsByType,
} from '@/lib/chatbot/tools/programSelectionTool';
import CourseFlowModal from './CourseFlowModal';
import { fetchActiveGradPlanProgramsAction } from '@/lib/services/server-actions';

interface ProgramSelectionFormProps {
  studentType: 'undergraduate' | 'graduate';
  universityId: number;
  studentAdmissionYear?: number | null;
  studentIsTransfer?: boolean | null;
  profileId?: string;
  onSubmit: (data: ProgramSelectionInput) => void;
  onProgramPathfinderClick?: () => void;
  suggestedPrograms?: Array<{ programName: string; programType: string }>;
}

export default function ProgramSelectionForm({
  studentType,
  universityId,
  studentAdmissionYear,
  studentIsTransfer,
  profileId,
  onSubmit,
  onProgramPathfinderClick,
  suggestedPrograms,
}: Readonly<ProgramSelectionFormProps>) {
  // Undergraduate state
  const [majors, setMajors] = useState<ProgramOption[]>([]);
  const [minors, setMinors] = useState<ProgramOption[]>([]);
  const [genEds, setGenEds] = useState<ProgramOption[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<ProgramOption[]>([]);
  const [selectedMinors, setSelectedMinors] = useState<ProgramOption[]>([]);
  const [selectedGenEd, setSelectedGenEd] = useState<ProgramOption | null>(null);

  // Graduate state
  const [graduatePrograms, setGraduatePrograms] = useState<ProgramOption[]>([]);
  const [selectedGraduatePrograms, setSelectedGraduatePrograms] = useState<ProgramOption[]>([]);

  // Loading states
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingMinors, setLoadingMinors] = useState(false);
  const [loadingGenEds, setLoadingGenEds] = useState(false);
  const [loadingGraduate, setLoadingGraduate] = useState(false);

  // Course flow modal state
  const [courseFlowModalOpen, setCourseFlowModalOpen] = useState(false);
  const [selectedProgramForFlow, setSelectedProgramForFlow] = useState<ProgramOption | null>(null);

  // Prior grad plan state
  const [hasActiveGradPlan, setHasActiveGradPlan] = useState(false);
  const [priorGradPlanPrograms, setPriorGradPlanPrograms] = useState<Array<{ id: string; name: string; program_type: string }>>([]);

  // Fetch programs based on student type
  useEffect(() => {
    if (studentType === 'undergraduate') {
      // Fetch majors
      setLoadingMajors(true);
      fetchProgramsByType(universityId, 'major')
        .then(setMajors)
        .finally(() => setLoadingMajors(false));

      // Fetch minors
      setLoadingMinors(true);
      fetchProgramsByType(universityId, 'minor')
        .then(setMinors)
        .finally(() => setLoadingMinors(false));

      // Fetch gen eds with student metadata for filtering
      setLoadingGenEds(true);
      fetchProgramsByType(universityId, 'gen_ed', {
        admissionYear: studentAdmissionYear ?? undefined,
        isTransfer: studentIsTransfer ?? undefined,
      })
        .then((genEdPrograms) => {
          setGenEds(genEdPrograms);
          // Auto-select the first (highest priority) gen ed option
          if (genEdPrograms.length > 0) {
            setSelectedGenEd(genEdPrograms[0]);
          }
        })
        .finally(() => setLoadingGenEds(false));
    } else {
      // Fetch graduate programs
      setLoadingGraduate(true);
      fetchProgramsByType(universityId, 'graduate')
        .then(setGraduatePrograms)
        .finally(() => setLoadingGraduate(false));
    }
  }, [studentType, universityId]);

  // Fetch active grad plan programs if profileId is provided
  useEffect(() => {
    if (profileId) {
      fetchActiveGradPlanProgramsAction(profileId)
        .then(result => {
          if (result.success && result.hasGradPlan && result.programs) {
            setHasActiveGradPlan(true);
            setPriorGradPlanPrograms(result.programs);
          }
        })
        .catch(error => {
          console.error('Error fetching active grad plan programs:', error);
        });
    }
  }, [profileId]);

  // Auto-select suggested programs after they're fetched
  useEffect(() => {
    if (!suggestedPrograms || suggestedPrograms.length === 0) return;

    if (studentType === 'undergraduate') {
      // Wait for programs to be loaded
      if (loadingMajors || loadingMinors) return;

      const suggestedMajorNames = suggestedPrograms
        .filter(p => p.programType === 'major')
        .map(p => p.programName.toLowerCase());

      const suggestedMinorNames = suggestedPrograms
        .filter(p => p.programType === 'minor')
        .map(p => p.programName.toLowerCase());

      // Find matching majors
      const matchedMajors = majors.filter((major: ProgramOption) =>
        suggestedMajorNames.some((suggested: string) =>
          major.name.toLowerCase().includes(suggested) || suggested.includes(major.name.toLowerCase())
        )
      );

      // Find matching minors
      const matchedMinors = minors.filter((minor: ProgramOption) =>
        suggestedMinorNames.some((suggested: string) =>
          minor.name.toLowerCase().includes(suggested) || suggested.includes(minor.name.toLowerCase())
        )
      );

      if (matchedMajors.length > 0) {
        setSelectedMajors(matchedMajors);
      }

      if (matchedMinors.length > 0) {
        setSelectedMinors(matchedMinors);
      }
    } else {
      // Graduate programs
      if (loadingGraduate) return;

      const suggestedGraduateNames = suggestedPrograms.map((p: { programName: string; programType: string }) => p.programName.toLowerCase());

      const matchedGraduatePrograms = graduatePrograms.filter((program: ProgramOption) =>
        suggestedGraduateNames.some((suggested: string) =>
          program.name.toLowerCase().includes(suggested) || suggested.includes(program.name.toLowerCase())
        )
      );

      if (matchedGraduatePrograms.length > 0) {
        setSelectedGraduatePrograms(matchedGraduatePrograms);
      }
    }
  }, [suggestedPrograms, majors, minors, graduatePrograms, studentType, loadingMajors, loadingMinors, loadingGraduate]);

  const handleLoadPriorGradPlan = () => {
    if (!priorGradPlanPrograms || priorGradPlanPrograms.length === 0) return;

    if (studentType === 'undergraduate') {
      // Separate programs by type
      const priorMajors = priorGradPlanPrograms.filter((p: { id: string; name: string; program_type: string }) => p.program_type === 'major');
      const priorMinors = priorGradPlanPrograms.filter((p: { id: string; name: string; program_type: string }) => p.program_type === 'minor');

      // Match with available programs (convert both IDs to strings for comparison)
      const matchedMajors = majors.filter((major: ProgramOption) =>
        priorMajors.some((prior: { id: string; name: string; program_type: string }) => String(prior.id) === String(major.id))
      );
      const matchedMinors = minors.filter((minor: ProgramOption) =>
        priorMinors.some((prior: { id: string; name: string; program_type: string }) => String(prior.id) === String(minor.id))
      );

      // Set selections
      if (matchedMajors.length > 0) {
        setSelectedMajors(matchedMajors);
      }
      if (matchedMinors.length > 0) {
        setSelectedMinors(matchedMinors);
      }
    } else {
      // Graduate programs
      const matchedGraduate = graduatePrograms.filter((program: ProgramOption) =>
        priorGradPlanPrograms.some((prior: { id: string; name: string; program_type: string }) => String(prior.id) === String(program.id))
      );

      if (matchedGraduate.length > 0) {
        setSelectedGraduatePrograms(matchedGraduate);
      }
    }
  };

  const handleSubmit = () => {
    if (studentType === 'undergraduate') {
      if (selectedMajors.length === 0) {
        alert('Please select at least one major');
        return;
      }

      onSubmit({
        studentType: 'undergraduate',
        programs: {
          majorIds: selectedMajors.map((m: ProgramOption) => m.id),
          minorIds: selectedMinors.map((m: ProgramOption) => m.id),
          genEdIds: selectedGenEd ? [selectedGenEd.id] : [],
        },
      });
    } else {
      if (selectedGraduatePrograms.length === 0) {
        alert('Please select at least one graduate program');
        return;
      }

      onSubmit({
        studentType: 'graduate',
        programs: {
          graduateProgramIds: selectedGraduatePrograms.map((p: ProgramOption) => p.id),
        },
      });
    }
  };

  const isValid = studentType === 'undergraduate'
    ? selectedMajors.length > 0
    : selectedGraduatePrograms.length > 0;

  const handleViewCourseFlow = (program: ProgramOption, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the chip from being removed
    setSelectedProgramForFlow(program);
    setCourseFlowModalOpen(true);
  };

  const handleCloseCourseFlowModal = () => {
    setCourseFlowModalOpen(false);
    setSelectedProgramForFlow(null);
  };

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {studentType === 'undergraduate' ? (
            <><School size={20} /> Select Your Programs</>
          ) : (
            <><GraduationCap size={20} /> Select Your Graduate Program</>
          )}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {studentType === 'undergraduate'
            ? 'Choose your major(s), and optionally add minors or certificates'
            : 'Choose your graduate program(s)'}
        </p>
      </div>

      {/* Pathfinder Help Buttons */}
      {(onProgramPathfinderClick || hasActiveGradPlan) && (
        <div className="flex justify-center gap-3 mb-6">
          {onProgramPathfinderClick && (
            <Button
              type="button"
              onClick={onProgramPathfinderClick}
              variant="outline"
              className="gap-2 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Compass size={18} />
              Need help choosing your program?
            </Button>
          )}
          {hasActiveGradPlan && (
            <Button
              type="button"
              onClick={handleLoadPriorGradPlan}
              variant="outline"
              className="gap-2 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <FileCheck size={18} />
              Use my prior grad plan as a template
            </Button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {studentType === 'undergraduate' ? (
          <>
            {/* Majors */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Major(s) <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                multiple
                options={majors}
                getOptionLabel={(option: ProgramOption) => option.name}
                value={selectedMajors}
                onChange={(_event: React.SyntheticEvent, newValue: ProgramOption[]) => setSelectedMajors(newValue)}
                loading={loadingMajors}
                renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: string | number }, option: ProgramOption) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="flex-1">{option.name}</span>
                        {option.course_flow && (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleViewCourseFlow(option, e);
                            }}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors flex-shrink-0"
                          >
                            View Program
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }}
                renderInput={(params: AutocompleteRenderInputParams) => (
                  <TextField
                    {...params}
                    placeholder="Search for majors..."
                    helperText="Select at least one major"
                  />
                )}
                renderTags={(value: ProgramOption[], getTagProps: (arg: { index: number }) => Record<string, unknown>) =>
                  value.map((option: ProgramOption, index: number) => {
                    // Extract key from getTagProps to avoid spreading it (React warning)
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <div key={option.id} className="inline-flex items-center gap-1">
                        <Chip
                          {...chipProps}
                          label={option.name}
                          size="small"
                          className="bg-[var(--primary)] text-primary-foreground"
                        />
                      {option.course_flow && (
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent) => handleViewCourseFlow(option, e)}
                          className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-background dark:bg-zinc-900 border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                          title="View Program"
                        >
                          View
                        </button>
                      )}
                    </div>
                    );
                  })
                }
              />
            </div>

            {/* Minors */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Minor(s) <span className="text-muted-foreground text-xs">(Optional)</span>
              </label>
              <Autocomplete
                multiple
                options={minors}
                getOptionLabel={(option: ProgramOption) => option.name}
                value={selectedMinors}
                onChange={(_event: React.SyntheticEvent, newValue: ProgramOption[]) => setSelectedMinors(newValue)}
                loading={loadingMinors}
                renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: string | number }, option: ProgramOption) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="flex-1">{option.name}</span>
                        {option.course_flow && (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleViewCourseFlow(option, e);
                            }}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors flex-shrink-0"
                          >
                            View Program
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }}
                renderInput={(params: AutocompleteRenderInputParams) => (
                  <TextField
                    {...params}
                    placeholder="Search for minors..."
                    helperText="Add any minors you're pursuing"
                  />
                )}
                renderTags={(value: ProgramOption[], getTagProps: (arg: { index: number }) => Record<string, unknown>) =>
                  value.map((option: ProgramOption, index: number) => {
                    // Extract key from getTagProps to avoid spreading it (React warning)
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <div key={option.id} className="inline-flex items-center gap-1">
                        <Chip
                          {...chipProps}
                          label={option.name}
                          size="small"
                        />
                        {option.course_flow && (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => handleViewCourseFlow(option, e)}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-background dark:bg-zinc-900 border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                            title="View Program"
                          >
                            View
                          </button>
                        )}
                      </div>
                    );
                  })
                }
              />
            </div>

            {/* Gen Eds - Always show, with auto-selection of highest priority option */}
            {genEds.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  General Education <span className="text-muted-foreground text-xs">(Optional)</span>
                </label>
                <Autocomplete
                  options={genEds}
                  getOptionLabel={(option: ProgramOption) => option.name}
                  value={selectedGenEd}
                  onChange={(_event: React.SyntheticEvent, newValue: ProgramOption | null) => setSelectedGenEd(newValue)}
                  loading={loadingGenEds}
                  renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: string | number }, option: ProgramOption) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="flex-1">{option.name}</span>
                          {option.course_flow && (
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleViewCourseFlow(option, e);
                              }}
                              className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors flex-shrink-0"
                            >
                              View Program
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  }}
                  renderInput={(params: AutocompleteRenderInputParams) => (
                    <TextField
                      {...params}
                      placeholder="Search for gen ed requirements..."
                      helperText="Default general education program auto-selected (you can change if needed)"
                      slotProps={{
                        inputLabel: { shrink: true }
                      }}
                    />
                  )}
                />
                {selectedGenEd?.course_flow && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent) => handleViewCourseFlow(selectedGenEd, e)}
                      className="px-3 py-1.5 text-sm font-medium text-[var(--primary)] bg-background dark:bg-zinc-900 border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                    >
                      View Program Details
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Graduate Programs
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Graduate Program(s) <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              multiple
              options={graduatePrograms}
              getOptionLabel={(option: ProgramOption) => option.name}
              value={selectedGraduatePrograms}
              onChange={(_event: React.SyntheticEvent, newValue: ProgramOption[]) => setSelectedGraduatePrograms(newValue)}
              loading={loadingGraduate}
              renderOption={(props: React.HTMLAttributes<HTMLLIElement> & { key: string | number }, option: ProgramOption) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="flex-1">{option.name}</span>
                      {option.course_flow && (
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleViewCourseFlow(option, e);
                          }}
                          className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors flex-shrink-0"
                        >
                          View Program
                        </button>
                      )}
                    </div>
                  </li>
                );
              }}
              renderInput={(params: AutocompleteRenderInputParams) => (
                <TextField
                  {...params}
                  placeholder="Search for graduate programs..."
                  helperText="Select your Master's, PhD, or other graduate program"
                />
              )}
              renderTags={(value: ProgramOption[], getTagProps: (arg: { index: number }) => Record<string, unknown>) =>
                value.map((option: ProgramOption, index: number) => {
                  // Extract key from getTagProps to avoid spreading it (React warning)
                  const { key, ...chipProps } = getTagProps({ index });
                  return (
                    <div key={option.id} className="inline-flex items-center gap-1">
                      <Chip
                        {...chipProps}
                        label={option.name}
                        size="small"
                        className="bg-[var(--primary)] text-primary-foreground"
                      />
                      {option.course_flow && (
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent) => handleViewCourseFlow(option, e)}
                          className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-background dark:bg-zinc-900 border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                          title="View Program"
                        >
                          View
                        </button>
                      )}
                    </div>
                  );
                })
              }
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 gap-2"
          >
            <Plus size={18} />
            Continue with Selected Programs
          </Button>
        </div>
      </div>

      {/* Course Flow Modal */}
      {selectedProgramForFlow && (
        <CourseFlowModal
          open={courseFlowModalOpen}
          onClose={handleCloseCourseFlowModal}
          program={selectedProgramForFlow}
        />
      )}
    </div>
  );
}
