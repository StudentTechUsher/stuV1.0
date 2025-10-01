"use client";
import * as React from 'react';

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
}

export function MajorPivotForm({ currentMajor, onSubmit, onCancel, className }: MajorPivotFormProps) {
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
      <div>
        <label htmlFor="whyMajor" className="block text-xs font-medium text-gray-600 mb-1">Why {currentMajor || 'this major'}?</label>
        <textarea
          id="whyMajor"
          value={values.whyMajor}
          onChange={e => update('whyMajor', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, whyMajor: true }))}
          rows={3}
          className="w-full rounded border border-gray-300 bg-white/70 backdrop-blur px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="What initially drew you to it?"
        />
        {touched.whyMajor && !values.whyMajor.trim() && <p className="mt-1 text-[11px] text-red-500">Required</p>}
      </div>

      <div>
        <label htmlFor="notWorking" className="block text-xs font-medium text-gray-600 mb-1">What isn't working for you?</label>
        <textarea
          id="notWorking"
          value={values.notWorking}
          onChange={e => update('notWorking', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, notWorking: true }))}
          rows={3}
          className="w-full rounded border border-gray-300 bg-white/70 backdrop-blur px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="Pain points, frustrations, misalignment…"
        />
        {touched.notWorking && !values.notWorking.trim() && <p className="mt-1 text-[11px] text-red-500">Required</p>}
      </div>

      <div>
        <label htmlFor="partsLiked" className="block text-xs font-medium text-gray-600 mb-1">What parts do you still like?</label>
        <textarea
          id="partsLiked"
          value={values.partsLiked}
          onChange={e => update('partsLiked', e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, partsLiked: true }))}
          rows={3}
          className="w-full rounded border border-gray-300 bg-white/70 backdrop-blur px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="Topics, projects, skills that still resonate…"
        />
        {touched.partsLiked && !values.partsLiked.trim() && <p className="mt-1 text-[11px] text-red-500">Required</p>}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id="wantCareerHelp"
          type="checkbox"
          checked={values.wantCareerHelp}
          onChange={e => update('wantCareerHelp', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="wantCareerHelp" className="text-xs text-gray-700 select-none">Do you want help finding a target career?</label>
      </div>

      {!values.wantCareerHelp && (
        <div>
          <label htmlFor="consideredCareer" className="block text-xs font-medium text-gray-600 mb-1">What kind of career are you considering?</label>
          <input
            id="consideredCareer"
            type="text"
            value={values.consideredCareer}
            onChange={e => update('consideredCareer', e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, consideredCareer: true }))}
            className="w-full rounded border border-gray-300 bg-white/70 backdrop-blur px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="e.g. Product design, Data journalism…"
          />
          {touched.consideredCareer && !values.consideredCareer.trim() && <p className="mt-1 text-[11px] text-red-500">Required if not requesting help</p>}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || missingRequired}
          className="inline-flex items-center justify-center rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {submitting ? 'Submitting…' : 'Continue'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export type { MajorPivotFormValues };
