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
import { BookOpen, Plus, X, Repeat, Zap, Scale, Sparkles } from 'lucide-react';
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
  fetchUserCoursesAction,
} from '@/lib/services/server-actions';
import { recommendCourses, type CourseRecommendationContext } from '@/lib/services/courseRecommendationService';
import CourseRecommendationPanel from './CourseRecommendationPanel';
import {
  autoMatchTranscriptCourses,
  groupMatchesByRequirement,
  type RequirementOption,
  type CourseMatch,
} from '@/lib/utils/course-requirement-matcher';

interface CourseSelectionFormProps {
  studentType: 'undergraduate' | 'graduate';
  universityId: number;
  selectedProgramIds: number[];
  genEdProgramIds?: number[];
  userId?: string;
  hasTranscript?: boolean;
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
  userId,
  hasTranscript = false,
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

  // User transcript courses state
  const [transcriptCourses, setTranscriptCourses] = useState<Array<{ code: string; title: string; credits: number }>>([]);
  const [completedCourses, setCompletedCourses] = useState<Set<string>>(new Set());

  // User electives state
  const [userElectives, setUserElectives] = useState<Array<{ id: string; code: string; title: string; credits: number }>>([]);
  const [electiveError, setElectiveError] = useState<string | null>(null);

  // Gen Ed distribution preference
  const [genEdDistribution, setGenEdDistribution] = useState<'early' | 'balanced'>('balanced');

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

  // Substitution state
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{ requirementKey: string; slot: number; isGenEd: boolean } | null>(null);
  const [substitutionCollege, setSubstitutionCollege] = useState('');
  const [substitutionDepartment, setSubstitutionDepartment] = useState('');
  const [substitutionCourse, setSubstitutionCourse] = useState<CourseOffering | null>(null);
  const [substitutionColleges, setSubstitutionColleges] = useState<string[]>([]);
  const [substitutionDepartments, setSubstitutionDepartments] = useState<string[]>([]);
  const [substitutionCourses, setSubstitutionCourses] = useState<CourseOffering[]>([]);
  const [loadingSubstitutionColleges, setLoadingSubstitutionColleges] = useState(false);
  const [loadingSubstitutionDepartments, setLoadingSubstitutionDepartments] = useState(false);
  const [loadingSubstitutionCourses, setLoadingSubstitutionCourses] = useState(false);

  // Track which sections are expanded (auto-selected sections start collapsed)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Auto-matching state
  const [autoMatches, setAutoMatches] = useState<CourseMatch[]>([]);
  const [autoMatchedKeys, setAutoMatchedKeys] = useState<Set<string>>(new Set());
  const [completedRequirementKeys, setCompletedRequirementKeys] = useState<Set<string>>(new Set());

  // Course preference dialog state
  const [preferenceDialogOpen, setPreferenceDialogOpen] = useState(false);
  const [preferenceTarget, setPreferenceTarget] = useState<{
    requirementKey: string;
    slot: number;
    isGenEd: boolean;
    courses: Array<{ code: string; title: string; credits: number | { fixed: number } | { variable: true; min?: number; max?: number } | null }>;
  } | null>(null);
  const [selectedPreference, setSelectedPreference] = useState<string | null>(null);
  const [preferenceRecommendations, setPreferenceRecommendations] = useState<string[]>([]);

  const selectedPrograms = useMemo(() => new Set(selectedProgramIds.map(id => String(id))), [selectedProgramIds]);
  const isGraduateStudent = studentType === 'graduate';

  // Build a map of course codes to the programs/requirements they fulfill
  const courseToProgramsMap = useMemo(() => {
    const map = new Map<string, Array<{ programName: string; requirementDesc: string }>>();

    // Process program requirements
    programsData.forEach(program => {
      if (!program.requirements || typeof program.requirements !== 'object') return;

      const requirements = program.requirements as Record<string, unknown>;
      Object.entries(requirements).forEach(([_key, value]) => {
        const requirement = value as ProgramRequirement;
        if (!requirement || !requirement.courses) return;

        const validCourses = getValidCourses(requirement);
        validCourses.forEach(course => {
          if (!course.code) return;

          if (!map.has(course.code)) {
            map.set(course.code, []);
          }

          map.get(course.code)!.push({
            programName: program.name || 'Unknown Program',
            requirementDesc: requirement.description || 'Requirement',
          });
        });
      });
    });

    // Process GenEd requirements
    const genEdParsedReqs = parseRequirementsFromGenEd(genEdData);
    genEdParsedReqs.forEach(richReq => {
      if (!richReq.blocks) return;

      const courses = collectCourses(richReq.blocks);
      courses.forEach(course => {
        if (!course.code) return;

        if (!map.has(course.code)) {
          map.set(course.code, []);
        }

        map.get(course.code)!.push({
          programName: 'General Education',
          requirementDesc: richReq.subtitle,
        });
      });
    });

    return map;
  }, [programsData, genEdData]);

