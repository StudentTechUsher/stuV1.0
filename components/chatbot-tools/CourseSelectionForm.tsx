'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { StuLoader } from '@/components/ui/StuLoader';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { BookOpen, Plus, X } from 'lucide-react';
import {
  CourseSelectionInput,
  CourseEntry,
  RequirementCourses,
  ProgramCourseSelection,
} from '@/lib/chatbot/tools/courseSelectionTool';
import type { ProgramRow } from '@/types/program';
import {
  parseRequirementsFromGenEd,
  getProgramDropdownCount,
  collectCourses,
  creditText,
  getRequirementKey,
  shouldAutoSelect,
  getValidCourses,
  getDropdownCount,
  type CourseBlock,
  type ProgramRequirement,
} from '@/components/grad-planner/helpers/grad-plan-helpers';
import type { CourseOffering } from '@/lib/services/courseOfferingService';
import {
  getCollegesAction,
  getDepartmentCodesAction,
  getCoursesByDepartmentAction,
} from '@/lib/services/server-actions';
import { recommendCourses, type CourseRecommendationContext } from '@/lib/services/courseRecommendationService';
import CourseRecommendationPanel from './CourseRecommendationPanel';

interface CourseSelectionFormProps {
  studentType: 'undergraduate' | 'graduate';
  universityId: number;
  selectedProgramIds: number[];
  genEdProgramIds?: number[];
  careerGoals?: string | null;
  studentInterests?: string | null;
  selectedMajorMinors?: string[];
  onSubmit: (data: CourseSelectionInput) => void;
}

