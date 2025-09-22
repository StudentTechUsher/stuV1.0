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
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import type { ProgramRow } from '@/types/program';
import { createGraduationPlan, OrganizeCoursesIntoSemesters } from '@/lib/api/client-actions';

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
}

interface Course {
  code: string;
  title: string;
  credits: Credits | number | string;
  prerequisite?: string;
}

// === Types that match the normalized requirements we built earlier ===
type Credits =
  | { fixed: number }
  | { variable: true; min?: number; max?: number }
  | null;

interface CourseBlock {
  type: 'course';
  code: string;
  title: string;
  credits: Credits;
  prerequisite?: string;
  status?: 'active' | 'retired';
}

interface ContainerBlock {
  type: 'option' | 'requirement';
  label?: string;
  title?: string;
  rule?: { type: string; min_count?: number; of_count?: number; unit?: string };
  blocks?: Block[];
}

type Block = CourseBlock | ContainerBlock;

interface RichRequirement {
  subtitle: string;
  requirement?: {
    index?: number;
    rule?: { type: string; min_count?: number; of_count?: number; unit?: string };
  };
  blocks?: Block[];
}

// === Types for Program Requirements ===
interface ProgramCourse {
  code: string;
  title: string;
  credits: number;
}

interface SubRequirement {
  courses: ProgramCourse[];
  description: string;
  requirementId: string | number; // Allow both types for consistency
}

interface ProgramRequirement {
  notes?: string;
  description: string;
  requirementId: number;
  subRequirements?: SubRequirement[];
  courses?: ProgramCourse[];
  otherRequirement?: string;
  steps?: string[];
}

// === Props ===
interface CreateGradPlanDialogProps {
  open: boolean;
  onClose: () => void;
  programsData: ProgramRow[];
  genEdData: ProgramRow[];
  onPlanCreated?: (aiGeneratedPlan: Term[], selectedProgramIds: number[], planId?: string) => void;
}

