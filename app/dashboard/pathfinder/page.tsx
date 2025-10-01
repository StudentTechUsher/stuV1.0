"use client";
import * as React from 'react';
import { CourseHistoryList, PivotOptionsPanel, useDefaultPivotOptions, MajorPivotForm, MajorPivotFormValues } from '@/components/pathfinder';
import { fetchMajorPivotSuggestions, fetchMajorsForCareerSelection, fetchAdjacentCareerSuggestions, fetchNearCompletionMinorAudit, fetchMinorsCatalog } from './actions';
import { saveTargetedCareerClient } from '@/lib/services/profileService';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/ui/toast';
import AdjacentCareerForm, { AdjacentCareerFormValues } from '@/components/pathfinder/adjacent-career-form';
import MajorOverlapDialog from '@/components/pathfinder/program-overlap-dialog';
import { fetchMajorByName, fetchMinorByName } from './major-actions';
import { useRouter } from 'next/navigation';

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
  // NOTE: placeholder; will be replaced with real profile major value pulled from user profile context/server
  const currentMajor = 'Computer Science';

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
    setSelectedCareer({ id: chosen.id, title: chosen.title });
    // Persist targeted career asynchronously (fire and forget style with minimal UI impact)
    void (async () => {
      const res = await saveTargetedCareerClient(chosen.title);
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
        selectedCareerId: chosen.id,
        selectedCareerTitle: chosen.title,
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
    try {
      // placeholder university id 1
      const res = await fetchMajorByName(1, chosen.name);
      if (res.success && res.major) {
        setOverlapProgram({ id: res.major.id, name: res.major.name, requirements: res.major.requirements, kind: 'major' });
      } else {
        // fallback: open dialog with no requirements
        setOverlapProgram({ id: 'unknown', name: chosen.name, requirements: {}, kind: 'major' });
      }
      setOverlapOpen(true);
    } finally {
      // no-op
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
                          onClick={() => {
                            setClickedAdjacentId(opt.id);
                            void (async () => {
                              const res = await saveTargetedCareerClient(opt.title);
                              if (res.success) {
                                toast({ title: 'New career target saved!' });
                              } else if (res.error && res.error !== 'Not authenticated') {
                                toast({ title: 'Could not save career', description: res.error, variant: 'destructive' });
                              }
                            })();
                          }}
                          className={
                            `text-left rounded border p-3 shadow-sm transition bg-white/80 hover:bg-emerald-50 border-emerald-200 ` +
                            (isClicked ? 'ring-2 ring-emerald-400 ring-offset-1' : '')
                          }
                        >
                          <div className="font-medium text-sm text-emerald-800 flex items-center gap-2">
                            {opt.title}
                            {isClicked && <span className="text-[10px] uppercase tracking-wide text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Saved</span>}
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
          <div className="mt-auto pt-4 text-[11px] text-gray-400">
            * This is an early prototype. Data is mocked. Future iterations will surface actionable pivots and minor completion audits.
          </div>
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
    </>
  );
}
