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
import type { ProgramRow } from '@/types/program';
import { OrganizeCoursesIntoSemesters } from '@/lib/services/client-actions';
import { type SelectionMode } from '@/lib/selectionMode';
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
}

interface Course {
  code: string;
  title: string;
  credits: Credits | number | string;
  prerequisite?: string;
}

// Types for program & requirement logic moved to helpers (imported above)

// === Props ===
interface CreateGradPlanDialogProps {
  open: boolean;
  onClose: () => void;
  programsData: ProgramRow[];
  genEdData: ProgramRow[];
  onPlanCreated?: (aiGeneratedPlan: Term[], selectedProgramIds: number[], accessId?: string) => void;
  prompt: string;
}

export default function CreateGradPlanDialog({
  open,
  onClose,
  programsData,
  genEdData,
  onPlanCreated,
  prompt
}: Readonly<CreateGradPlanDialogProps>) {

  // State: institution selection mode and effective mode
  const [institutionMode, setInstitutionMode] = useState<SelectionMode | null>(null);
  const [loadingInstitutionMode, setLoadingInstitutionMode] = useState(true);
  const [userChosenMode, setUserChosenMode] = useState<'AUTO' | 'MANUAL'>('AUTO');

  // State: selected courses per requirement (array because we may need multiple dropdowns)
  const [selectedCourses, setSelectedCourses] = useState<Record<string, string[]>>({});
  // State: selected courses for program requirements
  const [selectedProgramCourses, setSelectedProgramCourses] = useState<Record<string, string[]>>({});
  // State: selected programs
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  // State: plan creation
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planCreationError, setPlanCreationError] = useState<string | null>(null);
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

  // Fetch institution selection mode on mount
  useEffect(() => {
    async function fetchInstitutionMode() {
      try {
        const profileRes = await fetch('/api/my-profile');
        if (!profileRes.ok) throw new Error('Failed to fetch profile');
        const profileData = await profileRes.json();
        const universityId = profileData.university_id;

        const settingsRes = await fetch(`/api/institutions/${universityId}/settings`);
        if (!settingsRes.ok) throw new Error('Failed to fetch settings');
        const settingsData = await settingsRes.json();
        setInstitutionMode(settingsData.selection_mode || 'MANUAL');
      } catch (error) {
        console.error('Error fetching institution mode:', error);
        setInstitutionMode('MANUAL'); // default fallback
      } finally {
        setLoadingInstitutionMode(false);
      }
    }

    if (open) {
      fetchInstitutionMode();
    }
  }, [open]);

  // Determine effective mode
  const effectiveMode: 'AUTO' | 'MANUAL' = useMemo(() => {
    if (!institutionMode) return 'MANUAL';
    if (institutionMode === 'AUTO') return 'AUTO';
    if (institutionMode === 'MANUAL') return 'MANUAL';
    // institutionMode === 'CHOICE'
    return userChosenMode;
  }, [institutionMode, userChosenMode]);

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
  }, [open, requirements, requirementCoursesMap, getDropdownCount]);

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
      showSnackbar('Please complete all required selections first.', 'warning');
      return;
    }

    setIsCreatingPlan(true);
    setPlanCreationError(null);

    try {
      // Attach the effective mode to the payload
      const payloadWithMode = {
        ...generateSelectedClassesJson,
        selectionMode: effectiveMode
      };

      // Step 1: Send the course data to AI for semester organization
      const aiResult = await OrganizeCoursesIntoSemesters(payloadWithMode, prompt);

      if (!aiResult.success) {
        setPlanCreationError(`AI Planning Error: ${aiResult.message}`);
        showSnackbar(`AI Planning Error: ${aiResult.message}`, 'error');
        return;
      }

      if (aiResult.success && aiResult.accessId) {
        // Call the onPlanCreated callback with the AI-generated plan
        if (onPlanCreated && aiResult.semesterPlan) {
          // Convert selected program IDs from strings to numbers
          const programIds = Array.from(selectedPrograms).map(id => parseInt(id, 10));
          // Use the accessId from the AI result
          onPlanCreated(aiResult.semesterPlan as Term[], programIds, aiResult.accessId);
        }
        showSnackbar('Semester plan generated successfully!', 'success');

        // Close dialog on success
        onClose();
      } else {
        setPlanCreationError('Plan created but failed to generate access ID. Please try again.');
        showSnackbar('Plan created but missing access ID. Please retry.', 'warning');
      }
    } catch (error) {
      console.error('Error creating graduation plan:', error);
      setPlanCreationError('An unexpected error occurred. Please try again.');
      showSnackbar('Unexpected error while generating plan.', 'error');
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

        {/* Loading skeleton during institution mode fetch */}
        {loadingInstitutionMode && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Mode toggle for CHOICE institution mode */}
        {!loadingInstitutionMode && institutionMode === 'CHOICE' && (
          <Box sx={{ mb: 3, p: 3, bgcolor: 'var(--muted)', borderRadius: 2 }}>
            <Typography variant="subtitle1" className="font-header-bold" sx={{ mb: 2 }}>
              Choose Your Plan Mode
            </Typography>

            {/* Custom toggle buttons */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                onClick={() => setUserChosenMode('AUTO')}
                disabled={isCreatingPlan}
                variant={userChosenMode === 'AUTO' ? 'contained' : 'outlined'}
                sx={{
                  flex: 1,
                  py: 1.5,
                  backgroundColor: userChosenMode === 'AUTO' ? '#1A1A1A' : 'transparent',
                  color: userChosenMode === 'AUTO' ? 'white' : '#1A1A1A',
                  borderColor: '#1A1A1A',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: userChosenMode === 'AUTO' ? '#333333' : 'rgba(26, 26, 26, 0.04)',
                    borderColor: '#1A1A1A',
                  },
                  '&:disabled': {
                    backgroundColor: userChosenMode === 'AUTO' ? '#666666' : 'transparent',
                    color: userChosenMode === 'AUTO' ? 'white' : '#999999',
                    borderColor: '#999999',
                  }
                }}
                className="font-body-semi"
              >
                AUTO
              </Button>
              <Button
                onClick={() => setUserChosenMode('MANUAL')}
                disabled={isCreatingPlan}
                variant={userChosenMode === 'MANUAL' ? 'contained' : 'outlined'}
                sx={{
                  flex: 1,
                  py: 1.5,
                  backgroundColor: userChosenMode === 'MANUAL' ? '#1A1A1A' : 'transparent',
                  color: userChosenMode === 'MANUAL' ? 'white' : '#1A1A1A',
                  borderColor: '#1A1A1A',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: userChosenMode === 'MANUAL' ? '#333333' : 'rgba(26, 26, 26, 0.04)',
                    borderColor: '#1A1A1A',
                  },
                  '&:disabled': {
                    backgroundColor: userChosenMode === 'MANUAL' ? '#666666' : 'transparent',
                    color: userChosenMode === 'MANUAL' ? 'white' : '#999999',
                    borderColor: '#999999',
                  }
                }}
                className="font-body-semi"
              >
                MANUAL
              </Button>
            </Box>

            {/* Description */}
            <Typography variant="body2" className="font-body" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {userChosenMode === 'AUTO'
                ? '✨ Courses will be auto-selected by STU. You can edit after creation.'
                : '✏️ You will choose from available course options before creating the plan.'}
            </Typography>
          </Box>
        )}

        {/* Informational note for AUTO mode */}
        {!loadingInstitutionMode && effectiveMode === 'AUTO' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Courses will be auto-selected by STU based on your major/minor and preferences. You can edit and swap courses after plan creation.
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
            bgcolor: 'rgba(255, 255, 255, 0.8)', 
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
          }}>
            <CircularProgress size={60} />
            <Typography variant="h6" className="font-header-bold" sx={{ textAlign: 'center' }}>
              {loadingMessage.title}
            </Typography>
            <Typography variant="body2" className="font-body" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              {loadingMessage.subtitle}
              <br />
              This may take a moment. Please don't close this window.
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Available Programs */}
          <Box>
            <Typography variant="h6" className="font-header-bold" sx={{ mb: 2 }}>Available Programs:</Typography>
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
                            onClick={() => handleProgramToggle(program.id)}
                            sx={{
                              cursor: 'pointer',
                              backgroundColor: selectedPrograms.has(program.id) ? 'var(--primary)' : 'transparent',
                              color: selectedPrograms.has(program.id) ? 'white' : 'text.primary',
                              border: selectedPrograms.has(program.id) ? '1px solid var(--primary)' : '1px solid var(--border)',
                              '&:hover': {
                                backgroundColor: selectedPrograms.has(program.id)
                                  ? 'var(--hover-green)'
                                  : 'var(--muted)'
                              }
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

          {/* General Education Requirements */}
          {effectiveMode === 'MANUAL' && (
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
                                          value={(selectedProgramCourses[key]?.[slot] ?? '')}
                                          label={
                                            dropdownCount > 1
                                              ? `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId} — Course #${slot + 1}`
                                              : `${isSubRequirement ? 'Sub-req' : 'Requirement'} ${requirement.requirementId}`
                                          }
                                          disabled={isAutoSelected}
                                          onChange={(e) => handleProgramCourseSelection(key, slot, e.target.value)}
                                        >
                                          <MenuItem value="" className="font-body"><em>Select a course</em></MenuItem>
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
