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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { BookOpen, Plus, X, Repeat, Zap, Scale, Sparkles, Info, Search } from 'lucide-react';
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
import CourseSearch from '@/components/grad-plan/CourseSearch';
import {
  getCollegesAction,
  getDepartmentCodesAction,
  getCoursesByDepartmentAction,
  getCourseByCodeAction,
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

// Color palette for requirement backgrounds
const REQUIREMENT_COLORS = [
  'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
  'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
  'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800',
  'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800',
  'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800',
  'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
];

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

  // Course selection method preference (AI vs Manual)
  const [selectionMethod, setSelectionMethod] = useState<'ai' | 'manual'>('manual');

  // Active tab state
  const [activeTab, setActiveTab] = useState(0);

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

  // Course description dialog state
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [selectedCourseForDescription, setSelectedCourseForDescription] = useState<{
    code: string;
    title: string;
    description: string | null;
    prerequisites: string | null;
  } | null>(null);

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

  // Calculate total credits from all selected courses and electives
  const totalSelectedCredits = useMemo(() => {
    let total = 0;

    // Helper function to extract credits from a course
    const extractCredits = (credits: number | { fixed: number } | { variable: true; min?: number; max?: number } | null): number => {
      if (typeof credits === 'number') {
        return credits;
      }
      if (credits && typeof credits === 'object') {
        if ('fixed' in credits) {
          return credits.fixed;
        }
        if ('min' in credits && credits.min) {
          return credits.min;
        }
      }
      return 3; // Default fallback
    };

    // Count credits from general education courses
    Object.entries(selectedCourses).forEach(([subtitle, courseCodes]) => {
      const coursesList = requirementCoursesMap[subtitle] || [];
      courseCodes.forEach(courseCode => {
        if (courseCode && courseCode.trim() !== '') {
          const course = coursesList.find(c => c.code === courseCode);
          if (course) {
            total += extractCredits(course.credits);
          } else {
            total += 3; // Default if course not found
          }
        }
      });
    });

    // Count credits from program courses
    Object.entries(selectedProgramCourses).forEach(([key, courseCodes]) => {
      // Parse the key to find the program and requirement
      const programIdMatch = key.match(/^(\d+)-(req|subreq)-(.+)$/);
      if (!programIdMatch) return;

      const [, programId, reqType, reqId] = programIdMatch;
      const programReqs = programRequirementsMap[programId] || [];

      let coursesList: Array<{ code: string; title: string; credits: number | { fixed: number } | { variable: true; min?: number; max?: number } | null }> = [];

      if (reqType === 'req') {
        const req = programReqs.find(r => String(r.requirementId) === reqId);
        if (req && req.courses) {
          coursesList = req.courses;
        }
      } else if (reqType === 'subreq') {
        // Find the parent requirement that has this subrequirement
        for (const req of programReqs) {
          if (req.subRequirements) {
            const subReq = req.subRequirements.find(sr => String(sr.requirementId) === reqId);
            if (subReq && subReq.courses) {
              coursesList = subReq.courses;
              break;
            }
          }
        }
      }

      courseCodes.forEach(courseCode => {
        if (courseCode && courseCode.trim() !== '') {
          const course = coursesList.find(c => c.code === courseCode);
          if (course) {
            total += extractCredits(course.credits);
          } else {
            total += 3; // Default if course not found
          }
        }
      });
    });

    // Count credits from user-added electives
    userElectives.forEach(elective => {
      total += elective.credits;
    });

    return total;
  }, [selectedCourses, selectedProgramCourses, userElectives, requirementCoursesMap, programRequirementsMap]);

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

  const handleAddElective = (selectedCourse: CourseOffering) => {
    if (!selectedCourse) return;

    const code = selectedCourse.course_code.trim().toUpperCase();
    const title = selectedCourse.title.trim();
    const credits = selectedCourse.credits_decimal || 3.0;

    if (userElectives.some(e => e.code === code)) {
      setElectiveError('This course has already been added.');
      return;
    }

    const newCourse = {
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

  // Dev tool: Auto-fill with middle course options
  const handleFeelingLucky = () => {
    // Switch to manual mode
    setSelectionMethod('manual');

    // Fill Gen Ed requirements
    const newGenEdSelections: Record<string, string[]> = {};
    requirements.forEach(req => {
      const courses = requirementCoursesMap[req.subtitle] || [];
      if (courses.length > 0) {
        const dropdownCount = getDropdownCount(req);
        const selections: string[] = [];

        for (let i = 0; i < dropdownCount; i++) {
          // Pick courses spread evenly across the list to avoid duplicates
          const index = Math.floor((i / dropdownCount) * courses.length);
          selections.push(courses[index]?.code || '');
        }

        newGenEdSelections[req.subtitle] = selections;
      }
    });
    setSelectedCourses(newGenEdSelections);

    // Fill Program requirements
    const newProgramSelections: Record<string, string[]> = {};
    selectedPrograms.forEach(programId => {
      const programReqs = programRequirementsMap[programId] || [];

      programReqs.forEach(req => {
        if (!req.courses || req.courses.length === 0) return;

        const dropdownCount = getProgramDropdownCount(req);
        const requirementKey = getRequirementKey(programId, req);
        const validCourses = getValidCourses(req);

        if (validCourses.length > 0) {
          const selections: string[] = [];

          for (let i = 0; i < dropdownCount; i++) {
            // Pick courses spread evenly across the list to avoid duplicates
            const index = Math.floor((i / dropdownCount) * validCourses.length);
            selections.push(validCourses[index]?.code || '');
          }

          newProgramSelections[requirementKey] = selections;
        }
      });
    });
    setSelectedProgramCourses(newProgramSelections);
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
    // Check if this is a placeholder course
    if (courseCode.startsWith('PLACEHOLDER:')) {
      const requirementName = courseCode.replace('PLACEHOLDER:', '').trim();
      return {
        code: courseCode,
        title: `Placeholder for ${requirementName}`,
        credits: 3,
      };
    }

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

  const handleViewCourseDescription = async (courseCode: string, courses: Array<{ code: string; title: string; description?: string | null; prerequisites?: string | null }>) => {
    const course = courses.find(c => c.code === courseCode);
    if (!course) return;

    // If course already has description/prerequisites, use it
    if (course.description || course.prerequisites) {
      setSelectedCourseForDescription({
        code: course.code,
        title: course.title,
        description: course.description || null,
        prerequisites: course.prerequisites || null,
      });
      setDescriptionDialogOpen(true);
      return;
    }

    // Otherwise, fetch from database
    try {
      const result = await getCourseByCodeAction(universityId, courseCode);
      if (result.success && result.course) {
        setSelectedCourseForDescription({
          code: result.course.course_code,
          title: result.course.title,
          description: result.course.description || null,
          prerequisites: result.course.prerequisites || null,
        });
      } else {
        // Fallback to course without description
        setSelectedCourseForDescription({
          code: course.code,
          title: course.title,
          description: null,
          prerequisites: null,
        });
      }
      setDescriptionDialogOpen(true);
    } catch (error) {
      console.error('Error fetching course details:', error);
      // Fallback to course without description
      setSelectedCourseForDescription({
        code: course.code,
        title: course.title,
        description: null,
        prerequisites: null,
      });
      setDescriptionDialogOpen(true);
    }
  };

  const handleSubmit = () => {
    // In AI mode, skip course selection and only include electives
    // Note: We bypass the Zod schema validation for AI mode since it has different requirements
    if (selectionMethod === 'ai') {
      const aiModeData = {
        selectionMode: 'ai' as const,
        programs: [], // Empty - AI will select courses during plan generation
        ...(userElectives.length > 0 && {
          userAddedElectives: userElectives.map(e => ({
            code: e.code,
            title: e.title,
            credits: e.credits,
          })),
        }),
        genEdDistribution,
        totalSelectedCredits,
      };

      // Type assertion: AI mode intentionally has different shape than schema
      // We cast through 'unknown' to bypass strict type checking since AI mode is a special case
      onSubmit(aiModeData as unknown as CourseSelectionInput);
      return;
    }

    // Manual mode - Build the course selection data
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

    // Validate (Manual mode only)
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
      totalSelectedCredits,
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
        <p className="text-xs text-muted-foreground mt-2 italic">
          * Stu will attempt to auto-match courses from your transcript where possible (if included)
        </p>
        <p className="text-xs text-muted-foreground mt-2 italic">
          * Selecting a course indicates interest but does not commit you to taking it
        </p>
      </div>

      {/* Quick Course Search - Top */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border border-green-200 dark:border-green-800 rounded-lg">
        <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Search size={16} />
          Quick Course Search
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Search for any course by code (e.g., TMA 101, CS 235) or name (e.g., Intro to Film) and add it to your plan
        </p>
        <CourseSearch
          universityId={universityId}
          onSelect={handleAddElective}
          placeholder="Search by course code or name..."
          size="small"
          fullWidth
        />
        {userElectives.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {userElectives.map((elective) => (
              <Chip
                key={elective.id}
                label={`${elective.code} — ${elective.title} (${elective.credits} cr)`}
                onDelete={() => handleRemoveElective(elective.id)}
                deleteIcon={<X size={14} />}
                size="small"
                sx={{
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  '& .MuiChip-deleteIcon': {
                    color: '#ffffff',
                  },
                }}
              />
            ))}
          </div>
        )}
        {electiveError && (
          <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }}>
            {electiveError}
          </Alert>
        )}
      </div>

      {/* Course Selection Method Preference */}
      <div className="mb-4 flex justify-center">
        <div className="inline-flex items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-full shadow-sm p-1">
          <button
            type="button"
            onClick={() => setSelectionMethod('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectionMethod === 'ai'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Sparkles size={16} />
            I want AI to choose for me
          </button>
          <button
            type="button"
            onClick={() => setSelectionMethod('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectionMethod === 'manual'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <BookOpen size={16} />
            I want to choose for myself
          </button>
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={handleFeelingLucky}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              title="Dev only: Auto-fill with middle course options"
            >
              <Zap size={16} />
              I'm feeling lucky
            </button>
          )}
        </div>
      </div>

      {/* Gen Ed Distribution Preference - Only for undergraduates */}
      {!isGraduateStudent && (
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-full shadow-sm p-1">
            <button
              type="button"
              onClick={() => setGenEdDistribution('early')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                genEdDistribution === 'early'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Zap size={16} />
              I want to get Gen Eds done early
            </button>
            <button
              type="button"
              onClick={() => setGenEdDistribution('balanced')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                genEdDistribution === 'balanced'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Scale size={16} />
              I want to balance Gen Eds throughout
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
          variant="secondary"
          className="gap-2"
        >
          <Compass size={18} />
          Need help selecting courses?
        </Button>
      </div> */}

      {/* AI Mode - Only show electives section */}
      {selectionMethod === 'ai' && (
        <div className="mb-4">
          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
            <div className="flex items-start gap-2">
              <Sparkles size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>AI Course Selection Enabled</strong>
                <p className="mt-1 text-sm">
                  Our AI will select the best courses for your graduation plan based on your programs, preferences, and academic goals. You can still add any elective courses you'd like to include below.
                </p>
              </div>
            </div>
          </Alert>
        </div>
      )}

      {/* Tabs for Programs and Gen Ed - Only show in Manual mode */}
      {selectionMethod === 'manual' && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                minHeight: '64px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              },
            }}
          >
            {/* Gen Ed tab for undergraduates */}
            {!isGraduateStudent && requirements.length > 0 && (
              <Tab
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <svg width="32" height="32" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="4"
                      />
                    </svg>
                    <span style={{ fontSize: '0.75rem' }}>Gen Ed</span>
                  </Box>
                }
              />
            )}

            {/* Tab for each selected program */}
            {Array.from(selectedPrograms).map((programId, index) => {
              const program = programsData?.find(p => String(p.id) === programId);
              if (!program) return null;

              // Assign different colors to different programs
              const colors = [
                '#8b5cf6', // Purple for first major
                '#3b82f6', // Blue for second major
                '#6366f1', // Indigo for third
                '#ec4899', // Pink for fourth
              ];
              const color = colors[index % colors.length];

              // Shorten program name for tab if too long
              const shortName = program.name && program.name.length > 20
                ? program.name.substring(0, 18) + '...'
                : program.name;

              return (
                <Tab
                  key={programId}
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <svg width="32" height="32" viewBox="0 0 32 32">
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={color}
                          strokeWidth="4"
                        />
                      </svg>
                      <span style={{ fontSize: '0.75rem' }}>{shortName}</span>
                    </Box>
                  }
                />
              );
            })}

            {/* Electives tab */}
            <Tab
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                    />
                  </svg>
                  <span style={{ fontSize: '0.75rem' }}>Electives</span>
                </Box>
              }
            />
          </Tabs>
        </Box>
      )}

      <div className="space-y-3">
        {/* General Education Requirements Tab Content - Only show in Manual mode */}
        {selectionMethod === 'manual' && !isGraduateStudent && requirements.length > 0 && activeTab === 0 && (
          <div>
            <div className="space-y-3">
              {requirements.map((req, idx) => {
                const dropdownCount = getDropdownCount(req);
                const courses = requirementCoursesMap[req.subtitle] || [];
                const isAutoSelected = courses.length > 0 && courses.length === dropdownCount;

                // Check if this requirement has a completed course from transcript
                const hasCompletedCourse = completedRequirementKeys.has(req.subtitle);

                const sectionKey = `gen-ed-${req.subtitle}`;
                // Always expand by default to show what course is required
                const isExpanded = expandedSections[sectionKey] ?? true;
                const recommendations = genEdRecommendationsMap[req.subtitle] || [];

                // Get color for this requirement
                const colorClass = REQUIREMENT_COLORS[idx % REQUIREMENT_COLORS.length];

                return (
                  <div key={`${req.subtitle}-${idx}`} className={`space-y-2 border rounded p-2.5 ${colorClass}`}>
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
                          label={courses.length === 1 ? "Only 1 Course Available" : "Auto-selected"}
                          size="small"
                          className="text-xs ml-auto"
                          sx={{
                            backgroundColor: 'var(--primary)',
                            color: 'black',
                            height: '20px',
                          }}
                        />
                      ) : null}
                    </button>

                    {isExpanded && (
                      <>
                        {isAutoSelected && (
                          <p className="text-xs text-muted-foreground italic">
                            {courses.length === 1
                              ? "There is only 1 course available for this requirement, so it has been automatically selected."
                              : `All available courses for this requirement have been automatically selected (${courses.length} courses).`
                            }
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
                                <MenuItem
                                  value={`PLACEHOLDER: ${req.subtitle}`}
                                  sx={{
                                    fontStyle: 'italic',
                                    color: '#6b7280',
                                  }}
                                >
                                  I just need a placeholder for now
                                </MenuItem>
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
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewCourseDescription(c.code, courses);
                                              }}
                                              sx={{ ml: 'auto', p: 0.5 }}
                                              title="View course description"
                                            >
                                              <Info size={16} />
                                            </IconButton>
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
                  </div>
                );
              })}
            </div>

            {/* Continue button for Gen Ed tab */}
            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setActiveTab(activeTab + 1)}
                className="px-4 py-2 text-sm font-medium"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Program Requirements - Only show in Manual mode */}
        {selectionMethod === 'manual' && Array.from(selectedPrograms).map((programId, programIndex) => {
          const program = programsData?.find(p => String(p.id) === programId);
          if (!program) return null;

          const programReqs = programRequirementsMap[programId] || [];
          if (programReqs.length === 0) return null;

          // Calculate which tab index this program corresponds to
          // For undergraduates: Gen Ed is tab 0, so programs start at tab 1
          // For graduates: Programs start at tab 0
          const programTabIndex = !isGraduateStudent && requirements.length > 0
            ? programIndex + 1
            : programIndex;

          // Only render if this program's tab is active
          if (activeTab !== programTabIndex) return null;

          return (
            <div key={programId}>
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
                  // Always expand by default to show what course is required
                  const isExpanded = expandedSections[sectionKey] ?? true;
                  const progRecommendations = programRecommendationsMap[requirementKey] || [];

                  // Get color for this requirement
                  const colorClass = REQUIREMENT_COLORS[reqIdx % REQUIREMENT_COLORS.length];

                  return (
                    <div key={`${programId}-req-${req.requirementId}`} className={`space-y-2 border rounded p-2.5 ${colorClass}`}>
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
                            label={validCourses.length === 1 ? "Only 1 Course Available" : "Auto-selected"}
                            size="small"
                            className="text-xs ml-auto"
                            sx={{
                              backgroundColor: 'var(--primary)',
                              color: 'black',
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
                                  <MenuItem
                                    value={`PLACEHOLDER: ${req.description}`}
                                    sx={{
                                      fontStyle: 'italic',
                                      color: '#6b7280',
                                    }}
                                  >
                                    I just need a placeholder for now
                                  </MenuItem>
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
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewCourseDescription(c.code || '', validCourses);
                                              }}
                                              sx={{ ml: 'auto', p: 0.5 }}
                                              title="View course description"
                                            >
                                              <Info size={16} />
                                            </IconButton>
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
                    </div>
                  );
                })}
              </div>

              {/* Continue button for program tab */}
              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Continue
                </Button>
              </div>
            </div>
          );
        })}

        {/* Electives Tab Content */}
        {(() => {
          // In AI mode, always show electives section
          if (selectionMethod === 'ai') {
            return (
              <div>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Search size={16} />
                    Additional Electives
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Search for any additional courses you'd like to add to your plan. These can be electives, exploratory courses, or anything not covered in your program requirements.
                  </p>
                  <CourseSearch
                    universityId={universityId}
                    onSelect={handleAddElective}
                    placeholder="Search by course code or name..."
                    size="small"
                    fullWidth
                  />
                  {userElectives.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Your additional courses ({userElectives.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {userElectives.map((elective) => (
                          <Chip
                            key={elective.id}
                            label={`${elective.code} — ${elective.title} (${elective.credits} cr)`}
                            onDelete={() => handleRemoveElective(elective.id)}
                            deleteIcon={<X size={14} />}
                            size="small"
                            sx={{
                              backgroundColor: 'var(--primary)',
                              color: '#ffffff',
                              '& .MuiChip-deleteIcon': {
                                color: '#ffffff',
                              },
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {electiveError && (
                    <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }}>
                      {electiveError}
                    </Alert>
                  )}
                </div>

                {/* Submit button for AI mode */}
                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    className="px-4 py-2 text-sm font-medium"
                  >
                    Submit & Continue
                  </Button>
                </div>
              </div>
            );
          }

          // In Manual mode, only show when Electives tab is active
          // Calculate the total number of tabs
          const genEdTabCount = !isGraduateStudent && requirements.length > 0 ? 1 : 0;
          const programTabCount = selectedPrograms.size;
          const electivesTabIndex = genEdTabCount + programTabCount;

          // Only render if Electives tab is active
          if (activeTab !== electivesTabIndex) return null;

          return (
            <div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Search size={16} />
                  Additional Electives
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Search for any additional courses you'd like to add to your plan. These can be electives, exploratory courses, or anything not covered in your program requirements.
                </p>
                <CourseSearch
                  universityId={universityId}
                  onSelect={handleAddElective}
                  placeholder="Search by course code or name..."
                  size="small"
                  fullWidth
                />
                {userElectives.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Your additional courses ({userElectives.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {userElectives.map((elective) => (
                        <Chip
                          key={elective.id}
                          label={`${elective.code} — ${elective.title} (${elective.credits} cr)`}
                          onDelete={() => handleRemoveElective(elective.id)}
                          deleteIcon={<X size={14} />}
                          size="small"
                          sx={{
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            '& .MuiChip-deleteIcon': {
                              color: '#ffffff',
                            },
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {electiveError && (
                  <Alert severity="warning" sx={{ mt: 2, fontSize: '0.75rem' }}>
                    {electiveError}
                  </Alert>
                )}
              </div>

              {/* Submit button for Electives tab */}
              <div className="pt-4 flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm font-medium"
                >
                  Submit & Continue
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Additional Electives - Second Search Box at Bottom - REMOVED (now in Electives tab) */}
        {/* Keeping old code commented out for reference */}
        {/*
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Search size={16} />
            Additional Electives
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Didn't find what you need above? Search for any additional courses here.
          </p>
          <CourseSearch
            universityId={universityId}
            onSelect={handleAddElective}
            placeholder="Search by course code or name..."
            size="small"
            fullWidth
          />
          {userElectives.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Your additional courses ({userElectives.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {userElectives.map((elective) => (
                  <Chip
                    key={elective.id}
                    label={`${elective.code} — ${elective.title} (${elective.credits} cr)`}
                    onDelete={() => handleRemoveElective(elective.id)}
                    deleteIcon={<X size={14} />}
                    size="small"
                    sx={{
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      '& .MuiChip-deleteIcon': {
                        color: '#ffffff',
                      },
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        */}

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
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={20} className="text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">Lighter workload</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          Courses that are typically less demanding and easier to manage
                        </p>
                      </button>

                      {/* Challenge Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('challenge')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 dark:border-zinc-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Scale size={20} className="text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">Challenge me</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          More advanced courses that will push your skills
                        </p>
                      </button>

                      {/* Career Goals Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('career')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 dark:border-zinc-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen size={20} className="text-green-600 dark:text-green-400" />
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">Career alignment</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          Courses that align with your career goals
                        </p>
                      </button>

                      {/* Interests Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectPreference('interests')}
                        className="flex flex-col items-start p-4 rounded-lg border-2 border-gray-200 dark:border-zinc-700 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={20} className="text-orange-600 dark:text-orange-400" />
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">My interests</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-400">
                          Courses that match your personal interests
                        </p>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">
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
                              className="w-full flex items-center justify-between p-3 rounded-lg border-2 border-gray-200 dark:border-zinc-700 hover:border-[var(--primary)] hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-zinc-900 dark:text-zinc-900 font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-zinc-100">{course.code}</p>
                                  <p className="text-xs text-gray-600 dark:text-zinc-400">{course.title}</p>
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
                      variant="secondary"
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
                  variant="secondary"
                  onClick={() => setSubstitutionDialogOpen(false)}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApplySubstitution}
                  disabled={!substitutionCourse}
                  className="text-sm font-medium"
                >
                  Apply Substitution
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Old Submit Button - REMOVED (now in Electives tab) */}

        {/* Course Description Dialog */}
        <Dialog
          open={descriptionDialogOpen}
          onClose={() => setDescriptionDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-lg font-semibold">
                {selectedCourseForDescription?.code} - {selectedCourseForDescription?.title}
              </span>
              <IconButton
                onClick={() => setDescriptionDialogOpen(false)}
                size="small"
              >
                <X size={20} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedCourseForDescription?.prerequisites && (
              <Box sx={{ mb: 3 }}>
                <p className="text-sm font-semibold text-foreground mb-1">Prerequisites:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCourseForDescription.prerequisites}
                </p>
              </Box>
            )}
            {selectedCourseForDescription?.description ? (
              <Box>
                <p className="text-sm font-semibold text-foreground mb-1">Description:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCourseForDescription.description}
                </p>
              </Box>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description available for this course.
              </p>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              variant="secondary"
              onClick={() => setDescriptionDialogOpen(false)}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