  // Build recommendation context
  const recommendationContext = useMemo<CourseRecommendationContext>(() => ({
    careerGoals,
    studentInterests,
    selectedMajorMinors,
  }), [careerGoals, studentInterests, selectedMajorMinors]);

  // Helper function to process courses for recommendations
  const processCourses = useCallback((courses: unknown[]) => {
    return courses
      .filter((c: any) => c.status !== 'retired' && c.credits != null && c.title && c.code)
      .map((c: any) => ({
        id: c.code,
        code: c.code,
        title: c.title || 'Unknown',
        description: c.title || '', // Use title as fallback for description
      }));
  }, []);

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

  // Fetch user's transcript courses (only if user opted to use transcript)
  useEffect(() => {
    async function fetchTranscriptCourses() {
      if (!userId || !hasTranscript) return;

      try {
        const result = await fetchUserCoursesAction(userId);
        if (result.success && result.courses && result.courses.length > 0) {
          // Courses are already formatted with code field from server action
          const formattedCourses = result.courses.map(course => ({
            code: course.code, // Already formatted as "SUBJECT NUMBER"
            title: course.title,
            credits: course.credits || 0,
          }));
          console.log('[CourseSelection] Loaded transcript courses:', formattedCourses);
          setTranscriptCourses(formattedCourses);
        }
      } catch (error) {
        console.error('Error fetching transcript courses:', error);
      }
    }

    fetchTranscriptCourses();
  }, [userId, hasTranscript]);

  // Auto-match transcript courses to requirements when data is available
  useEffect(() => {
    if (!hasTranscript || transcriptCourses.length === 0 || (programsData.length === 0 && genEdData.length === 0)) {
      return;
    }

    // Build list of all requirements with their available courses
    const allRequirements: RequirementOption[] = [];

    // Process major/minor programs
    programsData.forEach(program => {
      if (!program.requirements || typeof program.requirements !== 'object') return;

      const requirements = program.requirements as Record<string, unknown>;
      Object.entries(requirements).forEach(([key, value]) => {
        const requirement = value as ProgramRequirement;
        if (!requirement || !requirement.courses) return;

        const validCourses = getValidCourses(requirement);
        if (validCourses.length === 0) return;

        allRequirements.push({
          requirementKey: `${program.id}_${key}`,
          requirementTitle: requirement.description || key,
          availableCourses: validCourses.map(c => ({
            type: 'course' as const,
            code: c.code,
            title: c.title || '',
            credits: typeof c.credits === 'object' ? c.credits : (typeof c.credits === 'number' ? { fixed: c.credits } : null),
          })),
        });
      });
    });

    // Process GenEd requirements
    const genEdParsedReqs = parseRequirementsFromGenEd(genEdData);
    genEdParsedReqs.forEach((richReq, index) => {
      if (!richReq.blocks) return;

      const courses = collectCourses(richReq.blocks);
      if (courses.length === 0) return;

      // Use the first genEd program id if available
      const genEdId = genEdData.length > 0 ? genEdData[0].id : 'default';

      allRequirements.push({
        requirementKey: `genEd_${genEdId}_${index}`,
        requirementTitle: richReq.subtitle,
        availableCourses: courses.map(c => ({
          type: 'course' as const,
          code: c.code,
          title: c.title || '',
          credits: typeof c.credits === 'object' ? c.credits : (typeof c.credits === 'number' ? { fixed: c.credits } : null),
        })),
        dropdownIndex: index,
      });
    });

    // Perform auto-matching
    const matches = autoMatchTranscriptCourses(transcriptCourses, allRequirements);
    console.log('[Auto-Match Debug] Transcript courses:', transcriptCourses);
    console.log('[Auto-Match Debug] All requirements:', allRequirements);
    console.log('[Auto-Match Debug] Matches found:', matches);
    setAutoMatches(matches);

    // Apply auto-matches to selected courses
    const groupedMatches = groupMatchesByRequirement(matches);
    console.log('[Auto-Match Debug] Grouped matches:', groupedMatches);

    // Build a map of requirement keys to their subtitles/descriptions for GenEd requirements
    const genEdKeyToSubtitle = new Map<string, string>();
    allRequirements.forEach(req => {
      if (req.requirementKey.startsWith('genEd_')) {
        genEdKeyToSubtitle.set(req.requirementKey, req.requirementTitle);
      }
    });

    setSelectedCourses(prev => {
      const updated = { ...prev };
      Object.entries(groupedMatches).forEach(([key, courses]) => {
        // For GenEd requirements, use the subtitle as the key
        if (key.startsWith('genEd_')) {
          const subtitle = genEdKeyToSubtitle.get(key);
          if (subtitle) {
            updated[subtitle] = courses;
          }
        } else {
          updated[key] = courses;
        }
      });
      return updated;
    });

    // Track which keys were auto-matched
    setAutoMatchedKeys(new Set(Object.keys(groupedMatches)));

    // Track which requirement keys have completed courses (using subtitle for GenEd)
    const completedKeys = new Set<string>();
    Object.keys(groupedMatches).forEach(key => {
      if (key.startsWith('genEd_')) {
        const subtitle = genEdKeyToSubtitle.get(key);
        if (subtitle) {
          completedKeys.add(subtitle);
        }
      } else {
        completedKeys.add(key);
      }
    });
    setCompletedRequirementKeys(completedKeys);

    // Mark auto-matched transcript courses as completed
    const matchedCourseCodes = new Set(matches.map(m => m.transcriptCourse.code));
    setCompletedCourses(matchedCourseCodes);

  }, [transcriptCourses, programsData, genEdData, hasTranscript]);

