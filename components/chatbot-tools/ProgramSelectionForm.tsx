'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Autocomplete, { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { School, GraduationCap, Plus, Compass, FileCheck, Info } from 'lucide-react';
import {
  ProgramSelectionInput,
  ProgramOption,
  fetchProgramsByType,
} from '@/lib/chatbot/tools/programSelectionTool';
import CourseFlowModal from './CourseFlowModal';
import MarkdownMessage from '@/components/chatbot/MarkdownMessage';
import { fetchActiveGradPlanProgramsAction } from '@/lib/services/server-actions';

interface ProgramSelectionFormProps {
  studentType: 'undergraduate' | 'graduate';
  universityId: number;
  studentAdmissionYear?: number | null;
  studentIsTransfer?: 'freshman' | 'transfer' | 'dual_enrollment' | null;
  selectedGenEdProgramId?: number | null;
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
  selectedGenEdProgramId,
  profileId,
  onSubmit,
  onProgramPathfinderClick,
  suggestedPrograms,
}: Readonly<ProgramSelectionFormProps>) {
  // Undergraduate state
  const [majors, setMajors] = useState<ProgramOption[]>([]);
  const [minors, setMinors] = useState<ProgramOption[]>([]);
  const certificateOptions = [
    'Data Analytics',
    'Cybersecurity',
    'Project Management',
    'UX Design',
    'GIS',
    'Digital Marketing',
  ];
  const [genEds, setGenEds] = useState<ProgramOption[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<ProgramOption[]>([]);
  const [selectedMinors, setSelectedMinors] = useState<ProgramOption[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
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

  // Program description modal state
  const [programDescModalOpen, setProgramDescModalOpen] = useState(false);
  const [selectedProgramForDesc, setSelectedProgramForDesc] = useState<ProgramOption | null>(null);

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

      // Fetch gen eds - if selectedGenEdProgramId is provided, use it directly
      // Otherwise, fall back to filtering based on student metadata
      setLoadingGenEds(true);
      if (selectedGenEdProgramId) {
        // Fetch all gen-eds and pre-select the user's choice from profile step
        fetchProgramsByType(universityId, 'gen_ed')
          .then((genEdPrograms) => {
            setGenEds(genEdPrograms);
            // Pre-select the gen-ed that was chosen in the profile step
            const preSelectedGenEd = genEdPrograms.find(
              p => Number(p.id) === selectedGenEdProgramId
            );
            if (preSelectedGenEd) {
              setSelectedGenEd(preSelectedGenEd);
            } else if (genEdPrograms.length > 0) {
              // Fallback to first if somehow the pre-selected one isn't found
              setSelectedGenEd(genEdPrograms[0]);
            }
          })
          .finally(() => setLoadingGenEds(false));
      } else {
        // Legacy behavior - filter by student metadata and auto-select highest priority
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
      }
    } else {
      // Fetch graduate programs
      setLoadingGraduate(true);
      fetchProgramsByType(universityId, 'graduate')
        .then(setGraduatePrograms)
        .finally(() => setLoadingGraduate(false));
    }
  }, [studentType, universityId, selectedGenEdProgramId, studentAdmissionYear, studentIsTransfer]);

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

  const handleViewProgramDescription = (program: ProgramOption, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedProgramForDesc(program);
    setProgramDescModalOpen(true);
  };

  const handleCloseProgramDescModal = () => {
    setProgramDescModalOpen(false);
    setSelectedProgramForDesc(null);
  };

  const formatCreditRequirements = (program: ProgramOption): string => {
    const hasMin = program.minimum_credits !== null && program.minimum_credits !== undefined;
    const hasTarget = program.target_total_credits !== null && program.target_total_credits !== undefined;

    if (hasMin && hasTarget) {
      // If min and target are the same, just show one value
      if (program.minimum_credits === program.target_total_credits) {
        return `${program.minimum_credits} credits`;
      }
      return `${program.minimum_credits}-${program.target_total_credits} credits`;
    } else if (hasTarget) {
      return `${program.target_total_credits} credits`;
    } else if (hasMin) {
      return `Min. ${program.minimum_credits} credits`;
    }
    return '';
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
              variant="secondary"
              type="button"
              onClick={onProgramPathfinderClick}
              className="gap-2"
            >
              <Compass size={18} />
              I need help choosing my program(s)
            </Button>
          )}
          {hasActiveGradPlan && (
            <Button
              variant="secondary"
              type="button"
              onClick={handleLoadPriorGradPlan}
              className="gap-2"
            >
              <FileCheck size={18} />
              Use the programs from my prior active grad plan
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
                  const creditInfo = formatCreditRequirements(option);
                  return (
                    <li key={key} {...otherProps}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex-1">
                          <div className="font-medium">{option.name}</div>
                          {creditInfo && (
                            <div className="text-xs text-muted-foreground">{creditInfo}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!!option.program_description && (
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => handleViewProgramDescription(option, e)}
                              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                            >
                              Program Description
                            </button>
                          )}
                          {!!option.course_flow && (
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleViewCourseFlow(option, e);
                              }}
                              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                            >
                              View Program
                            </button>
                          )}
                        </div>
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
                      <Chip
                        key={option.id}
                        {...chipProps}
                        label={option.name}
                        size="small"
                        className="bg-[var(--primary)] text-primary-foreground"
                      />
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
                  const creditInfo = formatCreditRequirements(option);
                  return (
                    <li key={key} {...otherProps}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex-1">
                          <div className="font-medium">{option.name}</div>
                          {creditInfo && (
                            <div className="text-xs text-muted-foreground">{creditInfo}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!!option.program_description && (
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => handleViewProgramDescription(option, e)}
                              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                            >
                              Program Description
                            </button>
                          )}
                          {!!option.course_flow && (
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleViewCourseFlow(option, e);
                              }}
                              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded transition-colors"
                            >
                              View Program
                            </button>
                          )}
                        </div>
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
                      <Chip
                        key={option.id}
                        {...chipProps}
                        label={option.name}
                        size="small"
                      />
                    );
                  })
                }
              />
            </div>

            {/* Certificates (placeholder) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Certificate(s) <span className="text-muted-foreground text-xs">(Optional)</span>
              </label>
              <Autocomplete
                multiple
                options={certificateOptions}
                value={selectedCertificates}
                onChange={(_event: React.SyntheticEvent, newValue: string[]) => setSelectedCertificates(newValue)}
                renderInput={(params: AutocompleteRenderInputParams) => (
                  <TextField
                    {...params}
                    placeholder="Select certificates..."
                    helperText="Examples: Data Analytics, Cybersecurity, Project Management, UX Design, GIS, Digital Marketing"
                  />
                )}
                renderTags={(value: string[], getTagProps: (arg: { index: number }) => Record<string, unknown>) =>
                  value.map((option: string, index: number) => {
                    const { key, ...chipProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={option}
                        {...chipProps}
                        label={option}
                        size="small"
                      />
                    );
                  })
                }
              />
            </div>

            {/* Gen Eds - Card-based selection */}
            {genEds.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  General Education
                </label>
                {loadingGenEds ? (
                  <div className="text-muted-foreground text-sm">Loading general education options...</div>
                ) : (
                  <div className="grid gap-3">
                    {genEds.map((genEd) => {
                      const isSelected = selectedGenEd?.id === genEd.id;
                      const creditInfo = formatCreditRequirements(genEd);
                      return (
                        <div
                          key={genEd.id}
                          onClick={() => setSelectedGenEd(genEd)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-border hover:border-[var(--primary)]/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-foreground">{genEd.name}</h4>
                                {isSelected && (
                                  <div className="flex-shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M5 13l4 4L19 7"></path>
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {!!genEd.program_description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {genEd.program_description}
                                </p>
                              )}
                              {creditInfo && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {creditInfo}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!!genEd.program_description && (
                                <button
                                  type="button"
                                  onClick={(e: React.MouseEvent) => handleViewProgramDescription(genEd, e)}
                                  className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                                  title="View full description"
                                >
                                  <Info size={16} />
                                </button>
                              )}
                              {!!genEd.course_flow && (
                                <button
                                  type="button"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleViewCourseFlow(genEd, e);
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                                >
                                  View Program
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                const creditInfo = formatCreditRequirements(option);
                return (
                  <li key={key} {...otherProps}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex-1">
                        <div className="font-medium">{option.name}</div>
                        {creditInfo && (
                          <div className="text-xs text-muted-foreground">{creditInfo}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!!option.program_description && (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => handleViewProgramDescription(option, e)}
                            className="p-1 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                            title="View program description"
                          >
                            <Info size={16} />
                          </button>
                        )}
                        {!!option.course_flow && (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleViewCourseFlow(option, e);
                            }}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-primary-foreground rounded transition-colors"
                          >
                            View Program
                          </button>
                        )}
                      </div>
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
                    <Chip
                      key={option.id}
                      {...chipProps}
                      label={option.name}
                      size="small"
                      className="bg-[var(--primary)] text-primary-foreground"
                    />
                  );
                })
              }
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full gap-2"
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

      {/* Program Description Modal */}
      <Dialog
        open={programDescModalOpen}
        onClose={handleCloseProgramDescModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedProgramForDesc?.name}
        </DialogTitle>
        <DialogContent>
          {selectedProgramForDesc?.program_description ? (
            <div className="mt-2">
              <MarkdownMessage content={selectedProgramForDesc.program_description} />
            </div>
          ) : (
            <p className="text-muted-foreground">No description available for this program.</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={handleCloseProgramDescModal}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
