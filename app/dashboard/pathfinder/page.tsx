"use client";
import * as React from 'react';
import { CourseHistoryList, PivotOptionsPanel, useDefaultPivotOptions, MajorPivotForm, MajorPivotFormValues } from '@/components/pathfinder';
import { fetchMajorPivotSuggestions, fetchMajorsForCareerSelection, fetchAdjacentCareerSuggestions, fetchNearCompletionMinorAudit, fetchMinorsCatalog, enrichCareerData, enrichMajorData } from './actions';
import { saveTargetedCareerClient } from '@/lib/services/profileService';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/ui/toast';
import AdjacentCareerForm, { AdjacentCareerFormValues } from '@/components/pathfinder/adjacent-career-form';
import MajorOverlapDialog from '@/components/pathfinder/program-overlap-dialog';
import { fetchMajorByName, fetchMinorByName } from './major-actions';
import { useRouter } from 'next/navigation';
import CareerInfoModal from '@/components/pathfinder/CareerInfoModal';
import type { Career } from '@/types/career';
import MajorInfoModal from '@/components/pathfinder/MajorInfoModal';
import type { MajorInfo } from '@/types/major';

export default function PathfinderPage() {
  // Fake course history data (replace with real query later)
  const courses = React.useMemo(() => ([
    { id: '1', code: 'IS 110', title: 'Intro to Programming', credits: 3, term: 'Fall 2023', grade: 'A', tags: ['Major Core'] },
    { id: '2', code: 'ACC 200', title: 'Calculus I', credits: 4, term: 'Fall 2023', grade: 'B+', tags: ['Math', 'GenEd'] },
    { id: '3', code: 'ENG 110', title: 'College Writing', credits: 3, term: 'Fall 2023', grade: 'A-', tags: ['GenEd'] },
    { id: '4', code: 'CS 142', title: 'Data Structures & Algorithms', credits: 3, term: 'Winter 2024', grade: 'A', tags: ['Major Core'] },
    { id: '5', code: 'STAT 221', title: 'Intro to Statistics', credits: 3, term: 'Winter 2024', grade: 'A-', tags: ['Major Elective'] },
    { id: '6', code: 'HIST 201', title: 'World Civilizations', credits: 3, term: 'Winter 2024', grade: 'B', tags: ['GenEd', 'Humanities'] },
    { id: '7', code: 'CS 260', title: 'Computer Architecture', credits: 3, term: 'Fall 2024', grade: 'In Progress', tags: ['Major Core'] },
    { id: '8', code: 'PHYS 121', title: 'Physics I', credits: 4, term: 'Fall 2024', grade: 'In Progress', tags: ['Science'] },
    { id: '9', code: 'ART 101', title: 'Foundations of Art', credits: 2, term: 'Fall 2024', grade: 'In Progress', tags: ['Arts', 'GenEd'] },
  ]), []);

  const pivotOptions = useDefaultPivotOptions();
  const [selectedCourse, setSelectedCourse] = React.useState<string | null>(null);
  const [lastAction, setLastAction] = React.useState<string | null>(null);
  const [activePanel, setActivePanel] = React.useState<string | null>(null);
  const [careerOptions, setCareerOptions] = React.useState<Array<{ id: string; title: string; rationale: string }> | null>(null);
  const [careerMessage, setCareerMessage] = React.useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [suggestionError, setSuggestionError] = React.useState<string | null>(null);
  const [priorIds, setPriorIds] = React.useState<string[]>([]);
  const [retryCount, setRetryCount] = React.useState(0);
  // Debug / UX: track last clicked career id to verify click handler fires
  const [clickedCareerId, setClickedCareerId] = React.useState<string | null>(null);
  // Adjacent career exploration state
  const [adjacentOptions, setAdjacentOptions] = React.useState<Array<{ id: string; title: string; rationale: string }> | null>(null);
  const [adjacentMessage, setAdjacentMessage] = React.useState<string | null>(null);
  const [loadingAdjacent, setLoadingAdjacent] = React.useState(false);
  const [adjacentError, setAdjacentError] = React.useState<string | null>(null);
  // NOTE: prior id tracking for adjacent careers can be added later if we want novelty across multiple retries
  const [adjacentRetryCount, setAdjacentRetryCount] = React.useState(0);
  const [clickedAdjacentId, setClickedAdjacentId] = React.useState<string | null>(null);
  const adjacentFormRef = React.useRef<AdjacentCareerFormValues | null>(null);
  // Stage 2 (majors) state
  const [selectedCareer, setSelectedCareer] = React.useState<{ id: string; title: string } | null>(null);
  const [majorOptions, setMajorOptions] = React.useState<Array<{ code: string; name: string; rationale: string }> | null>(null);
  const [majorMessage, setMajorMessage] = React.useState<string | null>(null);
  const [loadingMajors, setLoadingMajors] = React.useState(false);
  const retainedFormRef = React.useRef<MajorPivotFormValues | null>(null);
  const [overlapOpen, setOverlapOpen] = React.useState(false);
  interface OverlapProgram { id: number | string; name: string; requirements: unknown; kind?: 'major' | 'minor'; }
  const [overlapProgram, setOverlapProgram] = React.useState<OverlapProgram | null>(null);
  // Minor audit state
  const [minorAuditLoading, setMinorAuditLoading] = React.useState(false);
  const [minorAuditError, setMinorAuditError] = React.useState<string | null>(null);
  const [minorAuditMinors, setMinorAuditMinors] = React.useState<Array<{ id: string; name: string; reason: string }> | null>(null);
  const [minorAuditMessage, setMinorAuditMessage] = React.useState<string | null>(null);
  const [minorCatalog, setMinorCatalog] = React.useState<Array<{ id: number | string; name: string; requirements: unknown }> | null>(null);
  const router = useRouter();
  const { toast, toasts, dismiss } = useToast();
  // Career info modal state
  const [activeCareerModal, setActiveCareerModal] = React.useState<Career | null>(null);
  const [loadingCareer, setLoadingCareer] = React.useState(false);
  const [careerLoadingMessageIndex, setCareerLoadingMessageIndex] = React.useState(0);
  // Major info modal state
  const [activeMajorModal, setActiveMajorModal] = React.useState<MajorInfo | null>(null);
  const [loadingMajor, setLoadingMajor] = React.useState(false);
  const [majorLoadingMessageIndex, setMajorLoadingMessageIndex] = React.useState(0);
  // NOTE: placeholder; will be replaced with real profile major value pulled from user profile context/server
  const currentMajor = 'Computer Science';

  // Career loading messages
  const careerLoadingMessages = [
    { title: 'Gathering Career Info', subtitle: 'Compiling comprehensive career data, salary insights, and job outlook...' },
    { title: 'Analyzing Job Market', subtitle: 'Reviewing current employment trends and industry demand...' },
    { title: 'Compiling Salary Data', subtitle: 'Gathering salary ranges from entry-level to senior positions...' },
    { title: 'Finding Skills & Requirements', subtitle: 'Identifying key skills and qualifications for this career...' },
    { title: 'Exploring Career Pathways', subtitle: 'Mapping out typical career progression and opportunities...' },
    { title: 'Almost Ready', subtitle: 'Finalizing your personalized career insights...' },
  ];

  // Major loading messages
  const majorLoadingMessages = [
    { title: 'Gathering Major Info', subtitle: 'Compiling program details, course requirements, and career pathways...' },
    { title: 'Reviewing Curriculum', subtitle: 'Analyzing core courses, electives, and degree requirements...' },
    { title: 'Finding Course Equivalencies', subtitle: 'Identifying cross-listed courses and transfer options...' },
    { title: 'Exploring Career Options', subtitle: 'Discovering careers this major commonly leads to...' },
    { title: 'Compiling Opportunities', subtitle: 'Gathering internship, research, and study abroad options...' },
    { title: 'Almost Ready', subtitle: 'Finalizing your personalized program insights...' },
  ];

  // Rotate career loading messages every 5 seconds
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

  // Rotate major loading messages every 5 seconds
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

  // Helper to fetch career data with advisor override logic
  // Priority order: 1) Advisor-edited DB data, 2) AI-enriched data, 3) Minimal fallback
  async function fetchOrCreateCareer(careerTitle: string, slug: string, rationale?: string): Promise<Career | null> {
    try {
      // STEP 1: Check if advisor has created/edited this career in the database
      // This takes highest priority - advisor data overrides AI
      const response = await fetch(`/api/careers/${slug}`);
      if (response.ok) {
        const json = await response.json();
        // If we found it in DB, use it directly (advisor-curated data wins)
        return json.career;
      }
    } catch (e) {
      console.warn('Failed to fetch career from database:', e);
    }

    // STEP 2: Not in database, so enrich with AI-generated comprehensive data
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

    // STEP 3: Fallback to minimal Career object if AI enrichment fails
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

  // Helper to fetch major data with advisor override logic
  // Priority order: 1) Advisor-edited DB data, 2) AI-enriched data, 3) Minimal fallback
  async function fetchOrCreateMajor(majorName: string, code: string, rationale?: string): Promise<MajorInfo | null> {
    const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // STEP 1: Check if advisor has created/edited this major in the database
    // TODO: Create /api/majors/[slug] endpoint similar to careers
    // For now, skip DB check and go straight to AI enrichment

    // STEP 2: Enrich with AI-generated comprehensive data
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
        universityName: 'Your University' // TODO: Replace with actual university name from context
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

    // STEP 3: Fallback to minimal MajorInfo object if AI enrichment fails
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
    retainedFormRef.current = values; // persist for majors stage
    if (values.wantCareerHelp) {
      void loadCareerSuggestions(values, false);
      return;
    }
    // Skip career suggestion stage: treat consideredCareer as selected career and fetch majors directly
    const careerTitle = values.consideredCareer.trim();
    if (!careerTitle) {
      // Should be validated already, but guard anyway
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
            universityId: (globalThis as any).__UNIVERSITY_ID__ || 1,
        });
        if (!result.success || !result.majors) {
          setSuggestionError(result.message || 'Failed to load majors');
          return;
        }
        setMajorOptions(result.majors);
        setMajorMessage(result.message);
      } catch (e) {
        setSuggestionError(e instanceof Error ? e.message : 'Unknown error fetching majors');
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
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : 'Unknown error fetching suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleCareerClick(id: string) {
    if (!careerOptions) return;
    const chosen = careerOptions.find(c => c.id === id);
    if (!chosen) return;
    // debug marker
    setClickedCareerId(id);
    // eslint-disable-next-line no-console
    console.log('[Pathfinder] Career clicked:', id, chosen.title);

    // Show loading state
    setLoadingCareer(true);

    try {
      // Fetch or create career data for the modal, using the AI-generated rationale as overview
      const careerData = await fetchOrCreateCareer(chosen.title, chosen.id, chosen.rationale);
      if (careerData) {
        setActiveCareerModal(careerData);
      }
    } finally {
      setLoadingCareer(false);
    }
  }

  // Called when user closes the career modal and wants to proceed with major selection
  async function handleCareerModalProceed(careerTitle: string, careerId: string) {
    setActiveCareerModal(null);
    setSelectedCareer({ id: careerId, title: careerTitle });

    // Persist targeted career asynchronously
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
      // fallback: cannot proceed without original context
      router.push('/dashboard/grad-plan');
      return;
    }
    setLoadingMajors(true);
    try {
      // Derive a university id (placeholder until integrated with real profile context). If none, omit to allow broader model reasoning.
      const derivedUniversityId: number | undefined = (globalThis as any).__UNIVERSITY_ID__ || undefined;
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
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : 'Unknown error fetching majors');
    } finally {
      setLoadingMajors(false);
    }
  }

  async function handleMajorSelection(code: string) {
    // find the selected major option by code (code is slug; we need display name)
    const chosen = majorOptions?.find(m => m.code === code);
    if (!chosen) return;

    // Show loading state
    setLoadingMajor(true);

    try {
      // Fetch or create comprehensive major info with AI enrichment
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
      router.push('/dashboard/meet-with-advisor');
      return;
    }
    void loadCareerSuggestions(formValues, true);
  }

  async function handleMinorClick(minorName: string) {
    try {
      const res = await fetchMinorByName(1, minorName);
      if (res.success && res.minor) {
        setOverlapProgram({ id: res.minor.id, name: res.minor.name, requirements: res.minor.requirements, kind: 'minor' });
      } else {
        setOverlapProgram({ id: 'unknown', name: minorName, requirements: {}, kind: 'minor' });
      }
    } catch {
      setOverlapProgram({ id: 'unknown', name: minorName, requirements: {}, kind: 'minor' });
    } finally {
      setOverlapOpen(true);
    }
  }

  async function loadMinorAudit() {
    setMinorAuditLoading(true);
    setMinorAuditError(null);
    try {
      // Lazy-load minor catalog if absent
      let catalog = minorCatalog;
      if (!catalog) {
        catalog = await fetchMinorsCatalog(1); // placeholder university id
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
    } catch (e) {
      setMinorAuditError(e instanceof Error ? e.message : 'Unknown error auditing minors');
    } finally {
      setMinorAuditLoading(false);
    }
  }

  return (
    <>
  <div className="min-h-[calc(100vh-60px)] flex flex-col px-4 py-6 relative">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-800">Pathfinder</h1>
        <p className="text-sm text-gray-600 max-w-3xl">
          Explore alternative academic and career alignments based on your completed coursework. Choose an exploration mode on the right to begin.
        </p>
      </div>
      <div className="flex flex-1 gap-6 flex-col xl:flex-row">
        {/* Left: Course history */}
        <div className="xl:w-2/5 w-full h-[420px] xl:h-auto">
          <CourseHistoryList
            courses={courses}
            onSelectCourse={(c) => { setSelectedCourse(c.id); setLastAction(`Selected course ${c.code}`); }}
          />
        </div>
        {/* Right: Pivot options */}
        <div className="flex-1 flex flex-col gap-4">
          {!activePanel && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              <PivotOptionsPanel
                options={pivotOptions}
                onSelectOption={(opt) => {
                  setLastAction(`Chose option: ${opt.title}`);
                  if (opt.id === 'major-pivot') setActivePanel('major-pivot');
                  if (opt.id === 'minor-pivot') setActivePanel('adjacent-career');
                  if (opt.id === 'minor-audit') { setActivePanel('minor-audit'); void loadMinorAudit(); }
                }}
              />
            </div>
          )}
          {activePanel === 'minor-audit' && (
            <div className="rounded-lg border border-emerald-200 bg-white/70 backdrop-blur p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-emerald-800">Near-Completion Minor Audit</h2>
                  <p className="text-xs text-gray-600 mt-1 max-w-prose">We scan minors and surface those where your completed courses already satisfy a meaningful portion of requirements.</p>
                </div>
                <button
                  onClick={() => { setActivePanel(null); setMinorAuditMinors(null); setMinorAuditMessage(null); setMinorAuditError(null); }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition"
                  type="button"
                >Close</button>
              </div>
              {minorAuditLoading && (
                <div className="py-6 text-sm text-gray-500">Analyzing overlaps across minors…</div>
              )}
              {minorAuditError && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {minorAuditError}
                  <button
                    type="button"
                    className="ml-3 underline text-red-700"
                    onClick={() => { void loadMinorAudit(); }}
                  >Retry</button>
                </div>
              )}
              {!minorAuditLoading && !minorAuditError && minorAuditMinors && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">Potential Minors</h3>
                    {minorAuditMessage && <p className="mt-1 text-[11px] text-gray-600">{minorAuditMessage}</p>}
                  </div>
                  {minorAuditMinors.length === 0 && (
                    <div className="text-[11px] text-gray-500 border rounded p-3 bg-gray-50">No minors appear close to completion with current course list.</div>
                  )}
                  {minorAuditMinors.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {minorAuditMinors.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleMinorClick(m.name)}
                          className="text-left rounded border border-emerald-200 bg-white/80 hover:bg-emerald-50 transition p-3 group shadow-sm"
                        >
                          <div className="font-medium text-sm text-emerald-800 group-hover:text-emerald-900 flex items-center gap-2">
                            {m.name}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-600 line-clamp-3">{m.reason}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setActivePanel(null); }}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >Close</button>
                    <button
                      type="button"
                      onClick={() => { setMinorAuditLoading(true); void loadMinorAudit(); }}
                      className="inline-flex items-center justify-center rounded border border-emerald-300 bg-emerald-600/90 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >Rescan</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activePanel === 'major-pivot' && (
            <div className="rounded-lg border border-emerald-200 bg-white/70 backdrop-blur p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-emerald-800">Major Pivot Exploration</h2>
                  <p className="text-xs text-gray-600 mt-1 max-w-prose">Tell us a bit about your experience so far so we can surface aligned pivot directions.</p>
                </div>
                <button
                  onClick={() => { setActivePanel(null); setLastAction('Closed major pivot form'); }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition"
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
                <div className="py-6 text-sm text-gray-500">Generating personalized career directions…</div>
              )}
              {suggestionError && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {suggestionError}
                  <button
                    type="button"
                    className="ml-3 underline text-red-700"
                    onClick={() => {
                      // naive reload: reuse last form by ref not stored; ask user to re-enter for now
                      setCareerOptions(null); setSuggestionError(null);
                    }}
                  >Clear</button>
                </div>
              )}
              {careerOptions && !loadingSuggestions && !selectedCareer && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">Suggested Directions</h3>
                    {careerMessage && <p className="mt-1 text-[11px] text-gray-600">{careerMessage}</p>}
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
                          className={
                            `relative text-left rounded border transition p-3 group shadow-sm cursor-pointer ` +
                            `bg-white/80 hover:bg-emerald-50 border-emerald-200 ` +
                            (isClicked ? 'ring-2 ring-emerald-400 ring-offset-1' : '')
                          }
                        >
                          <div className="font-medium text-sm text-emerald-800 group-hover:text-emerald-900 flex items-center gap-2">
                            {opt.title}
                            {isClicked && <span className="text-[10px] uppercase tracking-wide text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Selected</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-600 line-clamp-3">{opt.rationale}</p>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handleNoneOfThese({
                        whyMajor: '', notWorking: '', partsLiked: '', wantCareerHelp: true, consideredCareer: ''
                      })}
                      className="text-left rounded border border-gray-300 bg-white/80 hover:bg-gray-50 transition p-3 shadow-sm"
                    >
                      <div className="font-medium text-sm text-gray-700">None of these</div>
                      <p className="mt-1 text-[11px] text-gray-500">Show {retryCount === 0 ? 'different options' : 'an advisor instead'}</p>
                    </button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActivePanel(null)}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {selectedCareer && (
                <div className="space-y-5 mt-6">
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">Aligned Majors</h3>
                    <p className="mt-1 text-[11px] text-gray-600">Career focus: <span className="font-medium text-emerald-800">{selectedCareer.title}</span></p>
                    {majorMessage && <p className="mt-1 text-[11px] text-gray-600">{majorMessage}</p>}
                  </div>
                  {loadingMajors && (
                    <div className="py-4 text-sm text-gray-500">Analyzing your coursework & motivations to propose relevant majors…</div>
                  )}
                  {!loadingMajors && majorOptions && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {majorOptions.map(m => (
                        <button
                          key={m.code}
                          onClick={() => handleMajorSelection(m.code)}
                          className="text-left rounded border border-emerald-200 bg-white/80 hover:bg-emerald-50 transition p-3 group shadow-sm"
                        >
                          <div className="font-medium text-sm text-emerald-800 group-hover:text-emerald-900">{m.name}</div>
                          <p className="mt-1 text-[11px] text-gray-600 line-clamp-3">{m.rationale}</p>
                        </button>
                      ))}
                      <button
                        onClick={() => { setSelectedCareer(null); setMajorOptions(null); setMajorMessage(null); }}
                        className="text-left rounded border border-gray-300 bg-white/80 hover:bg-gray-50 transition p-3 shadow-sm"
                      >
                        <div className="font-medium text-sm text-gray-700">Back to careers</div>
                        <p className="mt-1 text-[11px] text-gray-500">Choose a different career direction</p>
                      </button>
                    </div>
                  )}
                  {suggestionError && !loadingMajors && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
                      {suggestionError}
                      <button
                        type="button"
                        className="ml-3 underline text-red-700"
                        onClick={() => { if (selectedCareer) handleCareerClick(selectedCareer.id); }}
                      >Retry</button>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setActivePanel(null); setSelectedCareer(null); setMajorOptions(null); }}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activePanel === 'adjacent-career' && (
            <div className="rounded-lg border border-emerald-200 bg-white/70 backdrop-blur p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-emerald-800">Adjacent Career Exploration</h2>
                  <p className="text-xs text-gray-600 mt-1 max-w-prose">Tell us what energizes you in your current major and an industry you’re curious about. We’ll surface adjacent roles that may leverage your existing coursework with minimal extra lift.</p>
                </div>
                <button
                  onClick={() => { setActivePanel(null); setLastAction('Closed adjacent career form'); }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition"
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
                        // (novelty tracking placeholder)
                      } catch (e) {
                        setAdjacentError(e instanceof Error ? e.message : 'Unknown error fetching adjacent careers');
                      } finally {
                        setLoadingAdjacent(false);
                      }
                    })();
                  }}
                  onCancel={() => { setActivePanel(null); setLastAction('Canceled adjacent career form'); }}
                />
              )}
              {loadingAdjacent && (
                <div className="py-6 text-sm text-gray-500">Generating adjacent roles…</div>
              )}
              {adjacentError && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {adjacentError}
                  <button
                    type="button"
                    className="ml-3 underline text-red-700"
                    onClick={() => { setAdjacentError(null); setAdjacentOptions(null); setLoadingAdjacent(false); }}
                  >Clear</button>
                </div>
              )}
              {adjacentOptions && !loadingAdjacent && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">Suggested Adjacent Roles</h3>
                    {adjacentMessage && <p className="mt-1 text-[11px] text-gray-600">{adjacentMessage}</p>}
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
                              // Fetch or create career data for the modal, using the AI-generated rationale as overview
                              const careerData = await fetchOrCreateCareer(opt.title, opt.id, opt.rationale);
                              if (careerData) {
                                setActiveCareerModal(careerData);
                              }
                            } finally {
                              setLoadingCareer(false);
                            }
                          }}
                          className={
                            `text-left rounded border p-3 shadow-sm transition bg-white/80 hover:bg-emerald-50 border-emerald-200 ` +
                            (isClicked ? 'ring-2 ring-emerald-400 ring-offset-1' : '')
                          }
                        >
                          <div className="font-medium text-sm text-emerald-800 flex items-center gap-2">
                            {opt.title}
                            {isClicked && <span className="text-[10px] uppercase tracking-wide text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Viewed</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-600 line-clamp-3">{opt.rationale}</p>
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
                              // (novelty tracking placeholder)
                            } else {
                              setAdjacentError(res.message || 'Failed to load adjacent careers');
                            }
                          } catch (e) {
                            setAdjacentError(e instanceof Error ? e.message : 'Unknown error fetching adjacent careers');
                          } finally {
                            setLoadingAdjacent(false);
                          }
                        })();
                      }}
                      className="text-left rounded border border-gray-300 bg-white/80 hover:bg-gray-50 transition p-3 shadow-sm"
                      type="button"
                    >
                      <div className="font-medium text-sm text-gray-700">{adjacentRetryCount === 0 ? 'Show different options' : 'Close exploration'}</div>
                      <p className="mt-1 text-[11px] text-gray-500">{adjacentRetryCount === 0 ? 'Refresh with different adjacent roles' : 'Return to exploration modes'}</p>
                    </button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setActivePanel(null); setAdjacentOptions(null); setAdjacentMessage(null); setAdjacentRetryCount(0); }}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    >Close</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Status / selection feedback */}
          {(selectedCourse || lastAction) && (
            <div className="mt-2 text-xs text-gray-500">
              {selectedCourse && <span className="mr-3">Focused Course ID: {selectedCourse}</span>}
              {lastAction && <span>{lastAction}</span>}
            </div>
          )}
        </div>
      </div>
      {/* Toast render container */}
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
    {/* Loading Overlay for Career */}
    {loadingCareer && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 transition-all duration-300">
            {careerLoadingMessages[careerLoadingMessageIndex].title}
          </h3>
          <p className="text-sm text-gray-600 transition-all duration-300">
            {careerLoadingMessages[careerLoadingMessageIndex].subtitle}
          </p>
        </div>
      </div>
    )}
    {/* Loading Overlay for Major */}
    {loadingMajor && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 transition-all duration-300">
            {majorLoadingMessages[majorLoadingMessageIndex].title}
          </h3>
          <p className="text-sm text-gray-600 transition-all duration-300">
            {majorLoadingMessages[majorLoadingMessageIndex].subtitle}
          </p>
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

          // If this was from Major Pivot (wantCareerHelp), proceed to majors stage
          // Otherwise (Adjacent Career), just save the career
          if (careerOptions && careerOptions.some(c => c.id === careerId)) {
            // This is from Major Pivot - proceed to majors
            handleCareerModalProceed(careerTitle, careerId);
          } else if (adjacentOptions && adjacentOptions.some(c => c.id === careerId)) {
            // This is from Adjacent Career - just save
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
          // TODO: Optionally navigate to grad plan or save major selection
        }}
        isAdvisor={false}
      />
    )}
    </>
  );
}
