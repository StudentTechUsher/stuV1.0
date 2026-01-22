"use client";
import * as React from 'react';
import { CourseHistoryList, PivotOptionsPanel, useDefaultPivotOptions, MajorPivotForm, MajorPivotFormValues } from '@/components/pathfinder';
import { fetchMajorPivotSuggestions, fetchMajorsForCareerSelection, fetchAdjacentCareerSuggestions, fetchNearCompletionMinorAudit, fetchMinorsCatalog, enrichCareerData, enrichMajorData } from '@/app/(dashboard)/pathfinder/actions';
import { fetchMajorsForComparison, fetchMajorComparison } from '@/app/(dashboard)/pathfinder/comparison-actions';
import { saveTargetedCareerClient } from '@/lib/services/profileService';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/ui/toast';
import AdjacentCareerForm, { AdjacentCareerFormValues } from '@/components/pathfinder/adjacent-career-form';
import MajorOverlapDialog, { ProgramOverlapPanel } from '@/components/pathfinder/program-overlap-dialog';
import { fetchMinorByName } from '@/app/(dashboard)/pathfinder/major-actions';
import { useRouter, useSearchParams } from 'next/navigation';
import CareerInfoModal from '@/components/pathfinder/CareerInfoModal';
import type { Career } from '@/types/career';
import MajorInfoModal from '@/components/pathfinder/MajorInfoModal';
import type { MajorInfo } from '@/types/major';
import type { FormattedCourse } from '@/lib/services/userCoursesService';
import { StuLoader } from '@/components/ui/StuLoader';
import { MajorComparisonSelector } from '@/components/pathfinder/major-comparison-selector';
import { MajorComparisonView } from '@/components/pathfinder/major-comparison-view';
import type { MajorComparisonResult } from '@/lib/services/majorComparisonService';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { PATHFINDER_COLORS } from '@/components/pathfinder/pathfinder-progress-ui';

type GlobalWithUniversity = typeof globalThis & { __UNIVERSITY_ID__?: unknown };

const getGlobalUniversityId = (): number | undefined => {
  const candidate = (globalThis as GlobalWithUniversity).__UNIVERSITY_ID__;
  return typeof candidate === 'number' ? candidate : undefined;
};

interface PathfinderClientProps {
  courses: FormattedCourse[];
  currentPrograms: Array<{ id: number; name: string }>;
}

