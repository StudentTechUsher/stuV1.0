'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { StuLoader } from '@/components/ui/StuLoader';
import { Sparkles } from 'lucide-react';
import { searchCourseOfferings, type CourseOffering } from '@/lib/services/courseOfferingService';
import { recommendCourses, type CourseRecommendation } from '@/lib/services/courseRecommendationService';
import type { ProgramRow } from '@/types/program';
import type { OrganizePromptInput } from '@/lib/validation/schemas';
import { fetchUserCoursesAction } from '@/lib/services/server-actions';
import { decodeAccessIdClient } from '@/lib/utils/access-id';
import { validatePlanName } from '@/lib/utils/plan-name-validation';
import {
  parseRequirementsFromGenEd,
  parseProgramRequirements,
  getProgramDropdownCount,
  collectCourses,
  creditText,
  getRequirementKey,
  shouldAutoSelect,
  getValidCourses,
  getDropdownCount,
  getFlattenedRequirements,
  type CourseBlock,
  type Credits
} from './helpers/grad-plan-helpers';

interface Term {
  term: string;
  notes?: string;
  courses?: Array<{
    code: string;
    title: string;
    credits: number;
    fulfills?: string[];
  }>;
  credits_planned?: number;
  is_active?: boolean;
}

interface Course {
  code: string;
  title: string;
  credits: Credits | number | string;
  prerequisite?: string;
}

type SelectedCourseEntry = {
  code: string;
  title: string;
  credits: number | string;
  prerequisite?: string;
};

type SelectedClassesPayload = {
  timestamp: string;
  selectedPrograms: string[];
  genEdPrograms: string[];
  assumptions: { genEdStrategy: string };
  selectionMode: 'AUTO' | 'MANUAL';
  programs: Record<string, {
    programId: string;
    programName: string;
    programType: string;
    version?: string;
    requirements: Record<string, {
      description: string;
      courses: SelectedCourseEntry[];
    }>;
  }>;
  generalEducation: Record<string, SelectedCourseEntry[]>;
  userAddedElectives: Array<{ code: string; title: string; credits: number }>;
  takenCourses?: Array<{
    code: string;
    title: string;
    credits: number;
    term: string;
    grade: string;
    status: string;
    source: string;
  }>;
};

// Types for program & requirement logic moved to helpers (imported above)

// === Props ===
interface CreateGradPlanDialogProps {
  open: boolean;
  onClose: () => void;
  selectedProgramIds: string[];
  genEdProgramIds: string[];
  genEdStrategy: 'early' | 'balanced';
  planMode: 'AUTO' | 'MANUAL';
  universityId: number;
  userId?: string;
  onPlanCreated?: (aiGeneratedPlan: Term[], selectedProgramIds: number[], accessId?: string, planName?: string) => void;
  prompt: string;
  initialPlanName?: string;
  isGraduateStudent?: boolean;
  onShowSnackbar?: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
  careerGoals?: string | null;
  studentInterests?: string | null;
}

export default function CreateGradPlanDialog({
  open,
  onClose,
  selectedProgramIds,
  genEdProgramIds,
  genEdStrategy: initialGenEdStrategy,
  planMode: initialPlanMode,
  universityId,
  userId,
  onPlanCreated,
  prompt,
  initialPlanName,
  isGraduateStudent = false,
  onShowSnackbar,
  careerGoals,
  studentInterests
}: Readonly<CreateGradPlanDialogProps>) {

  // State: program data (loaded dynamically)
  const [programsData, setProgramsData] = useState<ProgramRow[]>([]);
  const [genEdData, setGenEdData] = useState<ProgramRow[]>([]);
  const [loadingProgramData, setLoadingProgramData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // State: Use passed-in plan mode instead of fetching institution mode
  const effectiveMode: 'AUTO' | 'MANUAL' = initialPlanMode;

  // State: selected courses per requirement (array because we may need multiple dropdowns)
  const [selectedCourses, setSelectedCourses] = useState<Record<string, string[]>>({});
  // State: selected courses for program requirements
  const [selectedProgramCourses, setSelectedProgramCourses] = useState<Record<string, string[]>>({});
  // State: Use selected programs from props
  const selectedPrograms = useMemo(() => new Set(selectedProgramIds), [selectedProgramIds]);
  // State: plan creation
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planCreationError, setPlanCreationError] = useState<string | null>(null);
  const [planName, setPlanName] = useState(initialPlanName ?? '');
  // Snackbar for success/error feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>(
    { open: false, message: '', severity: 'info' }
  );
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') =>
    setSnackbar({ open: true, message, severity });
  const handleCloseSnackbar = () => setSnackbar(s => ({ ...s, open: false }));
  // State: dynamic loading message
  const [loadingMessage, setLoadingMessage] = useState({
    title: 'Creating Your Graduation Plan',
    subtitle: 'AI is organizing your courses into semesters...'
  });

  useEffect(() => {
    if (open) {
      setPlanName(initialPlanName ?? '');
    }
  }, [open, initialPlanName]);

