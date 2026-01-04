"use client";

import * as React from 'react';

interface MajorComparisonSelectorProps {
  majors: Array<{ id: string; name: string }>;
  onCompare: (ids: string[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function MajorComparisonSelector({
  majors,
  onCompare,
  onCancel,
  loading = false
}: Readonly<MajorComparisonSelectorProps>) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  const canSubmit = selected.length >= 2 && selected.length <= 4;

  // Filter majors by search term
  const filteredMajors = React.useMemo(() => {
    if (!searchTerm.trim()) return majors;
    const term = searchTerm.toLowerCase();
    return majors.filter(m => m.name.toLowerCase().includes(term));
  }, [majors, searchTerm]);

  const handleToggle = (majorId: string) => {
    if (selected.includes(majorId)) {
      setSelected(selected.filter(id => id !== majorId));
    } else if (selected.length < 4) {
      setSelected([...selected, majorId]);
    }
  };

  const handleCompare = () => {
    if (canSubmit) {
      onCompare(selected);
    }
  };

  const selectedMajors = majors.filter(m => selected.includes(m.id));

  return (
    <div className="space-y-4">
      {/* Selected Majors Display */}
      {selected.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">
            Selected Majors ({selected.length}/4)
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedMajors.map((major) => (
              <div
                key={major.id}
                className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-medium text-emerald-800 dark:text-emerald-200"
              >
                <span>{major.name}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(major.id)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-emerald-700 uppercase">
            {selected.length > 0 ? 'Add More Majors' : 'Select Majors to Compare (2-4)'}
          </h3>
        </div>

        {/* Search input */}
        {majors.length > 10 && (
          <input
            type="text"
            placeholder="Search majors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mb-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 dark:bg-gray-800 dark:text-gray-100"
          />
        )}

        {/* Major list */}
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll border border-gray-200 dark:border-gray-600 rounded bg-white/50 dark:bg-gray-800/50 p-2">
          {filteredMajors.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No majors found
            </p>
          )}

          {filteredMajors.map(major => {
            const isSelected = selected.includes(major.id);
            const isDisabled = !isSelected && selected.length >= 4;

            return (
              <label
                key={major.id}
                className={`
                  flex items-center gap-2 p-2 rounded cursor-pointer transition
                  ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => handleToggle(major.id)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{major.name}</span>
              </label>
            );
          })}
        </div>

        {selected.length === 4 && (
          <p className="text-xs text-amber-700 mt-2">
            Maximum of 4 majors reached
          </p>
        )}
        {selected.length === 1 && (
          <p className="text-xs text-gray-600 mt-2">
            Select at least one more major to compare
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center justify-center rounded border border-gray-300 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCompare}
          disabled={!canSubmit || loading}
          className="inline-flex items-center justify-center rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Compare Majors'}
        </button>
      </div>
    </div>
  );
}