export default function PathfinderClient({ courses, currentPrograms }: Readonly<PathfinderClientProps>) {
  // Convert currentPrograms array to string for backward compatibility
  const currentMajor = currentPrograms.length > 0
    ? currentPrograms.map(p => p.name).join(', ')
    : 'Undeclared';
  const pivotOptions = useDefaultPivotOptions();

  const getPivotOptionIcon = React.useCallback((optId: string) => {
  if (optId === 'major-pivot') return <AutoAwesomeIcon className="text-emerald-600" fontSize="inherit" />;
  if (optId === 'minor-pivot') return <LightbulbOutlinedIcon className="text-amber-600" fontSize="inherit" />;
  if (optId === 'minor-audit') return <SchoolOutlinedIcon className="text-indigo-600" fontSize="inherit" />;
  if (optId === 'compare-majors') return <CompareArrowsIcon className="text-emerald-600" fontSize="inherit" />;
    return null;
  }, []);

  const getPivotOptionAccent = React.useCallback((optId: string) => {
    if (optId === 'major-pivot') return { border: 'border-emerald-300', hoverBg: 'hover:bg-emerald-50/40' };
    if (optId === 'minor-pivot') return { border: 'border-amber-300', hoverBg: 'hover:bg-amber-50/40' };
    if (optId === 'minor-audit') return { border: 'border-indigo-300', hoverBg: 'hover:bg-indigo-50/40' };
    if (optId === 'compare-majors') return { border: 'border-emerald-300', hoverBg: 'hover:bg-emerald-50/40' };
    return { border: 'border-[color-mix(in_srgb,var(--border)_80%,transparent)]', hoverBg: 'hover:bg-[color-mix(in_srgb,var(--muted)_32%,transparent)]' };
  }, []);
  const [selectedCourse, setSelectedCourse] = React.useState<string | null>(null);
  const [lastAction, setLastAction] = React.useState<string | null>(null);
  const [activePanel, setActivePanel] = React.useState<string | null>(null);
  const [careerOptions, setCareerOptions] = React.useState<Array<{ id: string; title: string; rationale: string }> | null>(null);
  const [careerMessage, setCareerMessage] = React.useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [suggestionError, setSuggestionError] = React.useState<string | null>(null);
  const [priorIds, setPriorIds] = React.useState<string[]>([]);
  const [retryCount, setRetryCount] = React.useState(0);
  const [clickedCareerId, setClickedCareerId] = React.useState<string | null>(null);
  const [adjacentOptions, setAdjacentOptions] = React.useState<Array<{ id: string; title: string; rationale: string }> | null>(null);
  const [adjacentMessage, setAdjacentMessage] = React.useState<string | null>(null);
  const [loadingAdjacent, setLoadingAdjacent] = React.useState(false);
  const [adjacentError, setAdjacentError] = React.useState<string | null>(null);
  const [adjacentRetryCount, setAdjacentRetryCount] = React.useState(0);
  const [clickedAdjacentId, setClickedAdjacentId] = React.useState<string | null>(null);
  const adjacentFormRef = React.useRef<AdjacentCareerFormValues | null>(null);
  const [selectedCareer, setSelectedCareer] = React.useState<{ id: string; title: string } | null>(null);
  const [majorOptions, setMajorOptions] = React.useState<Array<{ code: string; name: string; rationale: string }> | null>(null);
  const [majorMessage, setMajorMessage] = React.useState<string | null>(null);
  const [loadingMajors, setLoadingMajors] = React.useState(false);
  const retainedFormRef = React.useRef<MajorPivotFormValues | null>(null);
  const [overlapOpen, setOverlapOpen] = React.useState(false);
  interface OverlapProgram { id: number | string; name: string; requirements: unknown; kind?: 'major' | 'minor'; }
  // Minor detail modal is now shown inline; keeping state for potential future modal usage
  const [overlapProgram, _setOverlapProgram] = React.useState<OverlapProgram | null>(null);
  const [minorAuditLoading, setMinorAuditLoading] = React.useState(false);
  const [minorAuditError, setMinorAuditError] = React.useState<string | null>(null);
  const [minorAuditMinors, setMinorAuditMinors] = React.useState<Array<{ id: string; name: string; reason: string }> | null>(null);
  const [minorAuditMessage, setMinorAuditMessage] = React.useState<string | null>(null);
  const [minorCatalog, setMinorCatalog] = React.useState<Array<{ id: number | string; name: string; requirements: unknown }> | null>(null);
  const [minorDetailsByName, setMinorDetailsByName] = React.useState<Record<string, { id: number | string; name: string; requirements: unknown }>>({});

  // Compare Majors state
  const [majorsCatalog, setMajorsCatalog] = React.useState<Array<{ id: string; name: string }> | null>(null);
  const [comparisonData, setComparisonData] = React.useState<MajorComparisonResult[] | null>(null);
  const [loadingComparison, setLoadingComparison] = React.useState(false);
  const [comparisonError, setComparisonError] = React.useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = React.useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, toasts, dismiss } = useToast();
  const [activeCareerModal, setActiveCareerModal] = React.useState<Career | null>(null);
  const [loadingCareer, setLoadingCareer] = React.useState(false);
  const [careerLoadingMessageIndex, setCareerLoadingMessageIndex] = React.useState(0);
  const [activeMajorModal, setActiveMajorModal] = React.useState<MajorInfo | null>(null);
  const [loadingMajor, setLoadingMajor] = React.useState(false);
  const [majorLoadingMessageIndex, setMajorLoadingMessageIndex] = React.useState(0);

  const careerLoadingMessages = [
    { title: 'Gathering Career Info', subtitle: 'Compiling comprehensive career data, salary insights, and job outlook...' },
    { title: 'Analyzing Job Market', subtitle: 'Reviewing current employment trends and industry demand...' },
    { title: 'Compiling Salary Data', subtitle: 'Gathering salary ranges from entry-level to senior positions...' },
    { title: 'Finding Skills & Requirements', subtitle: 'Identifying key skills and qualifications for this career...' },
    { title: 'Exploring Career Pathways', subtitle: 'Mapping out typical career progression and opportunities...' },
    { title: 'Almost Ready', subtitle: 'Finalizing your personalized career insights...' },
  ];

  const majorLoadingMessages = [
    { title: 'Gathering Major Info', subtitle: 'Compiling program details, course requirements, and career pathways...' },
    { title: 'Reviewing Curriculum', subtitle: 'Analyzing core courses, electives, and degree requirements...' },
    { title: 'Finding Course Equivalencies', subtitle: 'Identifying cross-listed courses and transfer options...' },
    { title: 'Exploring Career Options', subtitle: 'Discovering careers this major commonly leads to...' },
    { title: 'Compiling Opportunities', subtitle: 'Gathering internship, research, and study abroad options...' },
    { title: 'Almost Ready', subtitle: 'Finalizing your personalized program insights...' },
  ];

  React.useEffect(() => {
    if (!loadingCareer) {
      setCareerLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCareerLoadingMessageIndex(prev => (prev + 1) % careerLoadingMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadingCareer, careerLoadingMessages.length]);

  React.useEffect(() => {
    if (!loadingMajor) {
      setMajorLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMajorLoadingMessageIndex(prev => (prev + 1) % majorLoadingMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadingMajor, majorLoadingMessages.length]);

  // Auto-load comparison from shared URL
  React.useEffect(() => {
    const compareParam = searchParams.get('compare');
    if (compareParam && !comparisonData && !loadingComparison) {
      const majorIds = compareParam.split(',').map(id => id.trim()).filter(Boolean);
      if (majorIds.length >= 2 && majorIds.length <= 4) {
        // Auto-load comparison
        void handleCompareMajorsClick().then(() => {
          void handleCompareSubmit(majorIds);
        });
      }
    }
  }, [searchParams, comparisonData, loadingComparison]);

  async function fetchOrCreateCareer(careerTitle: string, slug: string, rationale?: string): Promise<Career | null> {
    try {
      const response = await fetch(`/api/careers/${slug}`);
      if (response.ok) {
        const json = await response.json();
        return json.career;
      }
    } catch (error) {
      console.warn('Failed to fetch career from database:', error);
    }

    try {
      const enrichResult = await enrichCareerData({
        careerTitle,
        slug,
        rationale,
        studentContext: {
          currentMajor,
          completedCourses: courses.map(c => ({ code: c.code, title: c.title }))
        }
      });

      if (enrichResult.success && enrichResult.careerData) {
        const aiData = enrichResult.careerData;
        const overview = rationale || `The ${careerTitle} role offers diverse opportunities across industries.`;

        return {
          id: slug,
          slug,
          title: careerTitle,
          shortOverview: overview,
          overview,
          education: {
            typicalLevel: (aiData.education.typicalLevel as Career['education']['typicalLevel']) || 'BACHELOR',
            certifications: aiData.education.certifications || [],
          },
          bestMajors: aiData.bestMajors || [],
          locationHubs: aiData.locationHubs || [],
          salaryUSD: {
            entry: aiData.salaryUSD?.entry,
            median: aiData.salaryUSD?.median,
            p90: aiData.salaryUSD?.p90,
            source: aiData.salaryUSD?.source || 'AI estimate based on industry data',
          },
          outlook: {
            growthLabel: aiData.outlook?.growthLabel as Career['outlook']['growthLabel'],
            notes: aiData.outlook?.notes,
            source: aiData.outlook?.source,
          },
          topSkills: aiData.topSkills || [],
          dayToDay: aiData.dayToDay || [],
          recommendedCourses: aiData.recommendedCourses || [],
          internships: aiData.internships || [],
          clubs: aiData.clubs || [],
          relatedCareers: aiData.relatedCareers || [],
          links: aiData.links || [],
          status: 'DRAFT' as const,
          lastUpdatedISO: new Date().toISOString(),
          updatedBy: undefined,
        };
      }
    } catch (enrichError) {
      console.warn('Failed to enrich career data with AI:', enrichError);
    }

    const overview = rationale || `The ${careerTitle} role offers diverse opportunities across industries. This career path leverages your skills and interests to create meaningful impact.`;

    return {
      id: slug,
      slug,
      title: careerTitle,
      shortOverview: overview,
      overview,
      education: {
        typicalLevel: 'BACHELOR' as const,
        certifications: [],
      },
      bestMajors: [],
      locationHubs: [],
      salaryUSD: {
        entry: undefined,
        median: undefined,
        p90: undefined,
        source: 'Data not available',
      },
      outlook: {
        growthLabel: undefined,
        notes: 'Career outlook data coming soon.',
        source: undefined,
      },
      topSkills: [],
      dayToDay: [],
      recommendedCourses: [],
      internships: [],
      clubs: [],
      relatedCareers: [],
      links: [],
      status: 'DRAFT' as const,
      lastUpdatedISO: new Date().toISOString(),
      updatedBy: undefined,
    };
  }

  async function fetchOrCreateMajor(majorName: string, code: string, rationale?: string): Promise<MajorInfo | null> {
    const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      const enrichResult = await enrichMajorData({
        majorName,
        slug,
        rationale,
        studentContext: {
          currentMajor,
          completedCourses: courses.map(c => ({ code: c.code, title: c.title })),
          targetCareer: selectedCareer?.title
        },
        universityName: 'Your University'
      });

      if (enrichResult.success && enrichResult.majorData) {
        const aiData = enrichResult.majorData;

        return {
          id: slug,
          slug,
          name: majorName,
          degreeType: (aiData.degreeType as MajorInfo['degreeType']) || 'BS',
          shortOverview: aiData.shortOverview || rationale || `Explore the ${majorName} program.`,
          overview: aiData.overview || rationale || `The ${majorName} program provides comprehensive education and practical skills.`,
          topCareers: aiData.topCareers || [],
          careerOutlook: aiData.careerOutlook || '',
          totalCredits: aiData.totalCredits || 120,
          typicalDuration: aiData.typicalDuration || '4 years',
          coreCourses: aiData.coreCourses || [],
          electiveCourses: aiData.electiveCourses || [],
          courseEquivalencies: aiData.courseEquivalencies || [],
          prerequisites: aiData.prerequisites || [],
          mathRequirements: aiData.mathRequirements,
          otherRequirements: aiData.otherRequirements,
          topSkills: aiData.topSkills || [],
          learningOutcomes: aiData.learningOutcomes || [],
          internshipOpportunities: aiData.internshipOpportunities || [],
          researchAreas: aiData.researchAreas || [],
          studyAbroadOptions: aiData.studyAbroadOptions || [],
          clubs: aiData.clubs || [],
          relatedMajors: aiData.relatedMajors || [],
          commonMinors: aiData.commonMinors || [],
          dualDegreeOptions: aiData.dualDegreeOptions || [],
          departmentWebsite: aiData.departmentWebsite,
          advisingContact: aiData.advisingContact,
          links: aiData.links || [],
          lastUpdatedISO: new Date().toISOString(),
          status: 'DRAFT' as const,
          updatedBy: undefined,
        };
      }
    } catch (enrichError) {
      console.warn('Failed to enrich major data with AI:', enrichError);
    }

    return {
      id: slug,
      slug,
      name: majorName,
      degreeType: 'BS' as const,
      shortOverview: rationale || `Explore the ${majorName} program.`,
      overview: rationale || `The ${majorName} program provides comprehensive education and practical skills for your career goals.`,
      topCareers: [],
      careerOutlook: '',
      totalCredits: 120,
      typicalDuration: '4 years',
      coreCourses: [],
      electiveCourses: [],
      courseEquivalencies: [],
      prerequisites: [],
      topSkills: [],
      learningOutcomes: [],
      lastUpdatedISO: new Date().toISOString(),
      status: 'DRAFT' as const,
      updatedBy: undefined,
    };
  }

  function handleMajorPivotSubmit(values: MajorPivotFormValues) {
    setLastAction('Submitted major pivot context');
    retainedFormRef.current = values;
    if (values.wantCareerHelp) {
      void loadCareerSuggestions(values, false);
      return;
    }
    const careerTitle = values.consideredCareer.trim();
    if (!careerTitle) {
      setSuggestionError('Please enter a career you are considering.');
      return;
    }
    const slug = careerTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'career';
    setSelectedCareer({ id: slug, title: careerTitle });
    setMajorOptions(null);
    setMajorMessage(null);
    setSuggestionError(null);
    void (async () => {
      setLoadingMajors(true);
      try {
        const result = await fetchMajorsForCareerSelection({
          currentMajor,
            selectedCareerId: slug,
            selectedCareerTitle: careerTitle,
            form: values,
            completedCourses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, grade: c.grade, tags: c.tags })),
            universityId: getGlobalUniversityId() ?? 1,
        });
        if (!result.success || !result.majors) {
          setSuggestionError(result.message || 'Failed to load majors');
          return;
        }
        setMajorOptions(result.majors);
        setMajorMessage(result.message);
      } catch (error) {
        setSuggestionError(error instanceof Error ? error.message : 'Unknown error fetching majors');
      } finally {
        setLoadingMajors(false);
      }
    })();
  }

  async function loadCareerSuggestions(form: MajorPivotFormValues, reRequest: boolean) {
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const result = await fetchMajorPivotSuggestions({
        currentMajor,
        form,
        completedCourses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, grade: c.grade, tags: c.tags })),
        priorIds: reRequest ? priorIds : [],
        reRequest,
      });
      if (!result.success || !result.options) {
        setSuggestionError(result.message || 'Failed to load suggestions');
        return;
      }
      setCareerOptions(result.options);
      setCareerMessage(result.message);
      if (reRequest) setRetryCount(r => r + 1);
  setPriorIds(prev => Array.from(new Set([...prev, ...result.options!.map((o: { id: string }) => o.id)])));
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Unknown error fetching suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleCareerClick(id: string) {
    if (!careerOptions) return;
    const chosen = careerOptions.find(c => c.id === id);
    if (!chosen) return;
    setClickedCareerId(id);

    setLoadingCareer(true);

    try {
      const careerData = await fetchOrCreateCareer(chosen.title, chosen.id, chosen.rationale);
      if (careerData) {
        setActiveCareerModal(careerData);
      }
    } finally {
      setLoadingCareer(false);
    }
  }

  async function handleCareerModalProceed(careerTitle: string, careerId: string) {
    setActiveCareerModal(null);
    setSelectedCareer({ id: careerId, title: careerTitle });

    void (async () => {
      const res = await saveTargetedCareerClient(careerTitle);
      if (res.success) {
        toast({ title: 'New career target saved!' });
      } else if (res.error && res.error !== 'Not authenticated') {
        toast({ title: 'Could not save career', description: res.error, variant: 'destructive' });
      }
    })();

    setMajorOptions(null);
    setMajorMessage(null);
    setSuggestionError(null);
    if (!retainedFormRef.current) {
      router.push('/grad-plan');
      return;
    }
    setLoadingMajors(true);
    try {
      const derivedUniversityId = getGlobalUniversityId();
      const result = await fetchMajorsForCareerSelection({
        currentMajor,
        selectedCareerId: careerId,
        selectedCareerTitle: careerTitle,
        form: retainedFormRef.current,
        completedCourses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, grade: c.grade, tags: c.tags })),
        universityId: derivedUniversityId,
      });
      if (!result.success || !result.majors) {
        setSuggestionError(result.message || 'Failed to load majors');
        return;
      }
      setMajorOptions(result.majors);
      setMajorMessage(result.message);
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Unknown error fetching majors');
    } finally {
      setLoadingMajors(false);
    }
  }

  async function handleMajorSelection(code: string) {
    const chosen = majorOptions?.find(m => m.code === code);
    if (!chosen) return;

    setLoadingMajor(true);

    try {
      const majorInfo = await fetchOrCreateMajor(chosen.name, chosen.code, chosen.rationale);
      if (majorInfo) {
        setActiveMajorModal(majorInfo);
      }
    } finally {
      setLoadingMajor(false);
    }
  }

  function handleNoneOfThese(formValues: MajorPivotFormValues) {
    if (retryCount >= 1) {
      router.push('/meet-with-advisor');
      return;
    }
    void loadCareerSuggestions(formValues, true);
  }

  // Minor click handling is now integrated inline with ProgramOverlapPanel

  async function loadMinorAudit() {
    setMinorAuditLoading(true);
    setMinorAuditError(null);
    try {
      let catalog = minorCatalog;
      if (!catalog) {
        catalog = await fetchMinorsCatalog(1);
        setMinorCatalog(catalog);
      }
      const result = await fetchNearCompletionMinorAudit({
        currentMajor,
        completedCourses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, grade: c.grade })),
        minors: catalog || []
      });
      if (!result.success || !result.minors) {
        setMinorAuditError(result.message || 'Failed to audit minors');
        return;
      }
      setMinorAuditMinors(result.minors);
      setMinorAuditMessage(result.message);

      // Prefetch each surfaced minor's details (requirements blob) so we can render details expanded by default.
      const uniqueNames = Array.from(new Set(result.minors.map(m => m.name).filter(Boolean)));
      if (uniqueNames.length) {
        const entries = await Promise.all(uniqueNames.map(async (name) => {
          try {
            const res = await fetchMinorByName(1, name);
            if (res.success && res.minor) {
              return [name, { id: res.minor.id, name: res.minor.name, requirements: res.minor.requirements }] as const;
            }
          } catch {
            // ignore
          }
          return [name, { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, requirements: {} }] as const;
        }));
        setMinorDetailsByName(prev => {
          const merged = { ...prev };
          for (const [k, v] of entries) merged[k] = v;
          return merged;
        });
      }
    } catch (error) {
      setMinorAuditError(error instanceof Error ? error.message : 'Unknown error auditing minors');
    } finally {
      setMinorAuditLoading(false);
    }
  }

  // Compare Majors handlers
  async function handleCompareMajorsClick() {
    setActivePanel('compare-majors');
    setComparisonError(null);

    // Fetch majors catalog
    const universityId = getGlobalUniversityId() ?? 1;
    const result = await fetchMajorsForComparison(universityId);

    if (result.success && result.majors) {
      setMajorsCatalog(result.majors);
    } else {
      setComparisonError(result.error || 'Failed to load majors');
    }
  }

  async function handleCompareSubmit(majorIds: string[]) {
    setLoadingComparison(true);
    setComparisonError(null);

    try {
      const universityId = getGlobalUniversityId() ?? 1;
      const result = await fetchMajorComparison({ majorIds, universityId });

      if (result.success && result.comparisons) {
        setComparisonData(result.comparisons);
        setSidebarVisible(false); // Hide sidebar when comparison loads
      } else {
        setComparisonError(result.error || 'Failed to compare majors');
      }
    } catch (error) {
      setComparisonError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoadingComparison(false);
    }
  }

  // Show empty state if no courses
  if (courses.length === 0) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-[var(--muted-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-[var(--foreground)] mb-3">No Course History Found</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-8">
            Pathfinder uses your completed coursework to suggest alternative academic and career paths.
            Upload your transcript to get started with personalized recommendations.
          </p>
          <a
            href="/academic-history"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: PATHFINDER_COLORS.major }}
          >
            Upload Transcript
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
  <div className="min-h-[calc(100vh-60px)] flex flex-col px-4 py-6 relative">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-black text-[var(--foreground)]">Pathfinder</h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-3xl">
          Explore alternative academic and career alignments based on your completed coursework. Choose an exploration mode on the right to begin.
        </p>
      </div>
      <div className="flex flex-1 gap-6 flex-col xl:flex-row relative">
        {/* Toggle sidebar button - only show when comparison data exists */}
        {activePanel === 'compare-majors' && comparisonData && (
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="absolute top-2 left-2 z-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={sidebarVisible ? 'Hide completed courses' : 'Show completed courses'}
            type="button"
          >
            <svg
              className={`w-5 h-5 text-gray-700 dark:text-gray-200 transition-transform ${sidebarVisible ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Left: Course history - conditionally shown */}
        {sidebarVisible && (
          <div className="xl:w-2/5 w-full h-[420px] xl:h-auto">
            <CourseHistoryList
              courses={courses}
              onSelectCourse={(c) => { setSelectedCourse(c.id); setLastAction(`Selected course ${c.code}`); }}
            />
          </div>
        )}

        {/* Right: Pivot options */}
        <div className={`flex flex-col gap-4 transition-all ${sidebarVisible ? 'flex-1' : 'w-full'}`}>
          {!activePanel && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <PivotOptionsPanel
                options={pivotOptions}
                onSelectOption={(opt) => {
                  setLastAction(`Chose option: ${opt.title}`);
                  if (opt.id === 'major-pivot') setActivePanel('major-pivot');
                  if (opt.id === 'minor-pivot') setActivePanel('adjacent-career');
                  if (opt.id === 'minor-audit') { setActivePanel('minor-audit'); void loadMinorAudit(); }
                  if (opt.id === 'compare-majors') { void handleCompareMajorsClick(); }
                }}
              />
            </div>
          )}

          {/* Quick navigation (when an option is active) */}
          {activePanel && (
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] backdrop-blur p-3 shadow-sm">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[var(--muted-foreground)] mr-1">
                  Switch to:
                </span>
                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                  {pivotOptions
                  .filter(opt => {
                    if (activePanel === 'major-pivot') return opt.id !== 'major-pivot';
                    if (activePanel === 'adjacent-career') return opt.id !== 'minor-pivot';
                    if (activePanel === 'minor-audit') return opt.id !== 'minor-audit';
                    if (activePanel === 'compare-majors') return opt.id !== 'compare-majors';
                    return true;
                  })
                  .map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLastAction(`Chose option: ${opt.title}`);
                        if (opt.id === 'major-pivot') setActivePanel('major-pivot');
                        if (opt.id === 'minor-pivot') setActivePanel('adjacent-career');
                        if (opt.id === 'minor-audit') { setActivePanel('minor-audit'); void loadMinorAudit(); }
                        if (opt.id === 'compare-majors') { void handleCompareMajorsClick(); }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-md border bg-[color-mix(in_srgb,var(--muted)_22%,transparent)] px-2 py-1 text-[11px] font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_35%,transparent)] ${getPivotOptionAccent(opt.id).border} ${getPivotOptionAccent(opt.id).hoverBg}`}
                    >
                      <span className="shrink-0 text-[14px] leading-none">{getPivotOptionIcon(opt.id)}</span>
                      <span className="truncate max-w-[8.5rem]">{opt.title}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
                    </button>
                  ))}

                  <div className="flex-1" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Keep existing behavior: return to initial screen.
                    // Also preserve panel-specific close behavior where it exists.
                    if (activePanel === 'minor-audit') {
                      setMinorAuditMinors(null);
                      setMinorAuditMessage(null);
                      setMinorAuditError(null);
                    }
                    setActivePanel(null);
                  }}
                  className="inline-flex items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--muted)_18%,transparent)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--muted)_28%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_35%,transparent)] shrink-0"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {activePanel === 'minor-audit' && (
            <div
              className="rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: `color-mix(in srgb, ${PATHFINDER_COLORS.minor} 30%, var(--border))`,
                borderLeftWidth: '4px',
                borderLeftColor: PATHFINDER_COLORS.minor,
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wide">Near-Completion Minor Audit</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-prose">We scan minors and surface those where your completed courses already satisfy a meaningful portion of requirements.</p>
                </div>
                <button
                  onClick={() => { setActivePanel(null); setMinorAuditMinors(null); setMinorAuditMessage(null); setMinorAuditError(null); }}
                  className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  type="button"
                >Close</button>
              </div>
              {minorAuditLoading && (
                <div className="py-6">
                  <StuLoader variant="inline" text="Analyzing overlaps across minors..." />
                </div>
              )}
              {minorAuditError && (
                <div
                  className="mt-4 text-xs rounded-xl p-4 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, #ef4444 8%, var(--background))`,
                    borderColor: `color-mix(in srgb, #ef4444 30%, var(--border))`,
                    color: 'var(--foreground)',
                  }}
                >
                  {minorAuditError}
                  <button
                    type="button"
                    className="ml-3 underline font-semibold"
                    onClick={() => { void loadMinorAudit(); }}
                  >Retry</button>
                </div>
              )}
              {!minorAuditLoading && !minorAuditError && minorAuditMinors && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Potential Minors</h3>
                    {minorAuditMessage && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{minorAuditMessage}</p>}
                  </div>
                  {minorAuditMinors.length === 0 && (
                    <div
                      className="text-[11px] rounded-xl p-4 border"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--muted) 30%, var(--background))`,
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      No minors appear close to completion with current course list.
                    </div>
                  )}
                  {minorAuditMinors.length > 0 && (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                      {minorAuditMinors.map(m => (
                        <div key={m.id}>
                          <ProgramOverlapPanel
                            major={minorDetailsByName[m.name]
                              ? { id: minorDetailsByName[m.name].id, name: minorDetailsByName[m.name].name, requirements: minorDetailsByName[m.name].requirements }
                              : { id: m.id, name: m.name, requirements: {} }}
                            completedCourses={courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, term: c.term, grade: c.grade, tags: c.tags }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setActivePanel(null); }}
                      className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                      }}
                    >Close</button>
                    <button
                      type="button"
                      onClick={() => { setMinorAuditLoading(true); void loadMinorAudit(); }}
                      className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors"
                      style={{
                        borderColor: PATHFINDER_COLORS.minor,
                        backgroundColor: PATHFINDER_COLORS.minor,
                      }}
                    >Rescan</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activePanel === 'major-pivot' && (
            <div
              className="rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: `color-mix(in srgb, ${PATHFINDER_COLORS.major} 30%, var(--border))`,
                borderLeftWidth: '4px',
                borderLeftColor: PATHFINDER_COLORS.major,
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wide">Major Pivot Exploration</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-prose">Tell us a bit about your experience so far so we can surface aligned pivot directions.</p>
                </div>
                <button
                  onClick={() => { setActivePanel(null); setLastAction('Closed major pivot form'); }}
                  className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  type="button"
                >
                  Close
                </button>
              </div>
              {!careerOptions && (
                <MajorPivotForm
                  currentMajor={currentMajor}
                  onSubmit={handleMajorPivotSubmit}
                  onCancel={() => { setActivePanel(null); setLastAction('Canceled major pivot form'); }}
                />
              )}
              {loadingSuggestions && (
                <div className="py-6">
                  <StuLoader variant="inline" text="Generating personalized career directions..." />
                </div>
              )}
              {suggestionError && (
                <div
                  className="mt-4 text-xs rounded-xl p-4 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, #ef4444 8%, var(--background))`,
                    borderColor: `color-mix(in srgb, #ef4444 30%, var(--border))`,
                    color: 'var(--foreground)',
                  }}
                >
                  {suggestionError}
                  <button
                    type="button"
                    className="ml-3 underline font-semibold"
                    onClick={() => {
                      setCareerOptions(null); setSuggestionError(null);
                    }}
                  >Clear</button>
                </div>
              )}
              {careerOptions && !loadingSuggestions && !selectedCareer && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Suggested Directions</h3>
                    {careerMessage && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{careerMessage}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {careerOptions.map(opt => {
                      const isClicked = clickedCareerId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-label={`Select career direction ${opt.title}`}
                          onClick={() => handleCareerClick(opt.id)}
                          className="relative text-left rounded-xl border transition p-4 group shadow-sm cursor-pointer"
                          style={{
                            backgroundColor: isClicked
                              ? `color-mix(in srgb, ${PATHFINDER_COLORS.major} 15%, var(--background))`
                              : 'var(--background)',
                            borderColor: isClicked
                              ? PATHFINDER_COLORS.major
                              : `color-mix(in srgb, ${PATHFINDER_COLORS.major} 30%, var(--border))`,
                            boxShadow: isClicked ? `0 0 0 2px ${PATHFINDER_COLORS.major}40` : undefined,
                          }}
                        >
                          <div className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                            {opt.title}
                            {isClicked && (
                              <span
                                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${PATHFINDER_COLORS.major} 20%, transparent)`,
                                  color: 'var(--foreground)',
                                }}
                              >
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)] line-clamp-3">{opt.rationale}</p>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handleNoneOfThese({
                        whyMajor: '', notWorking: '', partsLiked: '', wantCareerHelp: true, consideredCareer: ''
                      })}
                      className="text-left rounded-xl border transition p-4 shadow-sm"
                      style={{
                        backgroundColor: 'var(--background)',
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                      }}
                    >
                      <div className="font-semibold text-sm text-[var(--foreground)]">None of these</div>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Show {retryCount === 0 ? 'different options' : 'an advisor instead'}</p>
                    </button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {selectedCareer && (
                <div className="space-y-5 mt-6">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Aligned Majors</h3>
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Career focus: <span className="font-semibold text-[var(--foreground)]">{selectedCareer.title}</span></p>
                    {majorMessage && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{majorMessage}</p>}
                  </div>
                  {loadingMajors && (
                    <div className="py-4">
                      <StuLoader variant="inline" text="Analyzing your coursework & motivations to propose relevant majors..." />
                    </div>
                  )}
                  {!loadingMajors && majorOptions && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {majorOptions.map(m => (
                        <button
                          key={m.code}
                          onClick={() => handleMajorSelection(m.code)}
                          className="text-left rounded-xl border transition p-4 group shadow-sm"
                          style={{
                            backgroundColor: 'var(--background)',
                            borderColor: `color-mix(in srgb, ${PATHFINDER_COLORS.major} 30%, var(--border))`,
                          }}
                        >
                          <div className="font-semibold text-sm text-[var(--foreground)]">{m.name}</div>
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)] line-clamp-3">{m.rationale}</p>
                        </button>
                      ))}
                      <button
                        onClick={() => { setSelectedCareer(null); setMajorOptions(null); setMajorMessage(null); }}
                        className="text-left rounded-xl border transition p-4 shadow-sm"
                        style={{
                          backgroundColor: 'var(--background)',
                          borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                        }}
                      >
                        <div className="font-semibold text-sm text-[var(--foreground)]">Back to careers</div>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Choose a different career direction</p>
                      </button>
                    </div>
                  )}
                  {suggestionError && !loadingMajors && (
                    <div
                      className="text-xs rounded-xl p-4 border"
                      style={{
                        backgroundColor: `color-mix(in srgb, #ef4444 8%, var(--background))`,
                        borderColor: `color-mix(in srgb, #ef4444 30%, var(--border))`,
                        color: 'var(--foreground)',
                      }}
                    >
                      {suggestionError}
                      <button
                        type="button"
                        className="ml-3 underline font-semibold"
                        onClick={() => { if (selectedCareer) handleCareerClick(selectedCareer.id); }}
                      >Retry</button>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setActivePanel(null); setSelectedCareer(null); setMajorOptions(null); }}
                      className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activePanel === 'compare-majors' && (
            <div
              className="rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: `color-mix(in srgb, ${PATHFINDER_COLORS.comparison} 30%, var(--border))`,
                borderLeftWidth: '4px',
                borderLeftColor: PATHFINDER_COLORS.comparison,
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wide">Compare Majors</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-prose">
                    Select 2-4 majors to see a side-by-side comparison of your progress.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActivePanel(null);
                    setComparisonData(null);
                    setComparisonError(null);
                    setMajorsCatalog(null);
                    setSidebarVisible(true); // Reset sidebar visibility when closing
                  }}
                  className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  type="button"
                >
                  Close
                </button>
              </div>

              {!comparisonData && (
                <MajorComparisonSelector
                  majors={majorsCatalog || []}
                  onCompare={handleCompareSubmit}
                  onCancel={() => setActivePanel(null)}
                  loading={loadingComparison}
                />
              )}

              <MajorComparisonView
                comparisons={comparisonData || []}
                loading={loadingComparison}
                error={comparisonError}
                onRetry={() => {
                  setComparisonData(null);
                  setComparisonError(null);
                  setSidebarVisible(true);
                }}
              />
            </div>
          )}
          {activePanel === 'adjacent-career' && (
            <div
              className="rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: 'var(--background)',
                borderColor: `color-mix(in srgb, ${PATHFINDER_COLORS.career} 30%, var(--border))`,
                borderLeftWidth: '4px',
                borderLeftColor: PATHFINDER_COLORS.career,
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-wide">Adjacent Career Exploration</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-prose">Tell us what energizes you in your current major and an industry you&apos;re curious about. We&apos;ll surface adjacent roles that may leverage your existing coursework with minimal extra lift.</p>
                </div>
                <button
                  onClick={() => { setActivePanel(null); setLastAction('Closed adjacent career form'); }}
                  className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
                  type="button"
                >Close</button>
              </div>
              {!adjacentOptions && !loadingAdjacent && (
                <AdjacentCareerForm
                  currentMajor={currentMajor}
                  onSubmit={(vals) => {
                    adjacentFormRef.current = vals;
                    void (async () => {
                      setLoadingAdjacent(true);
                      setAdjacentError(null);
                      try {
                        const res = await fetchAdjacentCareerSuggestions({
                          currentMajor,
                          whyLikeMajor: vals.whyLikeMajor,
                          targetIndustry: vals.targetIndustry,
                          completedCourses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, grade: c.grade, tags: c.tags }))
                        });
                        if (!res.success || !res.options) {
                          setAdjacentError(res.message || 'Failed to load adjacent careers');
                          return;
                        }
                        setAdjacentOptions(res.options);
                        setAdjacentMessage(res.message);
                      } catch (error) {
                        setAdjacentError(error instanceof Error ? error.message : 'Unknown error fetching adjacent careers');
                      } finally {
                        setLoadingAdjacent(false);
                      }
                    })();
                  }}
                  onCancel={() => { setActivePanel(null); setLastAction('Canceled adjacent career form'); }}
                />
              )}
              {loadingAdjacent && (
                <div className="py-6">
                  <StuLoader variant="inline" text="Generating adjacent roles..." />
                </div>
              )}
              {adjacentError && (
                <div
                  className="mt-4 text-xs rounded-xl p-4 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, #ef4444 8%, var(--background))`,
                    borderColor: `color-mix(in srgb, #ef4444 30%, var(--border))`,
                    color: 'var(--foreground)',
                  }}
                >
                  {adjacentError}
                  <button
                    type="button"
                    className="ml-3 underline font-semibold"
                    onClick={() => { setAdjacentError(null); setAdjacentOptions(null); setLoadingAdjacent(false); }}
                  >Clear</button>
                </div>
              )}
              {adjacentOptions && !loadingAdjacent && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--foreground)] tracking-wide uppercase">Suggested Adjacent Roles</h3>
                    {adjacentMessage && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{adjacentMessage}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {adjacentOptions.map(opt => {
                      const isClicked = clickedAdjacentId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-label={`Select adjacent career ${opt.title}`}
                          onClick={async () => {
                            setClickedAdjacentId(opt.id);
                            setLoadingCareer(true);
                            try {
                              const careerData = await fetchOrCreateCareer(opt.title, opt.id, opt.rationale);
                              if (careerData) {
                                setActiveCareerModal(careerData);
                              }
                            } finally {
                              setLoadingCareer(false);
                            }
                          }}
                          className="text-left rounded-xl border p-4 shadow-sm transition cursor-pointer"
                          style={{
                            backgroundColor: isClicked
                              ? `color-mix(in srgb, ${PATHFINDER_COLORS.career} 15%, var(--background))`
                              : 'var(--background)',
                            borderColor: isClicked
                              ? PATHFINDER_COLORS.career
                              : `color-mix(in srgb, ${PATHFINDER_COLORS.career} 30%, var(--border))`,
                            boxShadow: isClicked ? `0 0 0 2px ${PATHFINDER_COLORS.career}40` : undefined,
                          }}
                        >
                          <div className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                            {opt.title}
                            {isClicked && (
                              <span
                                className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${PATHFINDER_COLORS.career} 20%, transparent)`,
                                  color: 'var(--foreground)',
                                }}
                              >
                                Viewed
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)] line-clamp-3">{opt.rationale}</p>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        if (adjacentRetryCount >= 1 || !adjacentFormRef.current) {
                          setActivePanel(null);
                          return;
                        }
                        void (async () => {
                          setLoadingAdjacent(true);
                          try {
                            const res = await fetchAdjacentCareerSuggestions({
                              currentMajor,
                              whyLikeMajor: adjacentFormRef.current!.whyLikeMajor,
                              targetIndustry: adjacentFormRef.current!.targetIndustry,
                              completedCourses: courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, grade: c.grade, tags: c.tags })),
                            });
                            if (res.success && res.options) {
                              setAdjacentOptions(res.options);
                              setAdjacentMessage(res.message);
                              setAdjacentRetryCount(r => r + 1);
                            } else {
                              setAdjacentError(res.message || 'Failed to load adjacent careers');
                            }
                          } catch (error) {
                            setAdjacentError(error instanceof Error ? error.message : 'Unknown error fetching adjacent careers');
                          } finally {
                            setLoadingAdjacent(false);
                          }
                        })();
                      }}
                      className="text-left rounded-xl border transition p-4 shadow-sm"
                      style={{
                        backgroundColor: 'var(--background)',
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                      }}
                      type="button"
                    >
                      <div className="font-semibold text-sm text-[var(--foreground)]">{adjacentRetryCount === 0 ? 'Show different options' : 'Close exploration'}</div>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{adjacentRetryCount === 0 ? 'Refresh with different adjacent roles' : 'Return to exploration modes'}</p>
                    </button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setActivePanel(null); setAdjacentOptions(null); setAdjacentMessage(null); setAdjacentRetryCount(0); }}
                      className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: `color-mix(in srgb, var(--border) 60%, transparent)`,
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                      }}
                    >Close</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {(selectedCourse || lastAction) && (
            <div className="mt-2 text-xs text-[var(--muted-foreground)]">
              {selectedCourse && <span className="mr-3">Focused Course ID: {selectedCourse}</span>}
              {lastAction && <span>{lastAction}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </div>
    <MajorOverlapDialog
      open={overlapOpen}
      onClose={() => setOverlapOpen(false)}
      major={overlapProgram}
      completedCourses={courses.map(c => ({ code: c.code, title: c.title, credits: c.credits, term: c.term, grade: c.grade, tags: c.tags }))}
    />
    {loadingCareer && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[var(--background)] rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border border-[color-mix(in_srgb,var(--border)_60%,transparent)]">
          <div className="mb-6 flex justify-center">
            <StuLoader variant="card" text={careerLoadingMessages[careerLoadingMessageIndex].subtitle} />
          </div>
        </div>
      </div>
    )}
    {loadingMajor && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[var(--background)] rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border border-[color-mix(in_srgb,var(--border)_60%,transparent)]">
          <div className="mb-6 flex justify-center">
            <StuLoader variant="card" text={majorLoadingMessages[majorLoadingMessageIndex].subtitle} />
          </div>
        </div>
      </div>
    )}
    {activeCareerModal && (
      <CareerInfoModal
        open={!!activeCareerModal}
        career={activeCareerModal}
        onClose={() => {
          const careerId = activeCareerModal.id;
          const careerTitle = activeCareerModal.title;
          setActiveCareerModal(null);

          if (careerOptions && careerOptions.some(c => c.id === careerId)) {
            handleCareerModalProceed(careerTitle, careerId);
          } else if (adjacentOptions && adjacentOptions.some(c => c.id === careerId)) {
            void (async () => {
              const res = await saveTargetedCareerClient(careerTitle);
              if (res.success) {
                toast({ title: 'Career saved!' });
              } else if (res.error && res.error !== 'Not authenticated') {
                toast({ title: 'Could not save career', description: res.error, variant: 'destructive' });
              }
            })();
          }
        }}
        isAdvisor={false}
      />
    )}
    {activeMajorModal && (
      <MajorInfoModal
        open={!!activeMajorModal}
        major={activeMajorModal}
        completedCourses={courses}
        onClose={() => {
          setActiveMajorModal(null);
        }}
        isAdvisor={false}
      />
    )}
    </>
  );
}