// --- Fetch program data dynamically when dialog opens ---
useEffect(() => {
  async function fetchProgramData() {
    if (!open || (selectedProgramIds.length === 0 && genEdProgramIds.length === 0)) return;

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
}, [open, selectedProgramIds, genEdProgramIds, universityId, isGraduateStudent]);

// --- User-added elective courses & GenEd strategy ---
interface UserElectiveCourse { id: string; code: string; title: string; credits: number; }
const [userElectives, setUserElectives] = useState<UserElectiveCourse[]>([]);
const [availableCourses, setAvailableCourses] = useState<CourseOffering[]>([]);
const [coursesLoading, setCoursesLoading] = useState(false);
const [electiveError, setElectiveError] = useState<string | null>(null);

// GenEd sequencing strategy: use passed-in value
const genEdStrategy = initialGenEdStrategy;

// Fetch available courses when dialog opens
useEffect(() => {
  if (open) {
    setCoursesLoading(true);
    searchCourseOfferings(universityId)
      .then(courses => {
        setAvailableCourses(courses);
      })
      .catch(error => {
        console.error('Error fetching courses:', error);
        setElectiveError('Failed to load courses. Please try again.');
      })
      .finally(() => {
        setCoursesLoading(false);
      });
  }
}, [open, universityId]);

const handleAddElective = (selectedCourse: CourseOffering | null) => {
  if (!selectedCourse) return;

  const code = selectedCourse.course_code.trim().toUpperCase();
  const title = selectedCourse.title.trim();
  const credits = selectedCourse.credits_decimal || 3.0; // Default to 3.0 if null

  if (userElectives.some(e => e.code === code)) {
    setElectiveError('This course has already been added.');
    return;
  }

  const newCourse: UserElectiveCourse = {
    id: `${selectedCourse.offering_id}`,
    code,
    title,
    credits
  };
  setUserElectives(prev => [...prev, newCourse]);
  setElectiveError(null);
};

const handleRemoveElective = (id: string) => {
  setUserElectives(prev => prev.filter(c => c.id !== id));
};

  // memoized parsed data using extracted helpers
  const requirements = useMemo(() => parseRequirementsFromGenEd(genEdData), [genEdData]);
  const programRequirements = useMemo(() => parseProgramRequirements(programsData, selectedPrograms), [programsData, selectedPrograms]);

  // course options per requirement (memoized map)
  const requirementCoursesMap = useMemo<Record<string, CourseBlock[]>>(() => {
    const map: Record<string, CourseBlock[]> = {};
    for (const req of requirements) {
      map[req.subtitle] = collectCourses(req.blocks);
    }
    return map;
  }, [requirements]);

  // ensure state array length matches dropdown count for each requirement
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

  // ensure state array length for program requirements
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

  // Initialize slots for all requirements when they change
  useEffect(() => {
    requirements.forEach(req => {
      const dropdownCount = getDropdownCount(req);
      ensureSlots(req.subtitle, dropdownCount);
    });

    // Initialize slots for program requirements (for each selected program)
    Array.from(selectedPrograms).forEach(programId => {
      programRequirements.forEach(req => {
        if (req.courses) {
          const dropdownCount = getProgramDropdownCount(req);
          const requirementKey = getRequirementKey(programId, req);
          
          // Just ensure slots exist (auto-population handled by separate effect)
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
  }, [requirements, ensureSlots, programRequirements, ensureProgramSlots, selectedPrograms]);

  // Auto-population effect for general requirements (runs once when dialog opens)
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      // Auto-populate general requirements
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
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [open, requirements, requirementCoursesMap]);

  // Auto-population effect for program requirements (runs when programs are selected/changed)
  useEffect(() => {
    if (!open || selectedPrograms.size === 0) return;

    const timer = setTimeout(() => {
      Array.from(selectedPrograms).forEach(programId => {
        programRequirements.forEach(req => {
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
    }, 300); // 300ms delay for program selection changes

    return () => clearTimeout(timer);
  }, [open, selectedPrograms, programRequirements]);

  // Clear error when selections change
  useEffect(() => {
    if (planCreationError) {
      setPlanCreationError(null);
    }
  }, [selectedCourses, selectedProgramCourses, selectedPrograms, planCreationError]);

  // Clean up program course selections when programs are deselected
  useEffect(() => {
    setSelectedProgramCourses(prev => {
      const filtered: Record<string, string[]> = {};
      Object.keys(prev).forEach(key => {
        const programId = key.split('-')[0]; // Extract program ID from key
        if (selectedPrograms.has(programId)) {
          filtered[key] = prev[key];
        }
        // Otherwise, we skip this key, effectively removing it
      });
      return filtered;
    });
  }, [selectedPrograms]);

  // handle a specific slot selection for a requirement
  const handleCourseSelection = (subtitle: string, slotIndex: number, courseCode: string) => {
    setSelectedCourses(prev => {
      const existing = prev[subtitle] ?? [];
      const next = [...existing];
      next[slotIndex] = courseCode;
      return { ...prev, [subtitle]: next };
    });
  };

  // handle program course selection
  const handleProgramCourseSelection = (requirementKey: string, slotIndex: number, courseCode: string) => {
    setSelectedProgramCourses(prev => {
      const existing = prev[requirementKey] ?? [];
      const next = [...existing];
      next[slotIndex] = courseCode;
      return { ...prev, [requirementKey]: next };
    });
  };

  // Check if all required dropdowns are filled (only when effectiveMode is MANUAL)
  const areAllDropdownsFilled = useMemo(() => {
    // Require at least one program to be selected
    if (selectedPrograms.size === 0) return false;

    // In AUTO mode, don't require dropdowns to be filled
    if (effectiveMode === 'AUTO') return true;

    // In MANUAL mode, check all dropdowns
    // Check GenEd requirements
    const genEdFilled = requirements.every(req => {
      if (!req.requirement?.rule) return true; // Skip if no rule

      const dropdownCount = getDropdownCount(req);
      if (dropdownCount === 0) return true; // No dropdowns needed

      const selected = selectedCourses[req.subtitle] || [];
      return selected.length >= dropdownCount && selected.every(course => course && course.trim() !== '');
    });

    // Check Program requirements for each selected program
    const programsFilled = Array.from(selectedPrograms).every(programId => {
      return programRequirements.every(req => {
        // Check main requirement courses
        if (req.courses && req.courses.length > 0) {
          const dropdownCount = getProgramDropdownCount(req);
          const selected = selectedProgramCourses[`${programId}-req-${req.requirementId}`] || [];
          const filled = selected.length >= dropdownCount && selected.every(course => course && course.trim() !== '');
          if (!filled) return false;
        }

        // Check sub-requirements
        if (req.subRequirements && req.subRequirements.length > 0) {
          return req.subRequirements.every(subReq => {
            const dropdownCount = getProgramDropdownCount(subReq);
            const selected = selectedProgramCourses[getRequirementKey(programId, subReq, true)] || [];
            return selected.length >= dropdownCount && selected.every(course => course && course.trim() !== '');
          });
        }

        return true;
      });
    });

    return genEdFilled && programsFilled;
  }, [selectedCourses, selectedProgramCourses, selectedPrograms, requirements, programRequirements, effectiveMode]);

  // Generate selected classes JSON
  const generateSelectedClassesJson = useMemo<SelectedClassesPayload | null>(() => {
    if (!areAllDropdownsFilled) return null;

    // Helper function to get course details
    const getCourseDetails = (courseCode: string, courseList: (CourseBlock | Course)[]) => {
      const course = courseList.find(c => c.code === courseCode);
      if (!course) return { code: courseCode, title: 'Unknown', credits: 'Unknown' };
      
      let creditsValue: string | number = 'Unknown';
      if (course.credits) {
        if (typeof course.credits === 'object') {
          if ('fixed' in course.credits) {
            creditsValue = course.credits.fixed;
          } else if ('variable' in course.credits && course.credits.variable) {
            const min = course.credits.min || 0;
            const max = course.credits.max || 0;
            creditsValue = max > min ? `${min}-${max}` : min.toString();
          }
        } else {
          creditsValue = course.credits;
        }
      }
      
      return {
        code: course.code,
        title: course.title,
        credits: creditsValue,
        ...(course.prerequisite && { prerequisite: course.prerequisite })
      };
    };

    const selectedClasses: SelectedClassesPayload = {
      timestamp: new Date().toISOString(),
      selectedPrograms: Array.from(selectedPrograms),
      genEdPrograms: genEdProgramIds, // Include GenEd program IDs
      assumptions: {
        genEdStrategy: genEdStrategy === 'early'
          ? 'Student prefers to complete the majority of general education requirements in the earliest possible terms to free later terms for major-focused courses.'
          : 'Student prefers to distribute general education requirements evenly across terms for a balanced workload.'
      },
      selectionMode: effectiveMode,
      programs: {} as SelectedClassesPayload['programs'],
      generalEducation: {} as SelectedClassesPayload['generalEducation'],
      userAddedElectives: [] as SelectedClassesPayload['userAddedElectives']
    };

    // Add GenEd courses with details
    requirements.forEach(req => {
      const selected = selectedCourses[req.subtitle] || [];
      const filteredSelected = selected.filter(course => course && course.trim() !== '');
      if (filteredSelected.length > 0) {
        const courseList = requirementCoursesMap[req.subtitle] || [];
        selectedClasses.generalEducation[req.subtitle] = filteredSelected.map(courseCode => 
          getCourseDetails(courseCode, courseList)
        );
      }
    });

    // Add Program courses with details
    Array.from(selectedPrograms).forEach(programId => {
      const program = programsData.find(p => p.id === programId);
      if (!program) return;

      selectedClasses.programs[programId] = {
        programId: program.id,
        programName: program.name,
        programType: program.program_type || 'unknown',
        ...(program.version && { version: String(program.version) }),
        requirements: {}
      };

      programRequirements.forEach(req => {
        
        // Main requirement courses
        if (req.courses && req.courses.length > 0) {
          const selected = selectedProgramCourses[`${programId}-req-${req.requirementId}`] || [];
          const filteredSelected = selected.filter(course => course && course.trim() !== '');
          
          if (filteredSelected.length > 0) {
            selectedClasses.programs[programId].requirements[`requirement-${req.requirementId}`] = {
              description: req.description,
              courses: filteredSelected.map(courseCode => 
                getCourseDetails(courseCode, req.courses || [])
              )
            };
          }
        }

        // Sub-requirements
        if (req.subRequirements && req.subRequirements.length > 0) {
          req.subRequirements.forEach(subReq => {
            const selected = selectedProgramCourses[`${programId}-subreq-${subReq.requirementId}`] || [];
            const filteredSelected = selected.filter(course => course && course.trim() !== '');
            
            if (filteredSelected.length > 0) {
              selectedClasses.programs[programId].requirements[`subrequirement-${subReq.requirementId}`] = {
                description: subReq.description,
                courses: filteredSelected.map(courseCode => 
                  getCourseDetails(courseCode, subReq.courses)
                )
              };
            }
          });
        }
      });
    });
    
    // Append user-added electives (treated as fulfilling generic elective requirements)
    if (userElectives.length > 0) {
      selectedClasses.userAddedElectives = userElectives.map(e => ({ code: e.code, title: e.title, credits: e.credits }));
      // Also expose inside generalEducation for backward compatibility under a stable key
      selectedClasses.generalEducation['User Added Electives'] = userElectives.map(e => ({ code: e.code, title: e.title, credits: e.credits }));
    }

    return selectedClasses;
  }, [areAllDropdownsFilled, selectedPrograms, selectedCourses, selectedProgramCourses, requirements, programRequirements, programsData, requirementCoursesMap, genEdProgramIds, genEdStrategy, userElectives, effectiveMode]);

  // Handle plan creation
  const handleCreatePlan = async () => {
    if (!generateSelectedClassesJson) {
      setPlanCreationError('Please select all required courses before creating a plan.');
      showSnackbar('Please complete all required selections first.', 'warning');
      return;
    }

    const nameValidation = validatePlanName(planName, { allowEmpty: true });
    if (!nameValidation.isValid) {
      showSnackbar(nameValidation.error, 'error');
      return;
    }
    const sanitizedPlanName = nameValidation.sanitizedValue;
    setPlanName(sanitizedPlanName);

    // Step 1: Calculate total target credits from all selected programs
    // For graduate students, only use program data (no GenEd)
    const allSelectedProgramData: ProgramRow[] = isGraduateStudent ? programsData : [...programsData, ...genEdData];
    const totalTargetCredits = allSelectedProgramData.reduce((sum, prog) => {
      const credits = (prog.target_total_credits as number | null | undefined) ?? 0;
      return sum + credits;
    }, 0);

    // Default credits: 120 for undergrad, 30-36 for graduate (using 30 as default)
    const defaultCredits = isGraduateStudent ? 30 : 120;
    const effectiveTargetCredits = totalTargetCredits > 0 ? totalTargetCredits : defaultCredits;

    console.log('📊 Credit calculation:', {
      isGraduateStudent,
      genEdPrograms: isGraduateStudent ? [] : genEdData.map(p => ({ name: p.name, credits: (p.target_total_credits as number | null | undefined) })),
      selectedPrograms: programsData.map(p => ({ name: p.name, credits: (p.target_total_credits as number | null | undefined) })),
      totalTargetCredits,
      effectiveTargetCredits
    });

    // Step 2: Prepare the course data and prompt for AI organization
    // For undergrad: augment prompt with GenEd strategy
    // For graduate: skip GenEd strategy since there are no GenEd requirements
    const strategyText = !isGraduateStudent && genEdStrategy === 'early'
      ? 'Prioritize scheduling most general education (GenEd) requirements in the earliest terms, front-loading them while keeping total credits per term reasonable.'
      : !isGraduateStudent
      ? 'Balance general education (GenEd) requirements across the full academic plan, avoiding heavy clustering early unless required by sequencing.'
      : '';

    // Replace any mentions of "120 credits" in the prompt with the calculated target
    const promptWithCredits = prompt.replace(/120\s*credits?/gi, `${effectiveTargetCredits} credits`);

    // Prepare prompt augmentation with recommended courses info
    let promptAugmentation: string;
    if (isGraduateStudent) {
      promptAugmentation = promptWithCredits + '\n\nStudent Type: Graduate (no general education requirements)\n\nTarget Total Credits: ' + effectiveTargetCredits;
    } else {
      promptAugmentation = promptWithCredits + '\n\nGenEd Sequencing Preference:\n' + strategyText + '\n\nTarget Total Credits: ' + effectiveTargetCredits;
    }


    const plannerPayload = generateSelectedClassesJson;
    if (!plannerPayload || typeof plannerPayload !== 'object' || Array.isArray(plannerPayload)) {
      setPlanCreationError('Course selection data is invalid. Please review your selections and try again.');
      showSnackbar('Course selection data is invalid. Please review your selections and try again.', 'error');
      return;
    }

    // Fetch user courses if userId is provided
    let takenCourses: Array<{
      code: string;
      title: string;
      credits: number;
      term: string;
      grade: string;
      status: string;
      source: string;
    }> = [];

    if (userId) {
      try {
        const userCoursesResult = await fetchUserCoursesAction(userId);
        if (userCoursesResult?.success && userCoursesResult.courses) {
          takenCourses = userCoursesResult.courses.map(course => ({
            code: course.code,
            title: course.title,
            credits: course.credits,
            term: course.term,
            grade: course.grade,
            status: course.grade === 'In Progress' ? 'In-Progress' : 'Completed',
            source: course.origin === 'manual' ? 'Manual' : 'Transcript',
          }));
        }
      } catch (error) {
        console.error('Error fetching user courses:', error);
        // Continue with empty takenCourses array
      }
    }

    // Generate recommended elective courses based on career goals and interests
    let recommendedElectives: CourseRecommendation[] = [];
    let recommendationInstructions = '';

    if (careerGoals || studentInterests) {
      try {
        // Get available courses to recommend from
        const availableCourses = await searchCourseOfferings(universityId);

        if (availableCourses && availableCourses.length > 0) {
          // Get major/minor selections from payload (if available)
          const selectedMajorMinors: string[] = [];
          if (plannerPayload.selectedPrograms && Array.isArray(plannerPayload.selectedPrograms)) {
            selectedMajorMinors.push(...plannerPayload.selectedPrograms);
          }

          // Generate recommendations based on career goals and interests
          const recommendations = recommendCourses(
            availableCourses.map(course => ({
              id: String(course.offering_id),
              code: course.course_code,
              title: course.title,
              credits: course.credits_decimal || 0,
              description: course.description || ''
            })),
            {
              careerGoals: careerGoals || null,
              studentInterests: studentInterests || null,
              selectedMajorMinors: selectedMajorMinors.length > 0 ? selectedMajorMinors : []
            }
          );

          // Take top recommended courses (up to 20) for the AI to use
          recommendedElectives = recommendations.slice(0, 20);

          // Create instruction text for the prompt
          if (recommendedElectives.length > 0) {
            const courseList = recommendedElectives
              .slice(0, 10) // Show top 10 in prompt
              .map(r => `${r.courseCode}: ${r.courseTitle}`)
              .join(', ');
            recommendationInstructions = `\n\nRecommended Elective Courses (based on student's career goals and interests): ${courseList}\n\nWhen filling remaining credit requirements with elective courses, prioritize these recommended courses as they align with the student's goals and interests.`;
          }

          console.log('📚 Generated recommended electives:', {
            count: recommendedElectives.length,
            topRecommendations: recommendedElectives.slice(0, 5).map(r => ({
              code: r.courseCode,
              title: r.courseTitle,
              score: r.score
            }))
          });
        }
      } catch (error) {
        console.error('Error generating course recommendations:', error);
        // Continue without recommendations if there's an error
      }
    }

    // Add takenCourses and recommended electives to the payload
    const enrichedPayload = {
      ...plannerPayload,
      takenCourses,
      recommendedElectives: recommendedElectives && recommendedElectives.length > 0
        ? recommendedElectives.map(rec => ({
            code: rec.courseCode,
            title: rec.courseTitle,
            score: rec.score,
            matchReasons: rec.matchReasons || []
          }))
        : []
    };

    // Add recommendation instructions to the prompt
    const finalPrompt = promptAugmentation + recommendationInstructions;

    const promptPayload: OrganizePromptInput = { prompt: finalPrompt };

    // Log payload details before sending
    console.log('📤 Sending enriched payload to API:', {
      hasPrograms: 'programs' in enrichedPayload,
      hasGeneralEducation: 'generalEducation' in enrichedPayload,
      hasTakenCourses: 'takenCourses' in enrichedPayload,
      hasRecommendedElectives: 'recommendedElectives' in enrichedPayload,
      recommendedElectivesCount: enrichedPayload.recommendedElectives?.length || 0,
      takenCoursesCount: enrichedPayload.takenCourses?.length || 0
    });

    // Show snackbar and close dialog immediately
    if (onShowSnackbar) {
      onShowSnackbar('🎓 Your graduation plan is being generated! You\'ll be notified when it\'s ready.', 'info');
    }
    onClose();

    // Call API route to process in background (fire and forget)
    const requestPayload = {
      coursesData: enrichedPayload,
      promptInput: promptPayload,
      planName: sanitizedPlanName
    };
    console.log('📡 Full request payload:', JSON.stringify(requestPayload, null, 2).substring(0, 500));

    fetch('/api/grad-plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    }).then(response => response.json())
      .then(result => console.log('✅ Grad plan generation started:', result))
      .catch(error => console.error('❌ Failed to start grad plan generation:', error));
  };

  // Handle dialog close - prevent closing during plan creation
  const handleDialogClose = (event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (isCreatingPlan && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      // Prevent closing during AI processing
      return;
    }
    onClose();
  };

  // Handle manual close button
  const handleManualClose = () => {
    if (isCreatingPlan) {
      // Show a warning or just prevent closing
      return;
    }
    onClose();
  };

  // Add beforeunload event listener to warn about page refresh during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCreatingPlan) {
        e.preventDefault();
        e.returnValue = 'Your graduation plan is being created. Are you sure you want to leave?';
        return 'Your graduation plan is being created. Are you sure you want to leave?';
      }
    };

    if (isCreatingPlan) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isCreatingPlan]);

  // Dynamic loading message cycling effect
  useEffect(() => {
    if (!isCreatingPlan) {
      // Reset to initial message when not creating
      setLoadingMessage({
        title: 'Creating Your Graduation Plan',
        subtitle: 'AI is organizing your courses into semesters...'
      });
      return;
    }

    const messages = [
      {
        title: 'Creating Your Graduation Plan',
        subtitle: 'AI is organizing your courses into semesters...'
      },
      {
        title: 'Analyzing Course Requirements',
        subtitle: 'Verifying prerequisites and sequencing...'
      },
      {
        title: 'Optimizing Course Load',
        subtitle: 'Balancing credits across semesters...'
      },
      {
        title: 'Checking Prerequisites',
        subtitle: 'Ensuring courses are in the right order...'
      },
      {
        title: 'Distributing Workload',
        subtitle: 'Creating a balanced schedule across terms...'
      },
      {
        title: 'Validating Degree Requirements',
        subtitle: 'Making sure all requirements are fulfilled...'
      },
      {
        title: 'Scheduling Core Courses',
        subtitle: 'Placing major and minor requirements...'
      },
      {
        title: 'Adding Electives',
        subtitle: 'Fitting in your elective choices...'
      },
      {
        title: 'Checking Course Availability',
        subtitle: 'Confirming typical offering patterns...'
      },
      {
        title: 'Finalizing Timeline',
        subtitle: 'Building your path to graduation...'
      },
      {
        title: 'Almost Done',
        subtitle: 'Wrapping up your personalized plan...'
      }
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[currentIndex]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [isCreatingPlan]);

  return (
    <Dialog 
      open={open} 
      onClose={handleDialogClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={isCreatingPlan}
    >
      <DialogTitle className="font-header-bold" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Create New Grad Plan
        <IconButton 
          onClick={handleManualClose} 
          sx={{ 
            color: 'text.secondary',
            opacity: isCreatingPlan ? 0.5 : 1,
            cursor: isCreatingPlan ? 'not-allowed' : 'pointer'
          }}
          disabled={isCreatingPlan}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>

        {/* Loading skeleton during program data fetch */}
        {loadingProgramData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <StuLoader variant="card" text="Loading program requirements..." />
          </Box>
        )}

        {/* Error state */}
        {dataLoadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {dataLoadError}
          </Alert>
        )}

        {/* Show content only when data is loaded */}
        {!loadingProgramData && !dataLoadError && (
          <>
        {/* Informational note for AUTO mode */}
        {effectiveMode === 'AUTO' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Courses will be auto-selected by STU based on your selected programs and preferences. You can edit and swap courses after plan creation.
          </Alert>
        )}
        
        {/* Loading overlay during AI processing */}
        {isCreatingPlan && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            p: 4
          }}>
            <StuLoader variant="page" text={`${loadingMessage.title} — ${loadingMessage.subtitle}`} />
            <Typography variant="body2" className="font-body" sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
              This may take a moment. Please don&apos;t close this window.
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Available Programs */}
          <Box>
            {programsData?.length ? (
              <Box>
                {/* Group programs by type */}
                {(() => {
                  const groupedPrograms = programsData.reduce((acc, program) => {
                    const type = program.program_type || 'Other';
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(program);
                    return acc;
                  }, {} as Record<string, typeof programsData>);

                  const typeOrder = ['major', 'minor', 'emphasis'];
                  const orderedTypes = [
                    ...typeOrder.filter(type => groupedPrograms[type]),
                    ...Object.keys(groupedPrograms).filter(type => !typeOrder.includes(type.toLowerCase()))
                  ];

                  return orderedTypes.map((programType) => (
                    <Box key={programType} sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle1"
                        className="font-header-bold"
                        sx={{
                          mb: 1,
                          textTransform: 'capitalize',
                          color: 'var(--primary)'
                        }}
                      >
                        {programType}s ({groupedPrograms[programType].length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {groupedPrograms[programType].map((program) => (
                          <Chip
                            key={program.id}
                            label={`${program.name}${program.version ? ` (${program.version})` : ''}`}
                            sx={{
                              backgroundColor: selectedPrograms.has(program.id) ? 'var(--primary)' : 'transparent',
                              color: selectedPrograms.has(program.id) ? 'white' : 'text.primary',
                              border: selectedPrograms.has(program.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                            }}
                            className="font-body"
                          />
                        ))}
                      </Box>
                    </Box>
                  ));
                })()}
              </Box>
            ) : (
              <Typography className="font-body">No programs available</Typography>
            )}
          </Box>

          {/* General Education Requirements (Undergraduate Only) */}
          {!isGraduateStudent && effectiveMode === 'MANUAL' && (
            <Box>
              <Typography variant="h6" className="font-header-bold" sx={{ mb: 2 }}>General Education Requirements:</Typography>

              {requirements && requirements.length ? (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {requirements.map((req, idx) => {
                    const dropdownCount = getDropdownCount(req);
                    const courses = requirementCoursesMap[req.subtitle] || [];
                    const isAutoSelected = courses.length > 0 && courses.length === dropdownCount;

                    return (
                      <Box key={`${req.subtitle}-${idx}`} sx={{ py: 2 }}>
                        <Typography variant="subtitle1" className="font-header" sx={{ mb: 1 }}>
                          {req.subtitle}
                          {isAutoSelected && (
                            <Chip
                              label="Auto-selected"
                              size="small"
                              className="font-body"
                              sx={{
                                ml: 1,
                                backgroundColor: 'var(--primary)',
                                color: 'white'
                              }}
                            />
                          )}
                        </Typography>
                        {isAutoSelected && (
                          <Typography variant="body2" className="font-body" sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                            All available courses for this requirement have been automatically selected ({courses.length} course{courses.length === 1 ? '' : 's'}).
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {Array.from({ length: dropdownCount }).map((_, slot) => (
                            <FormControl key={`${req.subtitle}-slot-${slot}`} fullWidth>
                              <InputLabel className="font-body">
                                {dropdownCount > 1
                                  ? `${req.subtitle} — Select course #${slot + 1}`
                                  : req.subtitle}
                              </InputLabel>
                              <Select
                                value={(selectedCourses[req.subtitle]?.[slot] ?? '')}
                                label={
                                  dropdownCount > 1
                                    ? `${req.subtitle} — Select course #${slot + 1}`
                                    : req.subtitle
                                }
                                disabled={isAutoSelected}
                                onChange={(e) => handleCourseSelection(req.subtitle, slot, e.target.value)}
                              >
                                <MenuItem value="" className="font-body"><em>Select a course</em></MenuItem>
                                {courses && Array.isArray(courses) ? courses
                                  .filter(c => c.status !== 'retired' && c.credits != null)
                                  .map((c) => (
                                  <MenuItem key={`${req.subtitle}-${idx}-slot-${slot}-${c.code}`} value={c.code} className="font-body">
                                    {c.code} — {c.title} ({creditText(c.credits)})
                                  </MenuItem>
                                )) : null}
                              </Select>
                            </FormControl>
                          ))}
                        </Box>

                        {/* Divider between requirement sections */}
                        {idx < requirements.length - 1 && <Divider sx={{ mt: 2 }} />}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography className="font-body">No general education requirements found</Typography>
              )}
            </Box>
          )}

          {/* Selected Program Requirements */}
          {selectedPrograms && selectedPrograms.size > 0 && effectiveMode === 'MANUAL' && (
            <>
              {Array.from(selectedPrograms).map((programId) => {
                const program = programsData?.find(p => p.id === programId);
                if (!program) return null;

                return (
                  <Box key={programId}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                      {program.name} Requirements:
                    </Typography>

                    {programRequirements && programRequirements.length ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {getFlattenedRequirements(programRequirements, programId, getRequirementKey).map((item, idx) => {
                          const { requirement, isSubRequirement, key } = item;
                          const dropdownCount = getProgramDropdownCount(requirement);
                          const validCourses = getValidCourses(requirement);
                          const isAutoSelected = shouldAutoSelect(requirement, isSubRequirement);

                          return (
                            <Box key={`${key}-${idx}`} sx={{ py: 2, ...(isSubRequirement && { ml: 2 }) }}>
                              <Typography 
                                variant={isSubRequirement ? "body1" : "subtitle1"} 
                                sx={{ 
                                  mb: 1, 
                                  fontWeight: isSubRequirement ? 'normal' : 'bold',
                                  fontStyle: isSubRequirement ? 'italic' : 'normal'
                                }}
                              >
                                {isSubRequirement ? 'Sub-requirement' : 'Requirement'} {requirement.requirementId}: {requirement.description}
                                {isAutoSelected && (
                                  <Chip 
                                    label="Auto-selected" 
                                    size="small" 
                                    color="success" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Typography>
                              
                              {isAutoSelected && (
                                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                                  Courses for this {isSubRequirement ? 'sub-requirement' : 'requirement'} have been automatically selected ({Math.min(dropdownCount, validCourses.length)} of {validCourses.length} course{validCourses.length === 1 ? '' : 's'}).
                                </Typography>
                              )}

                              {/* Manual selection message for sub-requirements */}
                              {isSubRequirement && !isAutoSelected && validCourses.length > 0 && (
                                <Typography variant="body2" sx={{ mb: 2, color: 'info.main', fontStyle: 'italic' }}>
                                  Please manually select {dropdownCount} course{dropdownCount === 1 ? '' : 's'} from {validCourses.length} available option{validCourses.length === 1 ? '' : 's'} below.
                                </Typography>
                              )}
                              
                              {'notes' in requirement && requirement.notes && (
                                <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                                  Note: {requirement.notes}
                                </Typography>
                              )}

                              {'otherRequirement' in requirement && requirement.otherRequirement && (
                                <Typography variant="body2" sx={{ mb: 2, color: 'warning.main' }}>
                                  Additional Requirement: {requirement.otherRequirement}
                                </Typography>
                              )}

                              {'steps' in requirement && requirement.steps && Array.isArray(requirement.steps) && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" sx={{ mb: 1 }}>Steps:</Typography>
                                  <Box component="ul" sx={{ pl: 2 }}>
                                    {requirement.steps.map((step) => (
                                      <Box component="li" key={step} sx={{ mb: 0.5 }}>
                                        <Typography variant="body2">{step}</Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {/* Course selection dropdowns */}
                              {requirement.courses && requirement.courses.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="body2" sx={{ mb: 1 }}>Select courses:</Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {Array.from({ length: dropdownCount }).map((_, slot) => (
                                      <FormControl key={`${key}-slot-${slot}`} fullWidth>
                                        <InputLabel>
                                          {dropdownCount > 1
                                            ? `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId} — Course #${slot + 1}`
                                            : `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId}`}
                                        </InputLabel>
                                        <Select
                                          value={(() => {
                                            const val = selectedProgramCourses[key]?.[slot] ?? '';
                                            return val;
                                          })()}
                                          label={
                                            dropdownCount > 1
                                              ? `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId} — Course #${slot + 1}`
                                              : `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId}`
                                          }
                                          disabled={isAutoSelected}
                                          onChange={(e) => handleProgramCourseSelection(key, slot, e.target.value)}
                                        >
                                          <MenuItem value="" className="font-body"><em>Select a course</em></MenuItem>
                                          {validCourses.map((course, courseIdx) => (
                                            <MenuItem key={`${key}-slot-${slot}-${course.code}-${courseIdx}`} value={course.code}>
                                              {course.code} — {course.title} ({course.credits} credits)
                                            </MenuItem>
                                          ))}
                                        </Select>
                                      </FormControl>
                                        ))}
                                      </Box>
                                    </Box>
                                  )}

                              {/* Divider between requirements */}
                              {idx < getFlattenedRequirements(programRequirements, programId, getRequirementKey).length - 1 && <Divider sx={{ mt: 2 }} />}
                            </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography>No program requirements found for {program.name}</Typography>
                    )}
                  </Box>
                );
              })}
            </>
          )}

          {/* User Added Elective Courses Section */}
          <Box sx={{ mt: 4 }}>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">
                Additional Elective Courses
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Sparkles size={14} />}
                onClick={() => {
                  // TODO: Implement elective finder
                  console.log('Help me find good options clicked');
                }}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.25,
                  px: 1,
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'var(--hover-green)',
                    backgroundColor: 'var(--primary-15)',
                  },
                }}
              >
                Help me find good options
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If you want to include extra elective courses not covered above, add them here. These will be included in the AI planning step.
            </Typography>
            {userElectives.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {userElectives.map(course => (
                  <Chip
                    key={course.id}
                    label={`${course.code} – ${course.title} (${course.credits})`}
                    onDelete={() => handleRemoveElective(course.id)}
                    color="info"
                    variant="outlined"
                    sx={{
                      '& .MuiChip-label': { fontSize: '0.7rem' }
                    }}
                  />
                ))}
              </Box>
            )}
            <Autocomplete
              options={availableCourses}
              getOptionLabel={(option) => `${option.course_code} - ${option.title} (${option.credits_decimal || 3.0} cr)`}
              loading={coursesLoading}
              value={null}
              onChange={(_event, value) => handleAddElective(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search for a course to add..."
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {coursesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '7px',
                    },
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...restProps } = props as { key: string; [key: string]: unknown };
                return (
                  <Box component="li" key={key} {...restProps}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {option.course_code} - {option.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.credits_decimal || 3.0} credits
                        {option.department_code && ` • ${option.department_code}`}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              sx={{ mb: 2 }}
            />
            {electiveError && (
              <Alert severity="warning" onClose={() => setElectiveError(null)} sx={{ mb: 2 }}>
                {electiveError}
              </Alert>
            )}
          </Box>
        </Box>

        {/* JSON Preview Section
        {areAllDropdownsFilled && generateSelectedClassesJson && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" color="success.main">
                  ✅ All Requirements Complete - Selected Classes JSON Preview
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ 
                  bgcolor: 'background.paper', 
                  p: 2, 
                  borderRadius: 1, 
                  border: '1px solid',
                  borderColor: 'divider',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '0.875rem', 
                    fontFamily: '"Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    {JSON.stringify(generateSelectedClassesJson, null, 2)}
                  </pre>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )} */}
          </>
        )}
      </DialogContent>

      {/* Error Display */}
      {planCreationError && (
        <Box sx={{ px: 3, pb: 2 }}>
          <Alert severity="error">{planCreationError}</Alert>
        </Box>
      )}

      <DialogActions sx={{ gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isCreatingPlan}
          variant="outlined"
          className="font-body-semi"
          sx={{
            color: 'var(--action-cancel)',
            borderColor: 'var(--action-cancel)',
            '&:hover': {
              borderColor: 'var(--action-cancel-hover)',
              backgroundColor: 'var(--action-cancel)',
              color: 'white'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreatePlan}
          disabled={!areAllDropdownsFilled || isCreatingPlan}
          startIcon={isCreatingPlan ? <CircularProgress size={20} /> : undefined}
          className="font-body-semi"
          sx={{
            backgroundColor: 'var(--primary)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'var(--hover-green)'
            },
            '&:disabled': {
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)'
            }
          }}
        >
          {isCreatingPlan ? 'AI Organizing Courses...' : 'Create AI-Organized Plan'}
        </Button>
      </DialogActions>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
