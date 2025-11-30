'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { School, GraduationCap, Plus, Compass } from 'lucide-react';
import Link from 'next/link';
import {
  ProgramSelectionInput,
  ProgramOption,
  fetchProgramsByType,
} from '@/lib/chatbot/tools/programSelectionTool';
import CourseFlowModal from './CourseFlowModal';

interface ProgramSelectionFormProps {
  studentType: 'undergraduate' | 'graduate';
  universityId: number;
  studentAdmissionYear?: number | null;
  studentIsTransfer?: boolean | null;
  onSubmit: (data: ProgramSelectionInput) => void;
  onProgramPathfinderClick?: () => void;
  suggestedPrograms?: Array<{ programName: string; programType: string }>;
}

export default function ProgramSelectionForm({
  studentType,
  universityId,
  studentAdmissionYear,
  studentIsTransfer,
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
  const [selectedGenEds, setSelectedGenEds] = useState<ProgramOption[]>([]);

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
          // Auto-select if only one gen ed option
          if (genEdPrograms.length === 1) {
            setSelectedGenEds(genEdPrograms);
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
      const matchedMajors = majors.filter(major =>
        suggestedMajorNames.some(suggested =>
          major.name.toLowerCase().includes(suggested) || suggested.includes(major.name.toLowerCase())
        )
      );

      // Find matching minors
      const matchedMinors = minors.filter(minor =>
        suggestedMinorNames.some(suggested =>
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

      const suggestedGraduateNames = suggestedPrograms.map(p => p.programName.toLowerCase());

      const matchedGraduatePrograms = graduatePrograms.filter(program =>
        suggestedGraduateNames.some(suggested =>
          program.name.toLowerCase().includes(suggested) || suggested.includes(program.name.toLowerCase())
        )
      );

      if (matchedGraduatePrograms.length > 0) {
        setSelectedGraduatePrograms(matchedGraduatePrograms);
      }
    }
  }, [suggestedPrograms, majors, minors, graduatePrograms, studentType, loadingMajors, loadingMinors, loadingGraduate]);

  const handleSubmit = () => {
    if (studentType === 'undergraduate') {
      if (selectedMajors.length === 0) {
        alert('Please select at least one major');
        return;
      }

      onSubmit({
        studentType: 'undergraduate',
        programs: {
          majorIds: selectedMajors.map(m => m.id),
          minorIds: selectedMinors.map(m => m.id),
          genEdIds: selectedGenEds.map(g => g.id),
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
          graduateProgramIds: selectedGraduatePrograms.map(p => p.id),
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

      {/* Pathfinder Help Button */}
      {onProgramPathfinderClick && (
        <div className="flex justify-center mb-6">
          <Button
            type="button"
            onClick={onProgramPathfinderClick}
            variant="outline"
            className="gap-2"
          >
            <Compass size={18} />
            Need help choosing your program?
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {studentType === 'undergraduate' ? (
          <>
            {/* Majors */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Major(s) <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                multiple
                options={majors}
                getOptionLabel={(option) => option.name}
                value={selectedMajors}
                onChange={(_event, newValue) => setSelectedMajors(newValue)}
                loading={loadingMajors}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="flex-1">{option.name}</span>
                        {option.course_flow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCourseFlow(option, e);
                            }}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors flex-shrink-0"
                          >
                            View Program
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search for majors..."
                    helperText="Select at least one major"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <div key={option.id} className="inline-flex items-center gap-1">
                      <Chip
                        {...getTagProps({ index })}
                        label={option.name}
                        size="small"
                        className="bg-[var(--primary)] text-white"
                      />
                      {option.course_flow && (
                        <button
                          type="button"
                          onClick={(e) => handleViewCourseFlow(option, e)}
                          className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-white border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
                          title="View Program"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))
                }
              />
            </div>

            {/* Minors */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Minor(s) <span className="text-muted-foreground text-xs">(Optional)</span>
              </label>
              <Autocomplete
                multiple
                options={minors}
                getOptionLabel={(option) => option.name}
                value={selectedMinors}
                onChange={(_event, newValue) => setSelectedMinors(newValue)}
                loading={loadingMinors}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="flex-1">{option.name}</span>
                        {option.course_flow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewCourseFlow(option, e);
                            }}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors flex-shrink-0"
                          >
                            View Program
                          </button>
                        )}
                      </div>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search for minors..."
                    helperText="Add any minors you're pursuing"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <div key={option.id} className="inline-flex items-center gap-1">
                      <Chip
                        {...getTagProps({ index })}
                        label={option.name}
                        size="small"
                      />
                      {option.course_flow && (
                        <button
                          type="button"
                          onClick={(e) => handleViewCourseFlow(option, e)}
                          className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-white border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
                          title="View Program"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))
                }
              />
            </div>

            {/* Gen Eds - Only show if more than one option */}
            {genEds.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  General Education <span className="text-muted-foreground text-xs">(Optional)</span>
                </label>
                <Autocomplete
                  multiple
                  options={genEds}
                  getOptionLabel={(option) => option.name}
                  value={selectedGenEds}
                  onChange={(_event, newValue) => setSelectedGenEds(newValue)}
                  loading={loadingGenEds}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="flex-1">{option.name}</span>
                          {option.course_flow && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewCourseFlow(option, e);
                              }}
                              className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors flex-shrink-0"
                            >
                              View Program
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search for gen ed requirements..."
                      helperText="Add any general education requirements"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <div key={option.id} className="inline-flex items-center gap-1">
                        <Chip
                          {...getTagProps({ index })}
                          label={option.name}
                          size="small"
                        />
                        {option.course_flow && (
                          <button
                            type="button"
                            onClick={(e) => handleViewCourseFlow(option, e)}
                            className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-white border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
                            title="View Program"
                          >
                            View
                          </button>
                        )}
                      </div>
                    ))
                  }
                />
              </div>
            )}

            {/* Show notice if gen ed auto-selected */}
            {genEds.length === 1 && selectedGenEds.length === 1 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">General Education:</span> {selectedGenEds[0].name}
                  <span className="ml-1 text-xs">(auto-selected)</span>
                </p>
              </div>
            )}
          </>
        ) : (
          // Graduate Programs
          <div>
            <label className="block text-sm font-medium mb-2">
              Graduate Program(s) <span className="text-red-500">*</span>
            </label>
            <Autocomplete
              multiple
              options={graduatePrograms}
              getOptionLabel={(option) => option.name}
              value={selectedGraduatePrograms}
              onChange={(_event, newValue) => setSelectedGraduatePrograms(newValue)}
              loading={loadingGraduate}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="flex-1">{option.name}</span>
                      {option.course_flow && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCourseFlow(option, e);
                          }}
                          className="px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors flex-shrink-0"
                        >
                          View Program
                        </button>
                      )}
                    </div>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search for graduate programs..."
                  helperText="Select your Master's, PhD, or other graduate program"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <div key={option.id} className="inline-flex items-center gap-1">
                    <Chip
                      {...getTagProps({ index })}
                      label={option.name}
                      size="small"
                      className="bg-[var(--primary)] text-white"
                    />
                    {option.course_flow && (
                      <button
                        type="button"
                        onClick={(e) => handleViewCourseFlow(option, e)}
                        className="px-2 py-1 text-xs font-medium text-[var(--primary)] bg-white border border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white rounded transition-colors"
                        title="View Program"
                      >
                        View
                      </button>
                    )}
                  </div>
                ))
              }
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full bg-[#0a1f1a] hover:bg-[#043322] gap-2"
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
