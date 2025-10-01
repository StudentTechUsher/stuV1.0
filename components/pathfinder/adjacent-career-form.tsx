"use client";
import * as React from 'react';

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
        <label htmlFor="whyLikeMajor" className="block text-xs font-medium text-gray-600 mb-1">What do you like most about {currentMajor || 'your major'}?</label>
        <textarea
          id="whyLikeMajor"
          value={values.whyLikeMajor}
          onChange={e => update('whyLikeMajor', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, whyLikeMajor: true }))}
          rows={3}
          className="w-full rounded border border-gray-300 bg-white/70 backdrop-blur px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="Concepts, projects, problem types, collaboration style..."
        />
        {touched.whyLikeMajor && !values.whyLikeMajor.trim() && <p className="mt-1 text-[11px] text-red-500">Required</p>}
      </div>
      <div>
        <label htmlFor="targetIndustry" className="block text-xs font-medium text-gray-600 mb-1">Which industry or domain are you curious about?</label>
        <input
          id="targetIndustry"
          value={values.targetIndustry}
          onChange={e => update('targetIndustry', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, targetIndustry: true }))}
          className="w-full rounded border border-gray-300 bg-white/70 backdrop-blur px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="e.g. FinTech, Health Informatics, EdTech, Cybersecurity..."
        />
        {touched.targetIndustry && !values.targetIndustry.trim() && <p className="mt-1 text-[11px] text-red-500">Required</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || missing}
          className="inline-flex items-center justify-center rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {submitting ? 'Submitting…' : 'Get Adjacent Careers'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >Cancel</button>
        )}
      </div>
    </form>
  );
}

export default AdjacentCareerForm;