export default function CreateGradPlanDialog({
  open,
  onClose,
  programsData,
  genEdData,
  onPlanCreated
}: Readonly<CreateGradPlanDialogProps>) {

  // State: selected courses per requirement (array because we may need multiple dropdowns)
  const [selectedCourses, setSelectedCourses] = useState<Record<string, string[]>>({});
  // State: selected courses for program requirements
  const [selectedProgramCourses, setSelectedProgramCourses] = useState<Record<string, string[]>>({});
  // State: selected programs
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  // State: plan creation
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planCreationError, setPlanCreationError] = useState<string | null>(null);
  // State: dynamic loading message
  const [loadingMessage, setLoadingMessage] = useState({
    title: 'Creating Your Graduation Plan',
    subtitle: 'AI is organizing your courses into semesters...'
  });

  // ---- Helpers ----

  const parseRequirementsFromGenEd = useCallback((): RichRequirement[] => {
    if (!genEdData || !Array.isArray(genEdData) || genEdData.length === 0) {
      console.log('❌ No genEdData available or not an array');
      return [];
    }
    const all: RichRequirement[] = [];

    genEdData.forEach((program, index) => {
      if (!program || !program.requirements) {
        console.log(`❌ No requirements in program ${index}`);
        return;
      }
      try {
        const req = typeof program.requirements === 'string'
          ? JSON.parse(program.requirements)
          : program.requirements;

        if (Array.isArray(req)) {
          // We only keep objects that look like our RichRequirement
          const filtered = req.filter((r: unknown): r is RichRequirement => {
            return (
              typeof r === 'object' &&
              r !== null &&
              'subtitle' in r &&
              typeof (r as { subtitle?: unknown }).subtitle === 'string'
            );
          });
          all.push(...filtered);
        }
      } catch (e) {
        console.error('Error parsing requirements for program', index, ':', e);
      }
    });

    return all;
  }, [genEdData]);

  // Parse program requirements from programsData for selected programs only
  const parseProgramRequirements = useCallback((selectedProgramIds: Set<string>): ProgramRequirement[] => {
    if (!programsData || !Array.isArray(programsData) || programsData.length === 0 || selectedProgramIds.size === 0) {
      return [];
    }
    const all: ProgramRequirement[] = [];

    // Only process programs that are actually selected
    programsData.forEach((program, index) => {
      if (!program || !selectedProgramIds.has(program.id)) {
        return; // Skip programs that aren't selected
      }
      
      if (!program.requirements) {
        console.log(`❌ No requirements in program ${index} (${program.name})`);
        return;
      }
      try {
        const req = typeof program.requirements === 'string'
          ? JSON.parse(program.requirements)
          : program.requirements;

        // Look for programRequirements array
        if (Array.isArray(req?.programRequirements)) {
          console.log(`📋 Processing ${req.programRequirements.length} requirements for program: ${program.name}`);
          req.programRequirements.forEach((progReq: unknown, reqIndex: number) => {
            console.log(`📋 Processing programRequirement ${reqIndex} for ${program.name}:`, progReq);
          });
          all.push(...req.programRequirements);
        } else {
          console.log(`❌ No programRequirements array found in requirements for ${program.name}`);
        }
      } catch (e) {
        console.error(`❌ Error parsing program requirements for ${program.name}:`, e);
      }
    });

    return all;
  }, [programsData]);

  // Get dropdown count for program requirements
  const getProgramDropdownCount = useCallback((req: ProgramRequirement | SubRequirement): number => {
    const description = req.description || '';
    
    // Handle credit-based requirements like "Complete 33 credits"
    const creditMatch = /Complete (\d+) credits?/i.exec(description);
    if (creditMatch) {
      const totalCredits = parseInt(creditMatch[1], 10);
      
      // Calculate average credits per course from available courses
      const courses = 'courses' in req ? (req.courses || []) : [];
      if (courses.length > 0) {
        const avgCredits = courses.reduce((sum, course) => sum + (course.credits || 3), 0) / courses.length;
        const calculatedCount = Math.ceil(totalCredits / avgCredits);
        console.log(`📊 Credit-based requirement: ${totalCredits} credits ÷ ${avgCredits.toFixed(1)} avg credits = ${calculatedCount} courses`);
        return calculatedCount;
      } else {
        // Fallback: assume 3 credits per course if no courses available
        const calculatedCount = Math.ceil(totalCredits / 3);
        console.log(`📊 Credit-based requirement (fallback): ${totalCredits} credits ÷ 3 credits = ${calculatedCount} courses`);
        return calculatedCount;
      }
    }
    
    // Handle course-based requirements like "Complete 2 Courses" or "Complete 1 of 3 Courses"
    const courseMatch = /Complete (\d+)(?:\s+(?:of\s+\d+\s+)?(?:courses?|classes?))?/i.exec(description);
    if (courseMatch) {
      const courseCount = parseInt(courseMatch[1], 10);
      console.log(`📚 Course-based requirement: ${courseCount} courses`);
      return courseCount;
    }
    
    // Default fallback
    console.log(`❓ Unknown requirement pattern: "${description}", defaulting to 1 course`);
    return 1;
  }, []);

  // Recursively collect course blocks from any nested structure
  const collectCourses = useCallback((blocks?: Block[]): CourseBlock[] => {
    if (!blocks) return [];
    const out: CourseBlock[] = [];

    for (const b of blocks) {
      if (!b) continue;
      if (b.type === 'course') {
        out.push(b);
      } else if ((b.type === 'option' || b.type === 'requirement') && (b).blocks) {
        out.push(...collectCourses((b).blocks));
      }
    }

    return out;
  }, []);

  // Credits formatter
  const creditText = (credits: Credits): string => {
    if (!credits) return 'credits n/a';
    if ('fixed' in credits) return `${credits.fixed} credits`;
    if ('variable' in credits) {
      const min = credits.min ?? '';
      const max = credits.max ?? '';
      if (min && max && min === max) return `${min} credits`;
      if (min && max) return `${min}-${max} credits`;
      if (min) return `${min}+ credits`;
      if (max) return `≤${max} credits`;
      return 'variable credits';
    }
    return 'credits n/a';
  };

  // Helper to handle both main requirements and sub-requirements uniformly
  const getRequirementKey = useCallback((programId: string, req: ProgramRequirement | SubRequirement, isSubReq = false) => {
    const prefix = isSubReq ? 'subreq' : 'req';
    return `${programId}-${prefix}-${req.requirementId}`;
  }, []);

  const shouldAutoSelect = useCallback((requirement: ProgramRequirement | SubRequirement, isSubRequirement = false) => {
    // Never auto-select sub-requirements - let users make those decisions
    if (isSubRequirement) return false;
    
    if (!requirement.courses || requirement.courses.length === 0) return false;
    const dropdownCount = getProgramDropdownCount(requirement);
    const validCourses = requirement.courses.filter(course => course.credits != null);
    return validCourses.length > 0 && validCourses.length === dropdownCount;
  }, [getProgramDropdownCount]);

  const getValidCourses = useCallback((requirement: ProgramRequirement | SubRequirement) => {
    return (requirement.courses || []).filter(course => course.credits != null);
  }, []);

  // Count how many dropdowns are needed for a requirement (based on rule.min_count, default 1)
  const getDropdownCount = useCallback((req: RichRequirement): number => {
    const min =
      req?.requirement?.rule?.min_count &&
      Number.isFinite(req.requirement.rule.min_count)
        ? (req.requirement.rule.min_count)
        : 1;
    return Math.max(1, min);
  }, []);

  // memoize parsed requirements for performance
  const requirements = useMemo(() => parseRequirementsFromGenEd(), [parseRequirementsFromGenEd]);
  const programRequirements = useMemo(() => parseProgramRequirements(selectedPrograms), [parseProgramRequirements, selectedPrograms]);

  // Helper to flatten all requirements (main + sub) into a single array for unified rendering
  const getFlattenedRequirements = useCallback((programId: string) => {
    const flattened: Array<{
      requirement: ProgramRequirement | SubRequirement;
      isSubRequirement: boolean;
      key: string;
      parentRequirementId?: string | number;
    }> = [];

    programRequirements.forEach(req => {
      // Add main requirement
      flattened.push({
        requirement: req,
        isSubRequirement: false,
        key: getRequirementKey(programId, req)
      });

      // Add sub-requirements
      if (req.subRequirements && Array.isArray(req.subRequirements)) {
        req.subRequirements.forEach(subReq => {
          flattened.push({
            requirement: subReq,
            isSubRequirement: true,
            key: getRequirementKey(programId, subReq, true),
            parentRequirementId: req.requirementId
          });
        });
      }
    });

    return flattened;
  }, [programRequirements, getRequirementKey]);

  // course options per requirement (memoized map)
  const requirementCoursesMap = useMemo<Record<string, CourseBlock[]>>(() => {
    const map: Record<string, CourseBlock[]> = {};
    for (const req of requirements) {
      map[req.subtitle] = collectCourses(req.blocks);
    }
    return map;
  }, [collectCourses, requirements]);

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
  }, [requirements, ensureSlots, programRequirements, ensureProgramSlots, getProgramDropdownCount, getDropdownCount, selectedPrograms, getRequirementKey]);

  // Auto-population effect for general requirements (runs once when dialog opens)
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      console.log("🚀 Auto-populating general requirements on dialog open");
      
      // Auto-populate general requirements
      requirements.forEach(req => {
        const dropdownCount = getDropdownCount(req);
        const courses = requirementCoursesMap[req.subtitle] || [];
        if (courses.length > 0 && courses.length === dropdownCount) {
          console.log(`🎯 Auto-populating general requirement: ${req.subtitle}`);
          setSelectedCourses(prev => {
            const existing = prev[req.subtitle] ?? [];
            const hasEmptySlots = existing.length < dropdownCount || existing.some(course => !course || course.trim() === '');
            
            if (hasEmptySlots) {
              const next = [...existing];
              while (next.length < dropdownCount) next.push('');
              
              courses.forEach((course, index) => {
                if (index < dropdownCount && (!next[index] || next[index].trim() === '')) {
                  next[index] = course.code;
                  console.log(`🔧 Auto-select general: ${course.code}`);
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
  }, [open, requirements, requirementCoursesMap, getDropdownCount]);

  // Auto-population effect for program requirements (runs when programs are selected/changed)
  useEffect(() => {
    if (!open || selectedPrograms.size === 0) return;

    const timer = setTimeout(() => {
      console.log(`🚀 Auto-populating program requirements for ${selectedPrograms.size} selected programs`);
      
      Array.from(selectedPrograms).forEach(programId => {
        programRequirements.forEach(req => {
          if (req.courses) {
            const dropdownCount = getProgramDropdownCount(req);
            const requirementKey = getRequirementKey(programId, req);
            const validCourses = getValidCourses(req);
            
            if (shouldAutoSelect(req, false)) {
              console.log(`🎯 Auto-populating program requirement: ${requirementKey} (${validCourses.length} courses for ${dropdownCount} dropdowns)`);
              setSelectedProgramCourses(prev => {
                const existing = prev[requirementKey] ?? [];
                const hasEmptySlots = existing.length < dropdownCount || existing.some(course => !course || course.trim() === '');
                
                if (hasEmptySlots) {
                  const next = [...existing];
                  while (next.length < dropdownCount) next.push('');
                  
                  for (let i = 0; i < dropdownCount && i < validCourses.length; i++) {
                    if (!next[i] || next[i].trim() === '') {
                      next[i] = validCourses[i].code;
                      console.log(`🔧 Auto-select program: ${validCourses[i].code} for slot ${i}`);
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
  }, [open, selectedPrograms, programRequirements, getProgramDropdownCount, shouldAutoSelect, getValidCourses, getRequirementKey]);

  // Debug effect to track data availability
  useEffect(() => {
    console.log("📊 Data status update:", {
      open,
      selectedProgramsCount: selectedPrograms.size,
      requirementsCount: requirements.length,
      programRequirementsCount: programRequirements.length,
      requirementCoursesMapKeys: Object.keys(requirementCoursesMap),
      programsDataAvailable: programsData?.length || 0,
      genEdDataAvailable: genEdData?.length || 0
    });
  }, [open, selectedPrograms.size, requirements.length, programRequirements.length, requirementCoursesMap, programsData?.length, genEdData?.length]);

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

  // handle program selection toggle
  const handleProgramToggle = (programId: string) => {
    setSelectedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  // Check if all required dropdowns are filled
  const areAllDropdownsFilled = useMemo(() => {
    // Require at least one program to be selected
    if (selectedPrograms.size === 0) return false;
    
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
  }, [selectedCourses, selectedProgramCourses, selectedPrograms, requirements, programRequirements, getDropdownCount, getProgramDropdownCount, getRequirementKey]);

  // Generate selected classes JSON
  const generateSelectedClassesJson = useMemo(() => {
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

    const selectedClasses = {
      timestamp: new Date().toISOString(),
      selectedPrograms: Array.from(selectedPrograms),
      programs: {} as Record<string, {
        programId: string;
        programName: string;
        programType: string; // major, minor, emphasis
        version?: string;
        requirements: Record<string, {
          description: string;
          courses: Array<{code: string, title: string, credits: string | number, prerequisite?: string}>;
        }>;
      }>,
      generalEducation: {} as Record<string, Array<{code: string, title: string, credits: string | number, prerequisite?: string}>>,
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
    
    return selectedClasses;
  }, [areAllDropdownsFilled, selectedPrograms, selectedCourses, selectedProgramCourses, requirements, programRequirements, programsData, requirementCoursesMap]);

  // Handle plan creation
  const handleCreatePlan = async () => {
    if (!generateSelectedClassesJson) {
      setPlanCreationError('Please select all required courses before creating a plan.');
      return;
    }

    setIsCreatingPlan(true);
    setPlanCreationError(null);

    try {
      
      // Step 1: Send the course data to AI for semester organization
      const aiResult = await OrganizeCoursesIntoSemesters(generateSelectedClassesJson);
      
      if (!aiResult.success) {
        setPlanCreationError(`AI Planning Error: ${aiResult.message}`);
        return;
      }
      
      console.log('🤖 AI organized semester plan:', aiResult.semesterPlan);
      
      // Step 2: Create the graduation plan with the AI-organized data
      const planData = {
        originalSelections: generateSelectedClassesJson,
        aiOrganizedPlan: aiResult.semesterPlan,
        timestamp: new Date().toISOString()
      };
      
      const result = await createGraduationPlan(planData);
      
      if (result.success) {
        console.log('Graduation plan created successfully:', result);
        
        // Call the onPlanCreated callback with the AI-generated plan
        if (onPlanCreated && aiResult.semesterPlan) {
          // Convert selected program IDs from strings to numbers
          const programIds = Array.from(selectedPrograms).map(id => parseInt(id, 10));
          // Type assertion since we know the AI should return Term[] structure
          onPlanCreated(aiResult.semesterPlan as Term[], programIds, result.planId);
        }
        
        // Close dialog on success
        onClose();
      } else {
        setPlanCreationError(result.message);
      }
    } catch (error) {
      console.error('Error creating graduation plan:', error);
      setPlanCreationError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreatingPlan(false);
    }
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
        title: 'Verifying Output Structure',
        subtitle: 'Ensuring plan meets all requirements...'
      },
      {
        title: 'Finalizing Details',
        subtitle: 'Adding checkpoints and graduation timeline...'
      }
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[currentIndex]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 35000); // 35 seconds

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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        
        {/* Loading overlay during AI processing */}
        {isCreatingPlan && (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            bgcolor: 'rgba(255, 255, 255, 0.8)', 
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
          }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ textAlign: 'center' }}>
              {loadingMessage.title}
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              {loadingMessage.subtitle}
              <br />
              This may take a moment. Please don&apos;t close this window.
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Available Programs */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Available Programs:</Typography>
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
                        sx={{ 
                          fontWeight: 600, 
                          mb: 1,
                          textTransform: 'capitalize',
                          color: 'success.main'
                        }}
                      >
                        {programType}s ({groupedPrograms[programType].length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {groupedPrograms[programType].map((program) => (
                          <Chip
                            key={program.id}
                            label={`${program.name}${program.version ? ` (${program.version})` : ''}`}
                            onClick={() => handleProgramToggle(program.id)}
                            color={selectedPrograms.has(program.id) ? 'success' : 'default'}
                            variant={selectedPrograms.has(program.id) ? 'filled' : 'outlined'}
                            sx={{ 
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: selectedPrograms.has(program.id) 
                                  ? 'success.dark' 
                                  : 'action.hover'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ));
                })()}
              </Box>
            ) : (
              <Typography>No programs available</Typography>
            )}
          </Box>

          {/* General Education Requirements */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>General Education Requirements:</Typography>

            {requirements && requirements.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {requirements.map((req, idx) => {
                  const dropdownCount = getDropdownCount(req);
                  const courses = requirementCoursesMap[req.subtitle] || [];
                  const isAutoSelected = courses.length > 0 && courses.length === dropdownCount;

                  return (
                    <Box key={`${req.subtitle}-${idx}`} sx={{ py: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {req.subtitle}
                        {isAutoSelected && (
                          <Chip 
                            label="Auto-selected" 
                            size="small" 
                            color="success" 
                            sx={{ ml: 1, fontSize: '0.75rem' }}
                          />
                        )}
                      </Typography>
                      {isAutoSelected && (
                        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                          All available courses for this requirement have been automatically selected ({courses.length} course{courses.length === 1 ? '' : 's'}).
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {Array.from({ length: dropdownCount }).map((_, slot) => (
                          <FormControl key={`${req.subtitle}-slot-${slot}`} fullWidth>
                            <InputLabel>
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
                              <MenuItem value=""><em>Select a course</em></MenuItem>
                              {courses && Array.isArray(courses) ? courses
                                .filter(c => c.status !== 'retired' && c.credits != null)
                                .map((c) => (
                                <MenuItem key={`${req.subtitle}-${idx}-slot-${slot}-${c.code}`} value={c.code}>
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
              <Typography>No general education requirements found</Typography>
            )}
          </Box>

          {/* Selected Program Requirements */}
          {selectedPrograms && selectedPrograms.size > 0 && (
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
                        {getFlattenedRequirements(programId).map((item, idx) => {
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
                                    sx={{ ml: 1, fontSize: '0.75rem' }}
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
                                          value={(selectedProgramCourses[key]?.[slot] ?? '')}
                                          label={
                                            dropdownCount > 1
                                              ? `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId} — Course #${slot + 1}`
                                              : `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId}`
                                          }
                                          disabled={isAutoSelected}
                                          onChange={(e) => handleProgramCourseSelection(key, slot, e.target.value)}
                                          onOpen={() => console.log(`🔍 Dropdown ${slot} value:`, selectedProgramCourses[key]?.[slot], 'Full state:', selectedProgramCourses[key])}
                                        >
                                          <MenuItem value=""><em>Select a course</em></MenuItem>
                                          {validCourses.map((course) => (
                                            <MenuItem key={`${key}-slot-${slot}-${course.code}`} value={course.code}>
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
                              {idx < getFlattenedRequirements(programId).length - 1 && <Divider sx={{ mt: 2 }} />}
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
        </Box>

        {/* JSON Preview Section
        {areAllDropdownsFilled && generateSelectedClassesJson && (
          <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          </Box>
        )} */}
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
          sx={{ 
            color: 'error.main',
            borderColor: 'error.main',
            '&:hover': {
              borderColor: 'error.dark',
              backgroundColor: 'error.main',
              color: 'white'
            }
          }}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreatePlan}
          disabled={!areAllDropdownsFilled || isCreatingPlan}
          startIcon={isCreatingPlan ? <CircularProgress size={20} /> : undefined}
          sx={{
            backgroundColor: 'success.main',
            '&:hover': {
              backgroundColor: 'success.dark'
            },
            '&:disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          {isCreatingPlan ? 'AI Organizing Courses...' : 'Create AI-Organized Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
