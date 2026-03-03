"use client";
import * as React from 'react';
import { Button } from '@/components/ui/button';

export interface AdjacentCareerFormValues {
  whyLikeMajor: string;
  targetIndustry: string;
}

interface AdjacentCareerFormProps {
  currentMajor?: string | null;
  onSubmit: (values: AdjacentCareerFormValues) => void;
  onCancel?: () => void;
  className?: string;
}

export function AdjacentCareerForm({ currentMajor, onSubmit, onCancel, className }: Readonly<AdjacentCareerFormProps>) {
  const [values, setValues] = React.useState<AdjacentCareerFormValues>({
    whyLikeMajor: '',
    targetIndustry: '',
  });
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);

  function update<K extends keyof AdjacentCareerFormValues>(key: K, val: AdjacentCareerFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }));
  }

  const missing = !values.whyLikeMajor.trim() || !values.targetIndustry.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ whyLikeMajor: true, targetIndustry: true });
    if (missing) return;
    setSubmitting(true);
    try {
      onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={"space-y-5 " + (className || '')}>
      <div>
        <label htmlFor="whyLikeMajor" className="mb-1 block text-xs font-medium text-muted-foreground">What do you like most about {currentMajor || 'your major'}?</label>
        <textarea
          id="whyLikeMajor"
          value={values.whyLikeMajor}
          onChange={e => update('whyLikeMajor', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, whyLikeMajor: true }))}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          placeholder="Concepts, projects, problem types, collaboration style..."
        />
        {touched.whyLikeMajor && !values.whyLikeMajor.trim() && <p className="mt-1 text-[11px] text-destructive">Required</p>}
      </div>
      <div>
        <label htmlFor="targetIndustry" className="mb-1 block text-xs font-medium text-muted-foreground">Which industry or domain are you curious about?</label>
        <input
          id="targetIndustry"
          value={values.targetIndustry}
          onChange={e => update('targetIndustry', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, targetIndustry: true }))}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          placeholder="e.g. FinTech, Health Informatics, EdTech, Cybersecurity..."
        />
        {touched.targetIndustry && !values.targetIndustry.trim() && <p className="mt-1 text-[11px] text-destructive">Required</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting || missing}
          variant="primary"
        >
          {submitting ? 'Submitting…' : 'Get Adjacent Careers'}
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

export default AdjacentCareerForm;