export default function CourseSelectionForm({
  studentType,
  universityId,
  selectedProgramIds,
  genEdProgramIds = [],
  careerGoals = null,
  studentInterests = null,
  selectedMajorMinors = [],
  onSubmit,
}: Readonly<CourseSelectionFormProps>) {
  // Program data state
  const [programsData, setProgramsData] = useState<ProgramRow[]>([]);
  const [genEdData, setGenEdData] = useState<ProgramRow[]>([]);
  const [loadingProgramData, setLoadingProgramData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // Selected courses state
  const [selectedCourses, setSelectedCourses] = useState<Record<string, string[]>>({});
  const [selectedProgramCourses, setSelectedProgramCourses] = useState<Record<string, string[]>>({});

  // User electives state
  const [userElectives, setUserElectives] = useState<Array<{ id: string; code: string; title: string; credits: number }>>([]);
  const [electiveError, setElectiveError] = useState<string | null>(null);

  // Three-step dropdown state for electives
  const [colleges, setColleges] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseOffering[]>([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedElectiveCourse, setSelectedElectiveCourse] = useState<CourseOffering | null>(null);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Track which sections are expanded (auto-selected sections start collapsed)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const selectedPrograms = useMemo(() => new Set(selectedProgramIds.map(id => String(id))), [selectedProgramIds]);
  const isGraduateStudent = studentType === 'graduate';

  // Build recommendation context
  const recommendationContext = useMemo<CourseRecommendationContext>(() => ({
    careerGoals,
    studentInterests,
    selectedMajorMinors,
  }), [careerGoals, studentInterests, selectedMajorMinors]);

  // Get recommendations for a requirement based on available courses
  const getRecommendationsForRequirement = useCallback((courses: unknown[]): { recommendations: any[]; dropdownCount: number } => {
    const dropdownCount = courses.length;

    // Only show recommendations if there are more than 3 courses and we have context
    if (dropdownCount <= 3 || (!careerGoals && !studentInterests)) {
      return { recommendations: [], dropdownCount };
    }

    // Convert courses to the format expected by recommendCourses
    // Handle both CourseBlock[] and ProgramCourse[] types
    const courseData = courses
      .filter((c: any) => c.status !== 'retired' && c.credits != null && c.title && c.code)
      .map((c: any) => ({
        id: c.code,
        code: c.code,
        title: c.title || 'Unknown',
        description: c.title || '', // Use title as fallback for description
      }));

    const recommendations = recommendCourses(courseData, recommendationContext);
    return { recommendations, dropdownCount };
  }, [careerGoals, studentInterests, selectedMajorMinors, recommendationContext]);

  // Fetch program data when component mounts
  useEffect(() => {
    async function fetchProgramData() {
      if (selectedProgramIds.length === 0 && genEdProgramIds.length === 0) return;

      setLoadingProgramData(true);
      setDataLoadError(null);

      try {
        // Fetch selected programs (majors + minors OR graduate programs) with full requirements
        if (selectedProgramIds.length > 0) {
          const programsRes = await fetch(`/api/programs/batch?ids=${selectedProgramIds.join(',')}&universityId=${universityId}`);
          if (!programsRes.ok) throw new Error('Failed to fetch program data');
          const programsJson = await programsRes.json();
          setProgramsData(programsJson);
        }

        // Fetch GenEd programs with full requirements (skip for graduate students)
        if (!isGraduateStudent && genEdProgramIds.length > 0) {
          const genEdRes = await fetch(`/api/programs/batch?ids=${genEdProgramIds.join(',')}&universityId=${universityId}`);
          if (!genEdRes.ok) throw new Error('Failed to fetch GenEd data');
          const genEdJson = await genEdRes.json();
          setGenEdData(genEdJson);
        }
      } catch (error) {
        console.error('Error fetching program data:', error);
        setDataLoadError('Failed to load program data. Please try again.');
      } finally {
        setLoadingProgramData(false);
      }
    }

    fetchProgramData();
  }, [selectedProgramIds, genEdProgramIds, universityId, isGraduateStudent]);

  // Load colleges when component mounts
  useEffect(() => {
    async function fetchColleges() {
      setLoadingColleges(true);
      setElectiveError(null);
      try {
        const result = await getCollegesAction(universityId);
        if (result.success && result.colleges) {
          setColleges(result.colleges);
        } else {
          setElectiveError(result.error || 'Failed to load colleges');
        }
      } catch (error) {
        console.error('Error fetching colleges:', error);
        setElectiveError('Failed to load colleges. Please try again.');
      } finally {
        setLoadingColleges(false);
      }
    }

    fetchColleges();
  }, [universityId]);

  // Load departments when college is selected
  useEffect(() => {
    if (!selectedCollege) {
      setDepartments([]);
      setSelectedDepartment('');
      return;
    }

    async function fetchDepartments() {
      setLoadingDepartments(true);
      setElectiveError(null);
      try {
        const result = await getDepartmentCodesAction(universityId, selectedCollege);
        if (result.success && result.departments) {
          setDepartments(result.departments);
        } else {
          setElectiveError(result.error || 'Failed to load departments');
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        setElectiveError('Failed to load departments. Please try again.');
      } finally {
        setLoadingDepartments(false);
      }
    }

    fetchDepartments();
  }, [selectedCollege, universityId]);

  // Load courses when department is selected
  useEffect(() => {
    if (!selectedDepartment || !selectedCollege) {
      setAvailableCourses([]);
      return;
    }

    async function fetchCourses() {
      setLoadingCourses(true);
      setElectiveError(null);
      try {
        const result = await getCoursesByDepartmentAction(
          universityId,
          selectedCollege,
          selectedDepartment
        );
        if (result.success && result.courses) {
          setAvailableCourses(result.courses);
        } else {
          setElectiveError(result.error || 'Failed to load courses');
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        setElectiveError('Failed to load courses. Please try again.');
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, [selectedDepartment, selectedCollege, universityId]);

  // Parse requirements
  const requirements = useMemo(() => parseRequirementsFromGenEd(genEdData), [genEdData]);

  // Parse requirements per program (not combined)
  const programRequirementsMap = useMemo(() => {
    const map: Record<string, ProgramRequirement[]> = {};

    programsData.forEach(program => {
      if (!selectedPrograms.has(String(program.id))) return;
      if (!program.requirements) return;

      try {
        const req = typeof program.requirements === 'string'
          ? JSON.parse(program.requirements)
          : program.requirements;

        if (Array.isArray(req?.programRequirements)) {
          map[String(program.id)] = req.programRequirements;
        }
      } catch (error) {
        console.error(`Error parsing program requirements for ${program.name}:`, error);
      }
    });

    return map;
  }, [programsData, selectedPrograms]);

  // Course options per requirement (memoized map)
  const requirementCoursesMap = useMemo<Record<string, CourseBlock[]>>(() => {
    const map: Record<string, CourseBlock[]> = {};
    for (const req of requirements) {
      map[req.subtitle] = collectCourses(req.blocks);
    }
    return map;
  }, [requirements]);

  // Ensure state array length matches dropdown count
  const ensureSlots = useCallback((subtitle: string, count: number) => {
    setSelectedCourses(prev => {
      const prevList = prev[subtitle] ?? [];
      if (prevList.length === count) return prev;
      const nextList = [...prevList];
      while (nextList.length < count) nextList.push('');
      if (nextList.length > count) nextList.length = count;
      return { ...prev, [subtitle]: nextList };
    });
  }, []);

  const ensureProgramSlots = useCallback((requirementKey: string, count: number) => {
    setSelectedProgramCourses(prev => {
      const prevList = prev[requirementKey] ?? [];
      if (prevList.length === count) return prev;
      const nextList = [...prevList];
      while (nextList.length < count) nextList.push('');
      if (nextList.length > count) nextList.length = count;
      return { ...prev, [requirementKey]: nextList };
    });
  }, []);

  // Initialize slots for all requirements
  useEffect(() => {
    requirements.forEach(req => {
      const dropdownCount = getDropdownCount(req);
      ensureSlots(req.subtitle, dropdownCount);
    });

    Array.from(selectedPrograms).forEach(programId => {
      const programReqs = programRequirementsMap[programId] || [];
      programReqs.forEach(req => {
        if (req.courses) {
          const dropdownCount = getProgramDropdownCount(req);
          const requirementKey = getRequirementKey(programId, req);
          ensureProgramSlots(requirementKey, dropdownCount);
        }
        if (req.subRequirements) {
          req.subRequirements.forEach(subReq => {
            const dropdownCount = getProgramDropdownCount(subReq);
            const subReqKey = getRequirementKey(programId, subReq, true);
            ensureProgramSlots(subReqKey, dropdownCount);
          });
        }
      });
    });
  }, [requirements, ensureSlots, programRequirementsMap, ensureProgramSlots, selectedPrograms]);

  // Auto-populate general requirements
  useEffect(() => {
    const timer = setTimeout(() => {
      requirements.forEach(req => {
        const dropdownCount = getDropdownCount(req);
        const courses = requirementCoursesMap[req.subtitle] || [];
        if (courses.length > 0 && courses.length === dropdownCount) {
          setSelectedCourses(prev => {
            const existing = prev[req.subtitle] ?? [];
            const hasEmptySlots = existing.length < dropdownCount || existing.some(course => !course || course.trim() === '');

            if (hasEmptySlots) {
              const next = [...existing];
              while (next.length < dropdownCount) next.push('');

              courses.forEach((course, index) => {
                if (index < dropdownCount && (!next[index] || next[index].trim() === '')) {
                  next[index] = course.code;
                }
              });
              return { ...prev, [req.subtitle]: next };
            }
            return prev;
          });
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [requirements, requirementCoursesMap]);

  // Auto-populate program requirements
  useEffect(() => {
    if (selectedPrograms.size === 0) return;

    const timer = setTimeout(() => {
      Array.from(selectedPrograms).forEach(programId => {
        const programReqs = programRequirementsMap[programId] || [];
        programReqs.forEach(req => {
          if (req.courses) {
            const dropdownCount = getProgramDropdownCount(req);
            const requirementKey = getRequirementKey(programId, req);
            const validCourses = getValidCourses(req);

            if (shouldAutoSelect(req, false)) {
              setSelectedProgramCourses(prev => {
                const existing = prev[requirementKey] ?? [];
                const hasEmptySlots = existing.length < dropdownCount || existing.some(course => !course || course.trim() === '');

                if (hasEmptySlots) {
                  const next = [...existing];
                  while (next.length < dropdownCount) next.push('');

                  for (let i = 0; i < dropdownCount && i < validCourses.length; i++) {
                    if (!next[i] || next[i].trim() === '') {
                      next[i] = validCourses[i].code;
                    }
                  }
                  return { ...prev, [requirementKey]: next };
                }
                return prev;
              });
            }
          }
        });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedPrograms, programRequirementsMap]);

  const handleCourseSelection = (subtitle: string, slotIndex: number, courseCode: string) => {
    setSelectedCourses(prev => {
      const existing = prev[subtitle] ?? [];
      const next = [...existing];
      next[slotIndex] = courseCode;
      return { ...prev, [subtitle]: next };
    });
  };

  const handleProgramCourseSelection = (requirementKey: string, slotIndex: number, courseCode: string) => {
    setSelectedProgramCourses(prev => {
      const existing = prev[requirementKey] ?? [];
      const next = [...existing];
      next[slotIndex] = courseCode;
      return { ...prev, [requirementKey]: next };
    });
  };

  const handleAddElective = () => {
    if (!selectedElectiveCourse) return;

    const code = selectedElectiveCourse.course_code.trim().toUpperCase();
    const title = selectedElectiveCourse.title.trim();
    const credits = selectedElectiveCourse.credits_decimal || 3.0;

    if (userElectives.some(e => e.code === code)) {
      setElectiveError('This course has already been added.');
      return;
    }

    const newCourse = {
      id: `${selectedElectiveCourse.offering_id}`,
      code,
      title,
      credits
    };
    setUserElectives(prev => [...prev, newCourse]);
    setSelectedElectiveCourse(null);
    setElectiveError(null);
  };

  const handleRemoveElective = (id: string) => {
    setUserElectives(prev => prev.filter(c => c.id !== id));
  };

  const getCourseDetails = (courseCode: string, coursesList: Array<{ code: string; title: string; credits: number | { fixed: number } | { variable: true; min?: number; max?: number } | null }>): CourseEntry => {
    const course = coursesList.find(c => c.code === courseCode);
    if (!course) {
      return { code: courseCode, title: '', credits: 3 };
    }

    let credits: number = 3;
    if (course.credits && typeof course.credits === 'object') {
      if ('fixed' in course.credits) {
        credits = course.credits.fixed;
      } else if ('min' in course.credits && course.credits.min) {
        credits = course.credits.min;
      }
    } else if (typeof course.credits === 'number') {
      credits = course.credits;
    }

    return {
      code: course.code,
      title: course.title,
      credits,
    };
  };

  const handleSubmit = () => {
    // Build the course selection data
    const generalEducation: RequirementCourses[] = [];
    const programs: ProgramCourseSelection[] = [];

    // Process general education requirements (undergraduate only)
    if (!isGraduateStudent) {
      requirements.forEach(req => {
        const selected = selectedCourses[req.subtitle] || [];
        const filteredSelected = selected.filter(course => course && course.trim() !== '');

        if (filteredSelected.length > 0) {
          const courses = requirementCoursesMap[req.subtitle] || [];
          generalEducation.push({
            requirementId: req.subtitle,
            requirementDescription: req.subtitle,
            selectedCourses: filteredSelected.map(courseCode =>
              getCourseDetails(courseCode, courses)
            ),
          });
        }
      });
    }

    // Process program requirements
    Array.from(selectedPrograms).forEach(programId => {
      const program = programsData?.find(p => String(p.id) === programId);
      if (!program) return;

      const programReqs = programRequirementsMap[programId] || [];
      if (programReqs.length === 0) return;

      const programCourseSelection: ProgramCourseSelection = {
        programId,
        programName: program.name || 'Unknown Program',
        programType: program.program_type || 'unknown',
        requirements: [],
      };

      programReqs.forEach(req => {
        // Main requirement courses
        if (req.courses && req.courses.length > 0) {
          const selected = selectedProgramCourses[`${programId}-req-${req.requirementId}`] || [];
          const filteredSelected = selected.filter(course => course && course.trim() !== '');

          if (filteredSelected.length > 0) {
            programCourseSelection.requirements.push({
              requirementId: `requirement-${req.requirementId}`,
              requirementDescription: req.description,
              selectedCourses: filteredSelected.map(courseCode =>
                getCourseDetails(courseCode, req.courses || [])
              ),
            });
          }
        }

        // Sub-requirements
        if (req.subRequirements && req.subRequirements.length > 0) {
          req.subRequirements.forEach(subReq => {
            const selected = selectedProgramCourses[`${programId}-subreq-${subReq.requirementId}`] || [];
            const filteredSelected = selected.filter(course => course && course.trim() !== '');

            if (filteredSelected.length > 0) {
              programCourseSelection.requirements.push({
                requirementId: `subrequirement-${subReq.requirementId}`,
                requirementDescription: subReq.description,
                selectedCourses: filteredSelected.map(courseCode =>
                  getCourseDetails(courseCode, subReq.courses)
                ),
              });
            }
          });
        }
      });

      if (programCourseSelection.requirements.length > 0) {
        programs.push(programCourseSelection);
      }
    });

    // Validate
    if (programs.length === 0) {
      alert('Please select at least one course for your program requirements');
      return;
    }

    const courseSelectionData: CourseSelectionInput = {
      selectionMode: 'manual',
      ...(generalEducation.length > 0 && { generalEducation }),
      programs,
      ...(userElectives.length > 0 && {
        userAddedElectives: userElectives.map(e => ({
          code: e.code,
          title: e.title,
          credits: e.credits,
        })),
      }),
    };

    onSubmit(courseSelectionData);
  };

  if (loadingProgramData) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <StuLoader
          variant="card"
          text="Loading program requirements..."
        />
      </div>
    );
  }

  if (dataLoadError) {
    return (
      <div className="w-full">
        <Alert severity="error">{dataLoadError}</Alert>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <BookOpen size={18} />
          Select Your Courses
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Choose courses to fulfill each requirement
        </p>
      </div>

      {/* Pathfinder Help Button - Hidden for now */}
      {/* <div className="flex justify-center mb-6">
        <Button
          component={Link}
          href="/pathfinder"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          className="gap-2"
        >
          <Compass size={18} />
          Need help selecting courses?
        </Button>
      </div> */}

      <div className="space-y-3">
        {/* General Education Requirements (Undergraduate Only) */}
        {!isGraduateStudent && requirements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 text-gray-900">General Education</h4>
            <div className="space-y-3">
              {requirements.map((req, idx) => {
                const dropdownCount = getDropdownCount(req);
                const courses = requirementCoursesMap[req.subtitle] || [];
                const isAutoSelected = courses.length > 0 && courses.length === dropdownCount;
                const sectionKey = `gen-ed-${req.subtitle}`;
                const isExpanded = expandedSections[sectionKey] ?? !isAutoSelected; // Expand by default, except auto-selected
                const { recommendations } = getRecommendationsForRequirement(courses);

                return (
                  <div key={`${req.subtitle}-${idx}`} className="space-y-2 border border-gray-200 rounded p-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedSections(prev => ({
                        ...prev,
                        [sectionKey]: !isExpanded,
                      }))}
                      className="w-full flex items-center gap-2 cursor-pointer hover:opacity-80"
                    >
                      <div className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                      <p className="text-sm font-medium">{req.subtitle}</p>
                      {isAutoSelected && (
                        <Chip
                          label="Auto-selected"
                          size="small"
                          className="text-xs ml-auto"
                          sx={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            height: '20px',
                          }}
                        />
                      )}
                    </button>

                    {isExpanded && (
                      <>
                        {isAutoSelected && (
                          <p className="text-xs text-muted-foreground italic">
                            All available courses for this requirement have been automatically selected ({courses.length} course{courses.length === 1 ? '' : 's'}).
                          </p>
                        )}

                        {recommendations.length > 0 && (
                          <div className="mt-3 mb-3">
                            <CourseRecommendationPanel
                              recommendations={recommendations}
                              dropdownCount={courses.length}
                              onCourseSelect={(courseCode) => handleCourseSelection(req.subtitle, 0, courseCode)}
                            />
                          </div>
                        )}

                        {Array.from({ length: dropdownCount }).map((_, slot) => (
                          <FormControl
                            key={`${req.subtitle}-slot-${slot}`}
                            fullWidth
                            size="small"
                            sx={{ mb: slot < dropdownCount - 1 ? 2 : 0 }}
                          >
                            <InputLabel>
                              {dropdownCount > 1
                                ? `${req.subtitle} — Course #${slot + 1}`
                                : req.subtitle}
                            </InputLabel>
                            <Select
                              value={(selectedCourses[req.subtitle]?.[slot] ?? '')}
                              label={
                                dropdownCount > 1
                                  ? `${req.subtitle} — Course #${slot + 1}`
                                  : req.subtitle
                              }
                              disabled={isAutoSelected}
                              onChange={(e) => handleCourseSelection(req.subtitle, slot, e.target.value)}
                            >
                              <MenuItem value=""><em>Select a course</em></MenuItem>
                              {courses
                                .filter(c => c.status !== 'retired' && c.credits != null)
                                .map((c, courseIdx) => (
                                <MenuItem key={`${req.subtitle}-${idx}-slot-${slot}-${c.code}-${courseIdx}`} value={c.code}>
                                  {c.code} — {c.title} ({creditText(c.credits)})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ))}
                      </>
                    )}

                    {idx < requirements.length - 1 && <Divider className="my-4" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Program Requirements */}
        {Array.from(selectedPrograms).map((programId) => {
          const program = programsData?.find(p => String(p.id) === programId);
          if (!program) return null;

          const programReqs = programRequirementsMap[programId] || [];
          if (programReqs.length === 0) return null;

          return (
            <div key={programId}>
              <h4 className="text-sm font-semibold mb-3 text-gray-900">
                {program.name} {program.version && `(${program.version})`}
              </h4>

              <div className="space-y-3">
                {programReqs.map((req, reqIdx) => {
                  if (!req.courses || req.courses.length === 0) return null;

                  const dropdownCount = getProgramDropdownCount(req);
                  const requirementKey = getRequirementKey(programId, req);
                  const validCourses = getValidCourses(req);
                  const isAutoSelected = shouldAutoSelect(req, false);
                  const sectionKey = `prog-req-${requirementKey}`;
                  const isExpanded = expandedSections[sectionKey] ?? !isAutoSelected; // Expand by default, except auto-selected
                  const { recommendations: progRecommendations } = getRecommendationsForRequirement(validCourses);

                  return (
                    <div key={`${programId}-req-${req.requirementId}`} className="space-y-2 border border-gray-200 rounded p-2.5">
                      <button
                        type="button"
                        onClick={() => setExpandedSections(prev => ({
                          ...prev,
                          [sectionKey]: !isExpanded,
                        }))}
                        className="w-full flex items-center gap-2 cursor-pointer hover:opacity-80"
                      >
                        <div className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                        <p className="text-sm font-medium">{req.description}</p>
                        {isAutoSelected && (
                          <Chip
                            label="Auto-selected"
                            size="small"
                            className="text-xs ml-auto"
                            sx={{
                              backgroundColor: 'var(--primary)',
                              color: 'white',
                              height: '20px',
                            }}
                          />
                        )}
                      </button>

                      {isExpanded && (
                        <>
                          {progRecommendations.length > 0 && (
                            <div className="mt-3 mb-3">
                              <CourseRecommendationPanel
                                recommendations={progRecommendations}
                                dropdownCount={validCourses.length}
                                onCourseSelect={(courseCode) => handleProgramCourseSelection(requirementKey, 0, courseCode)}
                              />
                            </div>
                          )}

                          {Array.from({ length: dropdownCount }).map((_, slot) => (
                            <FormControl
                              key={`${requirementKey}-slot-${slot}`}
                              fullWidth
                              size="small"
                              sx={{ mb: slot < dropdownCount - 1 ? 2 : 0 }}
                            >
                              <InputLabel>
                                {dropdownCount > 1
                                  ? `${req.description} — Course #${slot + 1}`
                                  : req.description}
                              </InputLabel>
                              <Select
                                value={(selectedProgramCourses[requirementKey]?.[slot] ?? '')}
                                label={
                                  dropdownCount > 1
                                    ? `${req.description} — Course #${slot + 1}`
                                    : req.description
                                }
                                disabled={isAutoSelected}
                                onChange={(e) => handleProgramCourseSelection(requirementKey, slot, e.target.value)}
                              >
                                <MenuItem value=""><em>Select a course</em></MenuItem>
                                {validCourses.map((c) => (
                                  <MenuItem key={`${requirementKey}-slot-${slot}-${c.code}`} value={c.code}>
                                    {c.code} — {c.title} ({c.credits} cr)
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ))}
                        </>
                      )}

                      {reqIdx < programReqs.length - 1 && <Divider className="my-4" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Elective Courses */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-900">Additional Electives (Optional)</h4>
          <p className="text-xs text-gray-600 mb-3">
            Add extra courses you want to take
          </p>

          <div className="space-y-4">
            {/* Step 1: College */}
            <TextField
              select
              fullWidth
              label="1. Select College"
              value={selectedCollege}
              onChange={(e) => {
                setSelectedCollege(e.target.value);
                setSelectedDepartment('');
                setSelectedElectiveCourse(null);
              }}
              disabled={loadingColleges}
              size="small"
            >
              {loadingColleges ? (
                <MenuItem value="">
                  <CircularProgress size={20} />
                </MenuItem>
              ) : colleges.length === 0 ? (
                <MenuItem value="" disabled>
                  No colleges available
                </MenuItem>
              ) : (
                colleges.map((college) => (
                  <MenuItem key={college} value={college}>
                    {college}
                  </MenuItem>
                ))
              )}
            </TextField>

            {/* Step 2: Department */}
            <TextField
              select
              fullWidth
              label="2. Select Department"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedElectiveCourse(null);
              }}
              disabled={!selectedCollege || loadingDepartments}
              size="small"
            >
              {loadingDepartments ? (
                <MenuItem value="">
                  <CircularProgress size={20} />
                </MenuItem>
              ) : departments.length === 0 ? (
                <MenuItem value="" disabled>
                  {selectedCollege ? 'No departments available' : 'Select a college first'}
                </MenuItem>
              ) : (
                departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))
              )}
            </TextField>

            {/* Step 3: Course with Add Button */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                fullWidth
                label="3. Select Course"
                value={selectedElectiveCourse?.offering_id.toString() || ''}
                onChange={(e) => {
                  const course = availableCourses.find(c => c.offering_id.toString() === e.target.value);
                  setSelectedElectiveCourse(course || null);
                }}
                disabled={!selectedDepartment || loadingCourses}
                size="small"
                sx={{ flex: 1 }}
              >
                {loadingCourses ? (
                  <MenuItem value="">
                    <CircularProgress size={20} />
                  </MenuItem>
                ) : availableCourses.length === 0 ? (
                  <MenuItem value="" disabled>
                    {selectedDepartment ? 'No courses available' : 'Select a department first'}
                  </MenuItem>
                ) : (
                  availableCourses.map((course) => (
                    <MenuItem key={course.offering_id} value={course.offering_id.toString()}>
                      {course.course_code} - {course.title} ({course.credits_decimal || 0} cr)
                    </MenuItem>
                  ))
                )}
              </TextField>

              <Button
                onClick={handleAddElective}
                disabled={!selectedElectiveCourse}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'black',
                  minWidth: '44px',
                  padding: '8px'
                }}
                className="hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Plus size={20} />
              </Button>
            </Box>

            {electiveError && (
              <p className="text-xs text-red-500">{electiveError}</p>
            )}

            {userElectives.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {userElectives.map((elective) => (
                  <Chip
                    key={elective.id}
                    label={`${elective.code} (${elective.credits} cr)`}
                    onDelete={() => handleRemoveElective(elective.id)}
                    deleteIcon={<X size={14} />}
                    size="small"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3 flex gap-2 justify-end">
          <Button
            onClick={handleSubmit}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'black'
            }}
            className="px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
