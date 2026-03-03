"use client";
import * as React from 'react';
import { Button } from '@/components/ui/button';

interface MajorPivotFormValues {
  whyMajor: string;
  notWorking: string;
  partsLiked: string;
  wantCareerHelp: boolean;
  consideredCareer: string;
}

interface MajorPivotFormProps {
  currentMajor?: string | null;
  onSubmit: (values: MajorPivotFormValues) => void;
  onCancel?: () => void;
  className?: string;
  /** Optional: number of classes that match criteria in the selected semester */
  matchedClasses?: number;
  /** Optional: total number of classes in the selected semester */
  totalClassesInSemester?: number;
  /** Optional: display name of the selected semester (e.g., 'Fall 2024') */
  selectedSemesterName?: string;
}

export function MajorPivotForm({ currentMajor, onSubmit, onCancel, className, matchedClasses, totalClassesInSemester, selectedSemesterName }: Readonly<MajorPivotFormProps>) {
  const [values, setValues] = React.useState<MajorPivotFormValues>({
    whyMajor: '',
    notWorking: '',
    partsLiked: '',
    wantCareerHelp: true,
    consideredCareer: '',
  });
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function update<K extends keyof MajorPivotFormValues>(key: K, val: MajorPivotFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }));
  }

  const missingRequired = !values.whyMajor.trim() || !values.notWorking.trim() || !values.partsLiked.trim() || (!values.wantCareerHelp && !values.consideredCareer.trim());

  const percentSimilar = React.useMemo(() => {
    if (typeof matchedClasses !== 'number' || typeof totalClassesInSemester !== 'number' || totalClassesInSemester <= 0) return null;
    const pct = Math.round((matchedClasses / totalClassesInSemester) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [matchedClasses, totalClassesInSemester]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ whyMajor: true, notWorking: true, partsLiked: true, consideredCareer: true });
    if (missingRequired) return;
    setSubmitting(true);
    try {
      onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={"space-y-5 " + (className || '')}>
      {typeof percentSimilar === 'number' && (
        <div className="flex items-center gap-2 rounded border border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-2">
          <span className="inline-flex items-center justify-center rounded bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-zinc-900">
            {percentSimilar}% similar
          </span>
          <span className="text-[11px] text-foreground">
            {matchedClasses ?? 0} of {totalClassesInSemester ?? 0} classes
            {selectedSemesterName ? ` in ${selectedSemesterName}` : ''}
            {` match`}
          </span>
        </div>
      )}
      <div>
        <label htmlFor="whyMajor" className="mb-1 block text-xs font-medium text-muted-foreground">Why {currentMajor || 'this major'}?</label>
        <textarea
          id="whyMajor"
          value={values.whyMajor}
          onChange={e => update('whyMajor', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, whyMajor: true }))}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          placeholder="What initially drew you to it?"
        />
        {touched.whyMajor && !values.whyMajor.trim() && <p className="mt-1 text-[11px] text-destructive">Required</p>}
      </div>

      <div>
        <label htmlFor="notWorking" className="mb-1 block text-xs font-medium text-muted-foreground">What isn&apos;t working for you?</label>
        <textarea
          id="notWorking"
          value={values.notWorking}
          onChange={e => update('notWorking', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, notWorking: true }))}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          placeholder="Pain points, frustrations, misalignment…"
        />
        {touched.notWorking && !values.notWorking.trim() && <p className="mt-1 text-[11px] text-destructive">Required</p>}
      </div>

      <div>
        <label htmlFor="partsLiked" className="mb-1 block text-xs font-medium text-muted-foreground">What parts do you still like?</label>
        <textarea
          id="partsLiked"
          value={values.partsLiked}
          onChange={e => update('partsLiked', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, partsLiked: true }))}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          placeholder="Topics, projects, skills that still resonate…"
        />
        {touched.partsLiked && !values.partsLiked.trim() && <p className="mt-1 text-[11px] text-destructive">Required</p>}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id="wantCareerHelp"
          type="checkbox"
          checked={values.wantCareerHelp}
          onChange={e => update('wantCareerHelp', e.target.checked)}
          className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-ring/50"
        />
        <label htmlFor="wantCareerHelp" className="select-none text-xs text-foreground">Do you want help finding a target career?</label>
      </div>

      {!values.wantCareerHelp && (
        <div>
          <label htmlFor="consideredCareer" className="mb-1 block text-xs font-medium text-muted-foreground">What kind of career are you considering?</label>
          <input
            id="consideredCareer"
            type="text"
            value={values.consideredCareer}
            onChange={e => update('consideredCareer', e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, consideredCareer: true }))}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            placeholder="e.g. Product design, Data journalism…"
          />
          {touched.consideredCareer && !values.consideredCareer.trim() && <p className="mt-1 text-[11px] text-destructive">Required if not requesting help</p>}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting || missingRequired}
          variant="primary"
        >
          {submitting ? 'Submitting…' : 'Continue'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export type { MajorPivotFormValues };
