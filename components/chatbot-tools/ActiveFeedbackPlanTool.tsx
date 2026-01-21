'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StuLoader } from '@/components/ui/StuLoader';
import type { AcademicTermsConfig, SemesterAllocation } from '@/lib/services/gradPlanGenerationService';
import {
  applyPlanEdit,
  createDraftPlan,
} from '@/lib/grad-plan/activeFeedbackPlanner';
import type {
  DraftTerm,
  DraftPlan,
  PlanEdit,
} from '@/lib/grad-plan/activeFeedbackTypes';

type ActiveFeedbackPhase = 'major_skeleton' | 'gen_ed_fill' | 'elective_balance';
type PlanMilestone = {
  id?: string;
  type?: string;
  title?: string;
  timing?: string;
  afterTerm?: number;
  term?: string;
  year?: number;
};

interface ActiveFeedbackPlanToolProps {
  courseData: unknown;
  suggestedDistribution?: SemesterAllocation[];
  hasTranscript?: boolean;
  academicTerms?: AcademicTermsConfig;
  workStatus?: string;
  milestones?: PlanMilestone[];
  onComplete: (result: { action: 'generate' | 'close'; draftPlan?: DraftPlan }) => void;
}

export default function ActiveFeedbackPlanTool({
  courseData,
  suggestedDistribution,
  hasTranscript,
  academicTerms,
  workStatus,
  milestones,
  onComplete,
}: Readonly<ActiveFeedbackPlanToolProps>) {
  const initialPlan = useMemo(
    () => createDraftPlan({ courseData: [], suggestedDistribution, hasTranscript, academicTerms }),
    [suggestedDistribution, hasTranscript, academicTerms]
  );
  const [draftPlan, setDraftPlan] = useState<DraftPlan>(initialPlan);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [phase, setPhase] = useState<ActiveFeedbackPhase>('major_skeleton');
  const [hasPhaseResult, setHasPhaseResult] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [draftMilestones, setDraftMilestones] = useState<PlanMilestone[]>([]);
  const [completedPhases, setCompletedPhases] = useState<Partial<Record<ActiveFeedbackPhase, boolean>>>({});
  const [globalNotes, setGlobalNotes] = useState<string[]>([]);
  const [globalInput, setGlobalInput] = useState('');
  const [termNotes, setTermNotes] = useState<Record<string, string[]>>({});
  const [termInputs, setTermInputs] = useState<Record<string, string>>({});
  const hasAutoRun = useRef(false);

  useEffect(() => {
    setDraftPlan(initialPlan);
    setDraftMilestones([]);
    setCompletedPhases({});
  }, [initialPlan]);

  if (!courseData) {
    return (
      <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
        <p className="text-sm text-muted-foreground">
          We could not load your course selections yet. Please go back and try again.
        </p>
      </div>
    );
  }

  const handleEdit = (edit: PlanEdit) => {
    const update = applyPlanEdit(draftPlan, edit);
    setDraftPlan(update.plan);
    setStatusMessage(update.explanations?.[0] || update.changes[0] || null);
    setAlternatives(update.alternatives || []);
  };

  const handleAddGlobalNote = () => {
    const trimmed = globalInput.trim();
    if (!trimmed) return;
    setGlobalNotes(prev => [...prev, trimmed]);
    setGlobalInput('');
  };

  const handleAddTermNote = (termId: string) => {
    const inputValue = termInputs[termId]?.trim();
    if (!inputValue) return;
    setTermNotes(prev => ({
      ...prev,
      [termId]: [...(prev[termId] || []), inputValue],
    }));
    setTermInputs(prev => ({ ...prev, [termId]: '' }));
  };

  const handleInsertTermBetween = useCallback((index: number, option: TermInsertOption) => {
    if (!academicTerms) return;
    const newTerm = createDraftTermFromOption(option, draftPlan, academicTerms);
    setDraftPlan(prev => {
      const nextTerms = [...prev.terms];
      nextTerms.splice(index + 1, 0, newTerm);
      return { terms: nextTerms };
    });
    setDraftMilestones(prev => shiftMilestonesAfterInsert(prev, index));
    setStatusMessage(`Added ${option.label} term.`);
  }, [academicTerms, draftPlan]);

  const phaseLabel = getPhaseLabel(phase);
  const nextPhase = getNextPhase(phase);

  const handleRunPhase = useCallback(async () => {
    setStreamError(null);
    setStatusMessage(null);
    setAlternatives([]);
    setIsStreaming(true);

    const inputPayload = buildActiveFeedbackInput({
      courseData,
      suggestedDistribution,
      workStatus,
      draftPlan,
      milestones,
      draftMilestones,
      globalNotes,
      termNotes,
      phase,
    });

    try {
      const response = await fetch('/api/grad-plan/active-feedback/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          promptName: 'active_feedback_mode',
          model: 'gpt-5-mini',
          max_output_tokens: 18_000,
          input: inputPayload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to stream active feedback response');
      }

      if (!response.body) {
        throw new Error('Streaming response not available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;

        const data = trimmed.replace(/^data:\s*/, '');
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed?.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
          }
        } catch {
          // Ignore malformed chunks.
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        lines.forEach(processLine);
      }

      if (buffer.trim()) {
        processLine(buffer);
      }

      if (!fullText.trim()) {
        throw new Error('No content received from AI');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(fullText);
      } catch (error) {
        throw new Error('AI response was not valid JSON');
      }

      const nextPlan = convertPlanToDraftPlan(parsedJson, suggestedDistribution);
      if (!nextPlan?.plan) {
        throw new Error('Unable to interpret the AI draft plan');
      }

      setDraftPlan(nextPlan.plan);
      setDraftMilestones(nextPlan.milestones);
      setTermNotes(prev => remapTermNotes(prev, draftPlan, nextPlan.plan));
      setCompletedPhases(prev => ({ ...prev, [phase]: true }));
      setHasPhaseResult(true);
      setStatusMessage(`Updated draft with ${phaseLabel} results.`);
    } catch (error) {
      console.error('Active feedback stream error:', error);
      setStreamError(error instanceof Error ? error.message : 'Failed to generate draft');
    } finally {
      setIsStreaming(false);
    }
  }, [
    courseData,
    suggestedDistribution,
    workStatus,
    draftPlan,
    milestones,
    draftMilestones,
    phase,
    phaseLabel,
  ]);

  const handleAdvancePhase = () => {
    if (!nextPhase) return;
    setPhase(nextPhase);
    setHasPhaseResult(false);
    setStreamError(null);
  };

  useEffect(() => {
    if (hasAutoRun.current) return;
    if (!courseData) return;
    if (phase !== 'major_skeleton') return;
    hasAutoRun.current = true;
    void handleRunPhase();
  }, [courseData, phase, handleRunPhase]);

  const canFinalize = Boolean(completedPhases.gen_ed_fill);

  return (
    <div className="my-4 p-6 border rounded-xl bg-card shadow-sm">
      <div className="mb-5">
        <h3 className="text-xl font-semibold">Active Feedback Draft</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Build the plan in steps. Start with the major skeleton, then add gen eds, then electives.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-border/70 bg-muted/30 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Current Step
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              {phaseLabel}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {getPhaseDescription(phase)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDraftPlan(initialPlan);
                setStatusMessage(null);
                setAlternatives([]);
                setPhase('major_skeleton');
            setHasPhaseResult(false);
            setStreamError(null);
            setDraftMilestones([]);
                setCompletedPhases({});
                setGlobalNotes([]);
                setGlobalInput('');
                setTermNotes({});
                setTermInputs({});
                hasAutoRun.current = false;
              }}
              disabled={isStreaming}
            >
              Reset Draft
            </Button>
            <Button
              variant="secondary"
              onClick={handleRunPhase}
              disabled={isStreaming}
            >
              {hasPhaseResult ? `Re-run ${phaseLabel}` : `Run ${phaseLabel}`}
            </Button>
            {nextPhase && (
              <Button
                variant="secondary"
                onClick={handleAdvancePhase}
                disabled={!hasPhaseResult || isStreaming}
              >
                Continue to {getPhaseLabel(nextPhase)}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => onComplete({ action: 'generate', draftPlan })}
              disabled={isStreaming || !canFinalize}
            >
              Finalize Grad Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-border/70 bg-muted/30 p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Guidance
        </div>
        <div className="mt-2 rounded-lg border border-border/60 bg-white/80 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">General AI Notes</div>
          <div className="mt-1">
            Use this for overall guidance (pace, workload, constraints).
          </div>
          {globalNotes.length > 0 && (
            <div className="mt-2 space-y-1">
              {globalNotes.map((note, index) => (
                <div key={`${note}-${index}`} className="rounded-md border border-border/50 bg-muted/40 px-2 py-1">
                  {note}
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <textarea
              className="min-h-[64px] w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground"
              placeholder="Add a general instruction for the AI..."
              value={globalInput}
              onChange={(event) => setGlobalInput(event.target.value)}
              disabled={isStreaming}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddGlobalNote}
              disabled={isStreaming || !globalInput.trim()}
            >
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {!hasPhaseResult && !isStreaming && (
        <div className="mb-3 text-xs text-muted-foreground">
          Run this step to generate the AI draft. The layout below is a placeholder until then.
        </div>
      )}

      {statusMessage && (
        <div className="mb-3 rounded-lg border border-border/60 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {statusMessage}
        </div>
      )}

      {streamError && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {streamError}
        </div>
      )}

      {isStreaming && (
        <div className="mb-3 rounded-lg border border-border/60 bg-white/70 p-3">
          <StuLoader
            variant="card"
            text="Generating your active feedback draft..."
            speed={2.5}
          />
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="mb-3 text-xs text-muted-foreground">
          {alternatives.map((alt, index) => (
            <div key={`${alt}-${index}`}>{alt}</div>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Draft Terms
        </div>
        <div className="text-xs text-muted-foreground">
          {draftPlan.terms.length} terms
        </div>
      </div>

      <div className="space-y-4">
        {draftPlan.terms.map((term, index) => {
          const credits = term.courses.reduce((sum, course) => sum + course.credits, 0);
          const termMilestones = getMilestonesForTerm(draftMilestones, term.label, term.id, draftPlan);
          const termNoteList = termNotes[term.id] || [];
          const termInput = termInputs[term.id] || '';
          const nextTerm = draftPlan.terms[index + 1];
          const insertOptions = academicTerms && nextTerm
            ? getInsertOptionsBetween(term, nextTerm, draftPlan, academicTerms)
            : [];
          return (
            <div key={term.id}>
              <div className="rounded-xl border border-border/70 bg-white/80 p-4 shadow-sm dark:bg-zinc-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      Term
                    </div>
                    <div className="text-base font-semibold text-foreground">
                      {term.label}
                    </div>
                  </div>
                  <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    {credits} credits (max {term.maxCredits})
                  </div>
                </div>

                {termMilestones.length > 0 && (
                  <div className="mt-3 rounded-md border border-border/60 bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Milestones
                    </div>
                    {termMilestones.map((milestone, milestoneIndex) => (
                      <div key={`${milestone.title || 'milestone'}-${milestoneIndex}`} className="mt-1">
                        {milestone.title || 'Milestone'}{milestone.type ? ` (${milestone.type})` : ''}
                      </div>
                    ))}
                  </div>
                )}

                {term.courses.length === 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    No courses assigned yet.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {term.courses.map((course) => (
                      <div
                        key={`${term.id}-${course.id}`}
                        className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="text-sm font-medium">{course.code}</div>
                          <div className="text-xs text-muted-foreground">
                            {course.title} - {course.credits} cr
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit({ type: 'move_course', courseId: course.id, direction: 'earlier' })}
                            disabled={isStreaming}
                          >
                            Move Earlier
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit({ type: 'move_course', courseId: course.id, direction: 'later' })}
                            disabled={isStreaming}
                          >
                            Move Later
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-2 py-2 text-xs text-muted-foreground">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Term Notes
                  </div>
                  <div className="mt-1">
                    Use this to comment on issues in {term.label} only.
                  </div>
                  {termNoteList.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {termNoteList.map((note, noteIndex) => (
                        <div key={`${term.id}-note-${noteIndex}`} className="rounded-md border border-border/60 bg-white/70 px-2 py-1">
                          {note}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <textarea
                      className="min-h-[56px] w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground"
                      placeholder={`Add a note for ${term.label}...`}
                      value={termInput}
                      onChange={(event) => setTermInputs(prev => ({ ...prev, [term.id]: event.target.value }))}
                      disabled={isStreaming}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddTermNote(term.id)}
                      disabled={isStreaming || !termInput.trim()}
                    >
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>

              {insertOptions.length > 0 && (
                <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Add Term Between
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insertOptions.map((option) => (
                      <Button
                        key={`${option.termId}-${option.year}`}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleInsertTermBetween(index, option)}
                        disabled={isStreaming}
                      >
                        Add {option.label} Term
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4" />
    </div>
  );
}

function getPhaseLabel(phase: ActiveFeedbackPhase): string {
  switch (phase) {
    case 'major_skeleton':
      return 'Major Skeleton';
    case 'gen_ed_fill':
      return 'Gen Ed Fill';
    case 'elective_balance':
      return 'Elective Balance';
  }
}

function getPhaseDescription(phase: ActiveFeedbackPhase): string {
  switch (phase) {
    case 'major_skeleton':
      return 'AI focuses on major/minor requirements and prerequisites only.';
    case 'gen_ed_fill':
      return 'AI fills general education courses around your locked major skeleton.';
    case 'elective_balance':
      return 'AI finishes electives and balances remaining credits.';
  }
}

function getNextPhase(phase: ActiveFeedbackPhase): ActiveFeedbackPhase | null {
  switch (phase) {
    case 'major_skeleton':
      return 'gen_ed_fill';
    case 'gen_ed_fill':
      return 'elective_balance';
    case 'elective_balance':
      return null;
  }
}

function buildActiveFeedbackInput(args: {
  courseData: unknown;
  suggestedDistribution?: SemesterAllocation[];
  workStatus?: string;
  draftPlan: DraftPlan;
  milestones?: PlanMilestone[];
  draftMilestones?: PlanMilestone[];
  globalNotes: string[];
  termNotes: Record<string, string[]>;
  phase: ActiveFeedbackPhase;
}) {
  const {
    courseData,
    suggestedDistribution,
    workStatus,
    draftPlan,
    milestones,
    draftMilestones,
    globalNotes,
    termNotes,
    phase,
  } = args;
  const baseInput = courseData && typeof courseData === 'object' && !Array.isArray(courseData)
    ? { ...courseData }
    : { selectedCourses: courseData };

  const shouldIncludeDraft = phase !== 'major_skeleton';
  const lockedCourseCodes = shouldIncludeDraft
    ? draftPlan.terms.flatMap(term => term.courses.map(course => course.code))
    : [];
  const lockedTermLabels = shouldIncludeDraft
    ? draftPlan.terms.map(term => term.label)
    : [];

  const payload: Record<string, unknown> = {
    ...baseInput,
    phase,
    suggestedDistribution,
    workStatus,
    draftPlan,
    lockedCourseCodes: shouldIncludeDraft ? lockedCourseCodes : undefined,
    lockedTermLabels: shouldIncludeDraft ? lockedTermLabels : undefined,
  };

  if (milestones && milestones.length > 0) {
    payload.milestones = milestones;
  }

  if (shouldIncludeDraft && draftMilestones && draftMilestones.length > 0) {
    payload.draftMilestones = draftMilestones;
  }

  if (globalNotes.length > 0) {
    payload.userInstructions = globalNotes;
  }

  const termInstructionMap = buildTermInstructionMap(draftPlan, termNotes);
  if (Object.keys(termInstructionMap).length > 0) {
    payload.termInstructions = termInstructionMap;
  }

  return payload;
}

function convertPlanToDraftPlan(
  rawPlan: unknown,
  suggestedDistribution?: SemesterAllocation[]
): { plan: DraftPlan; milestones: PlanMilestone[] } | null {
  const planArray = extractPlanArray(rawPlan);
  if (!planArray || planArray.length === 0) return null;

  const terms = planArray.map((term, index) => {
    const distribution = suggestedDistribution?.[index];
    const label = distribution
      ? `${distribution.term} ${distribution.year}`
      : formatTermLabel(term.term, index);
    const minCredits = distribution?.minCredits ?? 12;
    const maxCredits = distribution?.maxCredits ?? 18;
    const targetCredits = distribution?.suggestedCredits ?? 15;

    const courses = Array.isArray(term.courses)
      ? term.courses.map((course, courseIndex) => ({
        id: `${index}-${courseIndex}`,
        code: String(course.code || ''),
        title: String(course.title || 'Untitled course'),
        credits: normalizeCredits(course.credits),
        source: 'selected' as const,
      }))
      : [];

    return {
      id: `term-${index + 1}`,
      label,
      minCredits,
      maxCredits,
      targetCredits,
      courses,
    };
  });

  return {
    plan: { terms },
    milestones: extractMilestonesFromPlan(rawPlan),
  };
}

function extractPlanArray(rawPlan: unknown): Array<{ term?: string; courses?: unknown[] }> | null {
  if (Array.isArray(rawPlan)) {
    return rawPlan.filter(isPlanTerm);
  }

  if (rawPlan && typeof rawPlan === 'object') {
    const plan = (rawPlan as { plan?: unknown }).plan;
    if (Array.isArray(plan)) {
      return plan.filter(isPlanTerm);
    }
  }

  return null;
}

function isPlanTerm(item: unknown): item is { term?: string; courses?: unknown[] } {
  if (!item || typeof item !== 'object') return false;
  const termItem = item as { term?: string; courses?: unknown[] };
  return typeof termItem.term !== 'undefined' && Array.isArray(termItem.courses);
}

function extractMilestonesFromPlan(rawPlan: unknown): PlanMilestone[] {
  const planArray = Array.isArray(rawPlan)
    ? rawPlan
    : (rawPlan && typeof rawPlan === 'object' ? (rawPlan as { plan?: unknown }).plan : undefined);

  if (!Array.isArray(planArray)) return [];

  return planArray
    .filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      if (Array.isArray(candidate.courses)) return false;
      return typeof candidate.title === 'string' && typeof candidate.type === 'string';
    })
    .map((item) => {
      const candidate = item as Record<string, unknown>;
      return {
        id: typeof candidate.id === 'string' ? candidate.id : undefined,
        type: typeof candidate.type === 'string' ? candidate.type : undefined,
        title: typeof candidate.title === 'string' ? candidate.title : undefined,
        afterTerm: typeof candidate.afterTerm === 'number' ? candidate.afterTerm : undefined,
        term: typeof candidate.term === 'string' ? candidate.term : undefined,
        year: typeof candidate.year === 'number' ? candidate.year : undefined,
      };
    });
}

function getMilestonesForTerm(
  milestones: PlanMilestone[],
  termLabel: string,
  termId: string,
  plan: DraftPlan
): PlanMilestone[] {
  const termIndex = plan.terms.findIndex(term => term.id === termId);
  if (termIndex === -1) return [];

  return milestones.filter(milestone => {
    if (typeof milestone.afterTerm === 'number') {
      return milestone.afterTerm === termIndex + 1;
    }

    if (milestone.term) {
      return normalizeTermLabel(milestone.term) === normalizeTermLabel(termLabel);
    }

    return false;
  });
}

function buildTermInstructionMap(
  plan: DraftPlan,
  termNotes: Record<string, string[]>
): Record<string, string[]> {
  return plan.terms.reduce<Record<string, string[]>>((acc, term) => {
    const notes = termNotes[term.id];
    if (notes && notes.length > 0) {
      acc[term.label] = notes;
    }
    return acc;
  }, {});
}

function remapTermNotes(
  previousNotes: Record<string, string[]>,
  previousPlan: DraftPlan,
  nextPlan: DraftPlan
): Record<string, string[]> {
  const previousLabels = previousPlan.terms.map(term => term.label);
  return nextPlan.terms.reduce<Record<string, string[]>>((acc, term, index) => {
    const fallbackLabel = previousLabels[index];
    const directNotes = previousNotes[term.id];
    const labelNotes = previousNotes[term.label];
    const fallbackNotes = fallbackLabel ? previousNotes[fallbackLabel] : undefined;

    const combined = [
      ...(directNotes || []),
      ...(labelNotes || []),
      ...(fallbackNotes || []),
    ];

    if (combined.length > 0) {
      acc[term.id] = Array.from(new Set(combined));
    }
    return acc;
  }, {});
}

type TermInsertOption = {
  termId: string;
  year: number;
  label: string;
  termType: 'primary' | 'secondary';
};

const DEFAULT_PRIMARY_RANGE = { min: 12, max: 18, target: 15 };
const DEFAULT_SECONDARY_RANGE = { min: 3, max: 9, target: 6 };

function getInsertOptionsBetween(
  currentTerm: DraftTerm,
  nextTerm: DraftTerm,
  plan: DraftPlan,
  academicTerms: AcademicTermsConfig
): TermInsertOption[] {
  const currentParsed = parseTermLabel(currentTerm.label, academicTerms);
  const nextParsed = parseTermLabel(nextTerm.label, academicTerms);
  if (!currentParsed || !nextParsed) return [];
  if (nextParsed.year < currentParsed.year) return [];

  const between = getTermsBetween(currentParsed, nextParsed, academicTerms);
  if (between.length === 0) return [];

  const existingLabels = new Set(plan.terms.map(term => normalizeTermLabel(term.label)));

  return between
    .map((term) => {
      const label = `${getTermLabel(term.termId, academicTerms)} ${term.year}`;
      return {
        termId: term.termId,
        year: term.year,
        label,
        termType: resolveTermType(term.termId, academicTerms),
      };
    })
    .filter(option => !existingLabels.has(normalizeTermLabel(option.label)));
}

function getTermsBetween(
  current: { termId: string; year: number },
  next: { termId: string; year: number },
  academicTerms: AcademicTermsConfig
): Array<{ termId: string; year: number }> {
  const ordering = academicTerms.ordering || [];
  if (ordering.length === 0) return [];

  const startIndex = ordering.findIndex(term => term.toLowerCase() === current.termId.toLowerCase());
  const endIndex = ordering.findIndex(term => term.toLowerCase() === next.termId.toLowerCase());
  if (startIndex === -1 || endIndex === -1) return [];

  const results: Array<{ termId: string; year: number }> = [];
  let currentIndex = startIndex;
  let currentYear = current.year;
  const maxSteps = ordering.length * Math.max(1, next.year - current.year + 1);

  for (let step = 0; step < maxSteps; step += 1) {
    const nextIndex = (currentIndex + 1) % ordering.length;
    const nextTermId = ordering[nextIndex];
    let nextYear = currentYear;
    if (getTermMonth(nextTermId) < getTermMonth(ordering[currentIndex])) {
      nextYear += 1;
    }

    if (nextTermId.toLowerCase() === next.termId.toLowerCase() && nextYear === next.year) {
      return results;
    }

    results.push({ termId: nextTermId, year: nextYear });
    currentIndex = nextIndex;
    currentYear = nextYear;
  }

  return [];
}

function createDraftTermFromOption(
  option: TermInsertOption,
  plan: DraftPlan,
  academicTerms: AcademicTermsConfig
): DraftTerm {
  const range = getRangeForTermType(option.termType, plan, academicTerms);
  const targetCredits = clampValue(range.target, range.min, range.max);

  return {
    id: buildTermId(option),
    label: option.label,
    minCredits: range.min,
    maxCredits: range.max,
    targetCredits,
    courses: [],
  };
}

function getRangeForTermType(
  termType: 'primary' | 'secondary',
  plan: DraftPlan,
  academicTerms: AcademicTermsConfig
): { min: number; max: number; target: number } {
  const fallback = termType === 'secondary' ? DEFAULT_SECONDARY_RANGE : DEFAULT_PRIMARY_RANGE;
  const matchingTerm = plan.terms.find(term => {
    const parsed = parseTermLabel(term.label, academicTerms);
    if (!parsed) return false;
    return resolveTermType(parsed.termId, academicTerms) === termType;
  });

  if (!matchingTerm) {
    return fallback;
  }

  return {
    min: matchingTerm.minCredits,
    max: matchingTerm.maxCredits,
    target: matchingTerm.targetCredits ?? fallback.target,
  };
}

function shiftMilestonesAfterInsert(
  milestones: PlanMilestone[],
  insertIndex: number
): PlanMilestone[] {
  const insertAfterTerm = insertIndex + 1;
  return milestones.map((milestone) => {
    if (typeof milestone.afterTerm !== 'number') return milestone;
    if (milestone.afterTerm <= insertAfterTerm) return milestone;
    return {
      ...milestone,
      afterTerm: milestone.afterTerm + 1,
    };
  });
}

function parseTermLabel(
  label: string,
  academicTerms: AcademicTermsConfig
): { termId: string; year: number } | null {
  const normalized = label.trim().toLowerCase();
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = Number.parseInt(yearMatch[1], 10);
  if (!Number.isFinite(year)) return null;

  const allTerms = getAllTerms(academicTerms);
  const termMatch = allTerms.find(term => normalized.startsWith(term.label.toLowerCase()))
    || allTerms.find(term => normalized.startsWith(term.id.toLowerCase()));

  if (!termMatch) return null;

  return {
    termId: termMatch.id,
    year,
  };
}

function getAllTerms(academicTerms: AcademicTermsConfig) {
  return [...academicTerms.terms.primary, ...academicTerms.terms.secondary];
}

function resolveTermType(
  termId: string,
  academicTerms: AcademicTermsConfig
): 'primary' | 'secondary' {
  return academicTerms.terms.secondary.some(
    term => term.id.toLowerCase() === termId.toLowerCase()
  ) ? 'secondary' : 'primary';
}

function getTermLabel(termId: string, academicTerms: AcademicTermsConfig): string {
  const term = getAllTerms(academicTerms).find(
    entry => entry.id.toLowerCase() === termId.toLowerCase()
  );
  return term?.label || termId.charAt(0).toUpperCase() + termId.slice(1);
}

function getTermMonth(termId: string): number {
  const termLower = termId.toLowerCase();
  const monthMap: Record<string, number> = {
    fall: 8,
    autumn: 8,
    winter: 0,
    spring: 4,
    summer: 5,
  };

  return monthMap[termLower] ?? 0;
}

function buildTermId(option: TermInsertOption): string {
  return `term-${option.termId}-${option.year}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeTermLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '');
}

function formatTermLabel(termValue: unknown, index: number): string {
  if (typeof termValue === 'string' && termValue.trim()) {
    const trimmed = termValue.trim();
    if (/^\d+$/.test(trimmed)) {
      return `Term ${trimmed}`;
    }
    return trimmed;
  }
  if (typeof termValue === 'number') {
    return `Term ${termValue}`;
  }
  return `Term ${index + 1}`;
}

function normalizeCredits(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 3;
}