  // Load colleges on demand when user opens the dropdown
  const handleCollegeDropdownOpen = async () => {
    // Only fetch if we haven't loaded colleges yet
    if (colleges.length === 0 && !loadingColleges) {
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
  };

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

  // Memoized recommendations for general education requirements
  const genEdRecommendationsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    
    // Only compute if we have recommendation context
    if (!careerGoals && !studentInterests) {
      return map;
    }

    for (const req of requirements) {
      const courses = requirementCoursesMap[req.subtitle] || [];
      
      // Only show recommendations if there are more than 3 courses
      if (courses.length <= 3) {
        map[req.subtitle] = [];
        continue;
      }

      const courseData = processCourses(courses);
      map[req.subtitle] = recommendCourses(courseData, recommendationContext);
    }
    
    return map;
  }, [requirements, requirementCoursesMap, careerGoals, studentInterests, processCourses, recommendationContext]);

  // Memoized recommendations for program requirements
  const programRecommendationsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    
    // Only compute if we have recommendation context
    if (!careerGoals && !studentInterests) {
      return map;
    }

    Array.from(selectedPrograms).forEach(programId => {
      const programReqs = programRequirementsMap[programId] || [];
      programReqs.forEach(req => {
        if (!req.courses || req.courses.length === 0) return;
        
        const validCourses = getValidCourses(req);
        
        // Only show recommendations if there are more than 3 courses
        if (validCourses.length <= 3) {
          const requirementKey = getRequirementKey(programId, req);
          map[requirementKey] = [];
          return;
        }

        const courseData = processCourses(validCourses);
        const requirementKey = getRequirementKey(programId, req);
        map[requirementKey] = recommendCourses(courseData, recommendationContext);
      });
    });
    
    return map;
  }, [selectedPrograms, programRequirementsMap, careerGoals, studentInterests, processCourses, recommendationContext]);

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

  // Auto-select transcript courses that match requirements
  useEffect(() => {
    if (!hasTranscript || transcriptCourses.length === 0) return;

    const timer = setTimeout(() => {
      const newCompletedCourses = new Set<string>();

      // Match general requirements
      requirements.forEach(req => {
        const courses = requirementCoursesMap[req.subtitle] || [];
        const dropdownCount = getDropdownCount(req);

        setSelectedCourses(prev => {
          const existing = prev[req.subtitle] ?? [];
          const next = [...existing];
          while (next.length < dropdownCount) next.push('');

          // For each requirement option, check if user has completed it
          courses.forEach((reqCourse, index) => {
            if (index >= dropdownCount) return;

            const transcriptMatch = transcriptCourses.find(tc =>
              tc.code.toUpperCase() === reqCourse.code.toUpperCase()
            );

            if (transcriptMatch && (!next[index] || next[index].trim() === '')) {
              next[index] = reqCourse.code;
              newCompletedCourses.add(reqCourse.code);
            }
          });

          return { ...prev, [req.subtitle]: next };
        });
      });

      // Match program-specific requirements
      Array.from(selectedPrograms).forEach(programId => {
        const programReqs = programRequirementsMap[programId] || [];
        programReqs.forEach(req => {
          if (req.courses) {
            const validCourses = getValidCourses(req);
            const dropdownCount = getProgramDropdownCount(req);
            const requirementKey = getRequirementKey(programId, req);

            setSelectedProgramCourses(prev => {
              const existing = prev[requirementKey] ?? [];
              const next = [...existing];
              while (next.length < dropdownCount) next.push('');

              validCourses.forEach((reqCourse, index) => {
                if (index >= dropdownCount) return;

                const transcriptMatch = transcriptCourses.find(tc =>
                  tc.code.toUpperCase() === reqCourse.code?.toUpperCase()
                );

                if (transcriptMatch && (!next[index] || next[index].trim() === '')) {
                  next[index] = reqCourse.code || '';
                  if (reqCourse.code) {
                    newCompletedCourses.add(reqCourse.code);
                  }
                }
              });

              return { ...prev, [requirementKey]: next };
            });
          }

          // Handle sub-requirements
          if (req.subRequirements) {
            req.subRequirements.forEach(subReq => {
              const validCourses = getValidCourses(subReq);
              const dropdownCount = getProgramDropdownCount(subReq);
              const subReqKey = getRequirementKey(programId, subReq, true);

              setSelectedProgramCourses(prev => {
                const existing = prev[subReqKey] ?? [];
                const next = [...existing];
                while (next.length < dropdownCount) next.push('');

                validCourses.forEach((reqCourse, index) => {
                  if (index >= dropdownCount) return;

                  const transcriptMatch = transcriptCourses.find(tc =>
                    tc.code.toUpperCase() === reqCourse.code?.toUpperCase()
                  );

                  if (transcriptMatch && (!next[index] || next[index].trim() === '')) {
                    next[index] = reqCourse.code || '';
                    if (reqCourse.code) {
                      newCompletedCourses.add(reqCourse.code);
                    }
                  }
                });

                return { ...prev, [subReqKey]: next };
              });
            });
          }
        });
      });

      setCompletedCourses(newCompletedCourses);
    }, 600); // Run after auto-populate effects

    return () => clearTimeout(timer);
  }, [transcriptCourses, requirements, requirementCoursesMap, selectedPrograms, programRequirementsMap]);

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

  // Course preference dialog handlers
  const handleOpenPreferenceDialog = (
    requirementKey: string,
    slot: number,
    isGenEd: boolean,
    courses: Array<{ code: string; title: string; credits: number | { fixed: number } | { variable: true; min?: number; max?: number } | null }>
  ) => {
    setPreferenceTarget({ requirementKey, slot, isGenEd, courses });
    setPreferenceDialogOpen(true);
    setSelectedPreference(null);
    setPreferenceRecommendations([]);
  };

  const handleSelectPreference = async (preference: string) => {
    if (!preferenceTarget) return;

    setSelectedPreference(preference);

    // Get course recommendations based on preference
    const { courses } = preferenceTarget;
    let recommendations: string[] = [];

    // Filter/sort courses based on preference type
    switch (preference) {
      case 'lighter':
        // Recommend courses with lower course numbers (typically intro courses)
        recommendations = courses
          .sort((a, b) => {
            const aNum = parseInt(a.code.match(/\d+/)?.[0] || '999');
            const bNum = parseInt(b.code.match(/\d+/)?.[0] || '999');
            return aNum - bNum;
          })
          .slice(0, 3)
          .map(c => c.code);
        break;

      case 'challenge':
        // Recommend courses with higher course numbers (typically advanced courses)
        recommendations = courses
          .sort((a, b) => {
            const aNum = parseInt(a.code.match(/\d+/)?.[0] || '0');
            const bNum = parseInt(b.code.match(/\d+/)?.[0] || '0');
            return bNum - aNum;
          })
          .slice(0, 3)
          .map(c => c.code);
        break;

      case 'career':
        // Use existing career-based recommendations if available
        if (careerGoals && courses.length > 3) {
          const courseData = processCourses(courses);
          const recs = recommendCourses(courseData, { careerGoals, studentInterests, selectedMajorMinors });
          recommendations = recs.slice(0, 3).map(r => r.courseCode);
        } else {
          // Fallback to middle-level courses
          recommendations = courses.slice(0, 3).map(c => c.code);
        }
        break;

      case 'interests':
        // Use existing interest-based recommendations if available
        if (studentInterests && courses.length > 3) {
          const courseData = processCourses(courses);
          const recs = recommendCourses(courseData, { careerGoals, studentInterests, selectedMajorMinors });
          recommendations = recs.slice(0, 3).map(r => r.courseCode);
        } else {
          // Fallback to alphabetical
          recommendations = courses
            .sort((a, b) => a.code.localeCompare(b.code))
            .slice(0, 3)
            .map(c => c.code);
        }
        break;

      default:
        recommendations = courses.slice(0, 3).map(c => c.code);
    }

    setPreferenceRecommendations(recommendations);
  };

  const handleApplyPreferenceRecommendation = (courseCode: string) => {
    if (!preferenceTarget) return;

    const { requirementKey, slot, isGenEd } = preferenceTarget;

    if (isGenEd) {
      handleCourseSelection(requirementKey, slot, courseCode);
    } else {
      handleProgramCourseSelection(requirementKey, slot, courseCode);
    }

    // Close dialog and reset
    setPreferenceDialogOpen(false);
    setPreferenceTarget(null);
    setSelectedPreference(null);
    setPreferenceRecommendations([]);
  };

  // Substitution handlers
  const handleOpenSubstitution = (requirementKey: string, slot: number, isGenEd: boolean) => {
    setSubstitutionTarget({ requirementKey, slot, isGenEd });
    setSubstitutionDialogOpen(true);
    setSubstitutionCollege('');
    setSubstitutionDepartment('');
    setSubstitutionCourse(null);

    // Load colleges for substitution
    setLoadingSubstitutionColleges(true);
    getCollegesAction(universityId)
      .then(result => {
        if (result.success && result.colleges) {
          setSubstitutionColleges(result.colleges);
        }
      })
      .catch(error => console.error('Failed to load colleges:', error))
      .finally(() => setLoadingSubstitutionColleges(false));
  };

  const handleSubstitutionCollegeChange = async (college: string) => {
    setSubstitutionCollege(college);
    setSubstitutionDepartment('');
    setSubstitutionCourse(null);
    setSubstitutionCourses([]);

    if (!college) {
      setSubstitutionDepartments([]);
      return;
    }

    setLoadingSubstitutionDepartments(true);
    try {
      const result = await getDepartmentCodesAction(universityId, college);
      if (result.success && result.departments) {
        setSubstitutionDepartments(result.departments);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoadingSubstitutionDepartments(false);
    }
  };

  const handleSubstitutionDepartmentChange = async (department: string) => {
    setSubstitutionDepartment(department);
    setSubstitutionCourse(null);

    if (!department) {
      setSubstitutionCourses([]);
      return;
    }

    setLoadingSubstitutionCourses(true);
    try {
      const result = await getCoursesByDepartmentAction(universityId, substitutionCollege, department);
      if (result.success && result.courses) {
        setSubstitutionCourses(result.courses);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoadingSubstitutionCourses(false);
    }
  };

  const handleApplySubstitution = () => {
    if (!substitutionTarget || !substitutionCourse) return;

    const courseCode = substitutionCourse.course_code.trim().toUpperCase();
    const { requirementKey, slot, isGenEd } = substitutionTarget;

    if (isGenEd) {
      // Update gen ed selection
      setSelectedCourses(prev => {
        const updated = { ...prev };
        if (!updated[requirementKey]) {
          updated[requirementKey] = [];
        }
        updated[requirementKey][slot] = courseCode;
        return updated;
      });
    } else {
      // Update program selection
      setSelectedProgramCourses(prev => {
        const updated = { ...prev };
        if (!updated[requirementKey]) {
          updated[requirementKey] = [];
        }
        updated[requirementKey][slot] = courseCode;
        return updated;
      });
    }

    // Close dialog and reset
    setSubstitutionDialogOpen(false);
    setSubstitutionTarget(null);
    setSubstitutionCollege('');
    setSubstitutionDepartment('');
    setSubstitutionCourse(null);
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
      genEdDistribution,
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

      {/* Gen Ed Distribution Preference - Only for undergraduates */}
      {!isGraduateStudent && (
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center bg-white border border-gray-200 rounded-full shadow-sm p-1">
            <button
              type="button"
              onClick={() => setGenEdDistribution('early')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                genEdDistribution === 'early'
                  ? 'bg-[#0a1f1a] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Zap size={16} />
              Early Gen Eds
            </button>
            <button
              type="button"
              onClick={() => setGenEdDistribution('balanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                genEdDistribution === 'balanced'
                  ? 'bg-[#0a1f1a] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Scale size={16} />
              Balanced Distribution
            </button>
          </div>
        </div>
      )}

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

                // Check if this requirement has a completed course from transcript
                const hasCompletedCourse = completedRequirementKeys.has(req.subtitle);

                const sectionKey = `gen-ed-${req.subtitle}`;
                // Expand by default if has completed course, otherwise collapse if auto-selected
                const isExpanded = expandedSections[sectionKey] ?? (hasCompletedCourse || !isAutoSelected);
                const recommendations = genEdRecommendationsMap[req.subtitle] || [];

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
                      {hasCompletedCourse ? (
                        <Chip
                          label="Completed"
                          size="small"
                          className="text-xs ml-auto"
                          sx={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            height: '20px',
                          }}
                        />
                      ) : isAutoSelected ? (
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
                      ) : null}
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

                        {Array.from({ length: dropdownCount }).map((_, slot) => {
                          // Check if this specific slot has an auto-matched course
                          const selectedCourse = selectedCourses[req.subtitle]?.[slot];
                          // Use subtitle as the key since we don't have direct genEd reference here
                          const possibleKeys = autoMatches
                            .filter(m => m.matchedCourseCode === selectedCourse)
                            .map(m => m.requirementKey);
                          const isAutoMatched = selectedCourse && possibleKeys.some(key => autoMatchedKeys.has(key));
                          const matchInfo = isAutoMatched
                            ? autoMatches.find(m =>
                                possibleKeys.includes(m.requirementKey) &&
                                m.matchedCourseCode === selectedCourse
                              )
                            : null;

                          // Get all selected courses for this requirement except current slot
                          const otherSelectedCourses = (selectedCourses[req.subtitle] || [])
                            .filter((_: string, index: number) => index !== slot && _)
                            .map((code: string) => code);

                          return (
                            <Box key={`${req.subtitle}-slot-${slot}`} sx={{ mb: slot < dropdownCount - 1 ? 2 : 0 }}>
                              {isAutoMatched && matchInfo && (
                                <Chip
                                  label={`✓ From your transcript (${matchInfo.confidence} match)`}
                                  size="small"
                                  sx={{
                                    bgcolor: matchInfo.confidence === 'exact' ? '#10b981' : '#3b82f6',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.7rem',
                                    height: '22px',
                                    mb: 1.5,
                                  }}
                                />
                              )}
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                <FormControl
                                  fullWidth
                                  size="small"
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
                                {courses.length > 3 && (
                                  <MenuItem
                                    value=""
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPreferenceDialog(req.subtitle, slot, true, courses);
                                    }}
                                    sx={{
                                      backgroundColor: '#fef3c7',
                                      borderBottom: '2px solid #fbbf24',
                                      fontWeight: 'bold',
                                      color: '#92400e',
                                      '&:hover': {
                                        backgroundColor: '#fde68a',
                                      },
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Sparkles size={16} />
                                      <span>Which one is right for me?</span>
                                    </Box>
                                  </MenuItem>
                                )}
                                {courses
                                  .filter(c => c.status !== 'retired' && c.credits != null && c.code && c.title)
                                  .sort((a, b) => a.code.localeCompare(b.code))
                                  .filter(c => !otherSelectedCourses.includes(c.code))
                                  .map((c, courseIdx) => {
                                    const isCompleted = completedCourses.has(c.code);
                                    // Get other programs/requirements this course fulfills
                                    const otherFulfillments = (courseToProgramsMap.get(c.code) || [])
                                      .filter(f => f.requirementDesc !== req.subtitle); // Exclude current requirement

                                    return (
                                      <MenuItem key={`${req.subtitle}-${idx}-slot-${slot}-${c.code}-${courseIdx}`} value={c.code}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <span>{c.code} — {c.title} ({creditText(c.credits)})</span>
                                            {isCompleted && (
                                              <Chip
                                                label="Completed"
                                                size="small"
                                                sx={{
                                                  bgcolor: '#10b981',
                                                  color: 'white',
                                                  fontWeight: 'bold',
                                                  fontSize: '0.7rem',
                                                  height: '20px',
                                                  ml: 'auto',
                                                }}
                                              />
                                            )}
                                          </Box>
                                          {otherFulfillments.length > 0 && (
                                            <Box sx={{ pl: 0.5 }}>
                                              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                Also fulfills: {otherFulfillments.map(f => f.programName).join(', ')}
                                              </span>
                                            </Box>
                                          )}
                                        </Box>
                                      </MenuItem>
                                    );
                                  })}
                              </Select>
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => handleOpenSubstitution(req.subtitle, slot, true)}
                              disabled={isAutoSelected}
                              className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Find a substitution course"
                            >
                              <Repeat size={20} />
                            </button>
                          </Box>
                        </Box>
                          );
                        })}
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

                  // Check if this requirement has a completed course from transcript
                  const hasCompletedCourse = autoMatchedKeys.has(requirementKey) && completedRequirementKeys.has(requirementKey);

                  const sectionKey = `prog-req-${requirementKey}`;
                  // Expand by default if has completed course, otherwise collapse if auto-selected
                  const isExpanded = expandedSections[sectionKey] ?? (hasCompletedCourse || !isAutoSelected);
                  const progRecommendations = programRecommendationsMap[requirementKey] || [];

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
                        {hasCompletedCourse ? (
                          <Chip
                            label="Completed"
                            size="small"
                            className="text-xs ml-auto"
                            sx={{
                              backgroundColor: '#10b981',
                              color: 'white',
                              height: '20px',
                            }}
                          />
                        ) : isAutoSelected ? (
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
                        ) : null}
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

                          {Array.from({ length: dropdownCount }).map((_, slot) => {
                            // Check if this specific slot has an auto-matched course
                            const selectedCourse = selectedProgramCourses[requirementKey]?.[slot];
                            const isAutoMatched = selectedCourse && autoMatchedKeys.has(requirementKey);
                            const matchInfo = isAutoMatched
                              ? autoMatches.find(m =>
                                  m.requirementKey === requirementKey &&
                                  m.matchedCourseCode === selectedCourse
                                )
                              : null;

                            // Get all selected courses for this requirement except current slot
                            const otherSelectedCourses = (selectedProgramCourses[requirementKey] || [])
                              .filter((_: string, index: number) => index !== slot && _)
                              .map((code: string) => code);

                            return (
                              <Box key={`${requirementKey}-slot-${slot}`} sx={{ mb: slot < dropdownCount - 1 ? 2 : 0 }}>
                                {isAutoMatched && matchInfo && (
                                  <Chip
                                    label={`✓ From your transcript (${matchInfo.confidence} match)`}
                                    size="small"
                                    sx={{
                                      bgcolor: matchInfo.confidence === 'exact' ? '#10b981' : '#3b82f6',
                                      color: 'white',
                                      fontWeight: 'bold',
                                      fontSize: '0.7rem',
                                      height: '22px',
                                      mb: 1.5,
                                    }}
                                  />
                                )}
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                  <FormControl
                                    fullWidth
                                    size="small"
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
                                  {validCourses.length > 3 && (
                                    <MenuItem
                                      value=""
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenPreferenceDialog(requirementKey, slot, false, validCourses);
                                      }}
                                      sx={{
                                        backgroundColor: '#fef3c7',
                                        borderBottom: '2px solid #fbbf24',
                                        fontWeight: 'bold',
                                        color: '#92400e',
                                        '&:hover': {
                                          backgroundColor: '#fde68a',
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Sparkles size={16} />
                                        <span>Which one is right for me?</span>
                                      </Box>
                                    </MenuItem>
                                  )}
                                  {validCourses
                                    .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                                    .filter(c => !otherSelectedCourses.includes(c.code || ''))
                                    .map((c) => {
                                    const isCompleted = c.code && completedCourses.has(c.code);
                                    // Get other programs/requirements this course fulfills
                                    const otherFulfillments = c.code ? (courseToProgramsMap.get(c.code) || [])
                                      .filter(f => f.requirementDesc !== req.description) : []; // Exclude current requirement

                                    return (
                                      <MenuItem key={`${requirementKey}-slot-${slot}-${c.code}`} value={c.code}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <span>{c.code} — {c.title} ({c.credits} cr)</span>
                                            {isCompleted && (
                                              <Chip
                                                label="Completed"
                                                size="small"
                                                sx={{
                                                  bgcolor: '#10b981',
                                                  color: 'white',
                                                  fontWeight: 'bold',
                                                  fontSize: '0.7rem',
                                                  height: '20px',
                                                  ml: 'auto',
                                                }}
                                              />
                                            )}
                                          </Box>
                                          {otherFulfillments.length > 0 && (
                                            <Box sx={{ pl: 0.5 }}>
                                              <span style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic' }}>
                                                Also fulfills: {otherFulfillments.map(f => f.programName).join(', ')}
                                              </span>
                                            </Box>
                                          )}
                                        </Box>
                                      </MenuItem>
                                    );
                                  })}
                                </Select>
                              </FormControl>
                              <button
                                type="button"
                                onClick={() => handleOpenSubstitution(requirementKey, slot, false)}
                                disabled={isAutoSelected}
                                className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Find a substitution course"
                              >
                                <Repeat size={20} />
                              </button>
                            </Box>
                          </Box>
                            );
                          })}
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
          <p className="text-xs text-gray-600 mb-4">
            Add extra courses you want to take
          </p>

          <div className="space-y-6">
            {/* Step 1: College */}
            <div>
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
                onFocus={handleCollegeDropdownOpen}
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
            </div>

            {/* Step 2: Department */}
            <div>
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
            </div>

            {/* Step 3: Course with Add Button */}
            <div>
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
            </div>

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

        {/* Course Preference Dialog */}
        {preferenceDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h2 className="font-header text-xl font-bold text-[var(--foreground)]">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Sparkles size={24} />
                    <span>Which course is right for you?</span>
                  </Box>
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setPreferenceDialogOpen(false);
                    setPreferenceTarget(null);
                    setSelectedPreference(null);
                    setPreferenceRecommendations([]);
                  }}
                  className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6">
                {!selectedPreference ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select what matters most to you, and we'll recommend courses that match your preference:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Lighter Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('lighter')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={20} className="text-blue-600" />
                          <span className="font-semibold text-gray-900">Lighter workload</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Courses that are typically less demanding and easier to manage
                        </p>
                      </button>

                      {/* Challenge Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('challenge')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Scale size={20} className="text-purple-600" />
                          <span className="font-semibold text-gray-900">Challenge me</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          More advanced courses that will push your skills
                        </p>
                      </button>

                      {/* Career Goals Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('career')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen size={20} className="text-green-600" />
                          <span className="font-semibold text-gray-900">Career alignment</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Courses that align with your career goals
                        </p>
                      </button>

                      {/* Interests Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('interests')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={20} className="text-orange-600" />
                          <span className="font-semibold text-gray-900">My interests</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Courses that match your personal interests
                        </p>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Based on your preference, we recommend:
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click on a course to select it
                      </p>
                    </div>

                    {preferenceRecommendations.length > 0 ? (
                      <div className="space-y-2">
                        {preferenceRecommendations.map((courseCode, index) => {
                          const course = preferenceTarget?.courses.find(c => c.code === courseCode);
                          if (!course) return null;

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

                          return (
                            <button
                              key={courseCode}
                              type="button"
                              onClick={() => handleApplyPreferenceRecommendation(courseCode)}
                              className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50 transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-black font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{course.code}</p>
                                  <p className="text-xs text-gray-600">{course.title}</p>
                                </div>
                              </div>
                              <Chip
                                label={`${credits} cr`}
                                size="small"
                                sx={{
                                  backgroundColor: '#e5e7eb',
                                  color: '#374151',
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No recommendations available for this preference.
                      </p>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPreference(null);
                        setPreferenceRecommendations([]);
                      }}
                      className="w-full mt-4"
                    >
                      Back to preferences
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Substitution Dialog */}
        {substitutionDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h2 className="font-header text-xl font-bold text-[var(--foreground)]">
                  Select Substitution Course
                </h2>
                <button
                  type="button"
                  onClick={() => setSubstitutionDialogOpen(false)}
                  className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 p-6">
                <p className="text-sm text-muted-foreground">
                  Browse all available courses to find a substitution for this requirement.
                </p>

                {/* Step 1: College */}
                <TextField
                  select
                  fullWidth
                  label="1. Select College"
                  value={substitutionCollege}
                  onChange={(e) => handleSubstitutionCollegeChange(e.target.value)}
                  disabled={loadingSubstitutionColleges}
                  size="small"
                >
                  <MenuItem value="">
                    <em>Select a college</em>
                  </MenuItem>
                  <MenuItem value="" disabled>
                    {loadingSubstitutionColleges ? 'Loading colleges...' : '---'}
                  </MenuItem>
                  {substitutionColleges.map((college) => (
                    <MenuItem key={college} value={college}>
                      {college}
                    </MenuItem>
                  ))}
                </TextField>

                {/* Step 2: Department */}
                <TextField
                  select
                  fullWidth
                  label="2. Select Department"
                  value={substitutionDepartment}
                  onChange={(e) => handleSubstitutionDepartmentChange(e.target.value)}
                  disabled={!substitutionCollege || loadingSubstitutionDepartments}
                  size="small"
                >
                  <MenuItem value="">
                    <em>Select a department</em>
                  </MenuItem>
                  <MenuItem value="" disabled>
                    {loadingSubstitutionDepartments ? 'Loading departments...' : substitutionCollege ? '---' : 'Select a college first'}
                  </MenuItem>
                  {substitutionDepartments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>

                {/* Step 3: Course */}
                <TextField
                  select
                  fullWidth
                  label="3. Select Course"
                  value={substitutionCourse?.offering_id.toString() || ''}
                  onChange={(e) => {
                    const course = substitutionCourses.find(c => c.offering_id.toString() === e.target.value);
                    setSubstitutionCourse(course || null);
                  }}
                  disabled={!substitutionDepartment || loadingSubstitutionCourses}
                  size="small"
                >
                  <MenuItem value="">
                    <em>Select a course</em>
                  </MenuItem>
                  <MenuItem value="" disabled>
                    {loadingSubstitutionCourses ? 'Loading courses...' : substitutionDepartment ? (substitutionCourses.length > 0 ? '---' : 'No courses available') : 'Select a department first'}
                  </MenuItem>
                  {substitutionCourses.map((course) => (
                    <MenuItem key={course.offering_id} value={course.offering_id.toString()}>
                      {course.course_code} — {course.title} ({course.credits_decimal || 0} credits)
                    </MenuItem>
                  ))}
                </TextField>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setSubstitutionDialogOpen(false)}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplySubstitution}
                  disabled={!substitutionCourse}
                  style={{
                    backgroundColor: substitutionCourse ? 'var(--primary)' : 'var(--muted)',
                    color: substitutionCourse ? 'black' : 'var(--muted-foreground)'
                  }}
                  className="text-sm font-medium"
                >
                  Apply Substitution
                </Button>
              </div>
            </div>
          </div>
        )}

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
