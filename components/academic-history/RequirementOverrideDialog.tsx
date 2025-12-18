'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ParsedCourse } from '@/lib/services/userCoursesService';
import type { RequirementOption } from '@/lib/services/courseMatchingService';
import type { CourseFulfillment } from '@/lib/services/userCoursesService';

interface RequirementOverrideDialogProps {
  open: boolean;
  course: ParsedCourse;
  availableRequirements: RequirementOption[];
  genEdHasNoDoubleCount: boolean;
  onClose: () => void;
  onSave: (courseId: string, fulfillments: CourseFulfillment[]) => Promise<void>;
}

export function RequirementOverrideDialog({
  open,
  course,
  availableRequirements,
  genEdHasNoDoubleCount,
  onClose,
  onSave,
}: Readonly<RequirementOverrideDialogProps>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const existingIds = course.fulfillsRequirements?.map((fulfillment) => fulfillment.requirementId) ?? [];
    setSelectedIds(existingIds);
  }, [course]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) {
      return availableRequirements;
    }
    const query = search.toLowerCase();
    return availableRequirements.filter((option) => {
      return (
        option.requirementDescription.toLowerCase().includes(query) ||
        option.programName.toLowerCase().includes(query)
      );
    });
  }, [availableRequirements, search]);

  const handleToggle = (requirementId: string) => {
    if (genEdHasNoDoubleCount) {
      setSelectedIds([requirementId]);
      return;
    }

    setSelectedIds((prev) =>
      prev.includes(requirementId) ? prev.filter((id) => id !== requirementId) : [...prev, requirementId],
    );
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    if (!course.id) {
      onClose();
      return;
    }

    setSaving(true);
    const fulfillments: CourseFulfillment[] = selectedIds
      .map((requirementId) => availableRequirements.find((option) => option.requirementId === requirementId))
      .filter((option): option is RequirementOption => Boolean(option))
      .map((option) => ({
        programId: option.programId,
        programName: option.programName,
        requirementId: option.requirementId,
        requirementDescription: option.requirementDescription,
        matchType: 'manual',
        matchedAt: new Date().toISOString(),
        requirementType: option.requirementType,
      }));

    try {
      await onSave(course.id, fulfillments);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="font-body-semi text-xs text-[var(--muted-foreground)]">Assign Requirements for</p>
            <h2 className="font-header text-lg font-bold text-[var(--foreground)]">
              {course.subject} {course.number} — {course.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        {genEdHasNoDoubleCount && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-xs text-amber-900">
            This gen-ed catalog allows each course to fulfill only one requirement at a time.
          </div>
        )}

        <div className="space-y-4 px-6 py-5">
          {/* Selected Requirements Display */}
          {selectedIds.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-body-semi text-xs font-semibold text-[var(--foreground)]">
                  Selected Requirements ({selectedIds.length})
                </p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-body text-xs font-semibold text-[var(--primary)] hover:text-[var(--hover-green)]"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map((id) => {
                  const option = availableRequirements.find((opt) => opt.requirementId === id);
                  if (!option) return null;
                  const displayText = `${option.programName} - ${option.requirementId}`;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs font-medium"
                    >
                      {displayText}
                      <button
                        type="button"
                        onClick={() => handleToggle(id)}
                        className="ml-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Requirement Selection Dropdown */}
          <div>
            <label className="font-body-semi mb-2 block text-sm font-semibold text-[var(--foreground)]">
              {genEdHasNoDoubleCount ? 'Select Requirement' : 'Select Requirements'}
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requirements…"
              className="font-body mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />

            <select
              multiple={!genEdHasNoDoubleCount}
              size={10}
              className="font-body w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                if (genEdHasNoDoubleCount) {
                  setSelectedIds(selectedOptions);
                } else {
                  // For multi-select, toggle the clicked option
                  const lastSelected = selectedOptions[selectedOptions.length - 1];
                  if (lastSelected) {
                    handleToggle(lastSelected);
                  }
                }
              }}
              value={selectedIds}
            >
              {filteredOptions.length === 0 && (
                <option disabled>No requirements match your search</option>
              )}
              {filteredOptions.map((option) => {
                const displayText = `${option.programName} - ${option.requirementId}`;
                const isSelected = selectedIds.includes(option.requirementId);
                return (
                  <option
                    key={`${option.programId}-${option.requirementId}`}
                    value={option.requirementId}
                    className={`cursor-pointer px-3 py-2 ${isSelected ? 'bg-[var(--primary)]/20 font-semibold' : ''}`}
                  >
                    {displayText}
                    {option.requirementDescription && ` (${option.requirementDescription})`}
                  </option>
                );
              })}
            </select>
            <p className="font-body mt-2 text-xs text-[var(--muted-foreground)]">
              {genEdHasNoDoubleCount
                ? 'Click to select one requirement'
                : 'Hold Ctrl/Cmd and click to select multiple requirements'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 font-body-semi text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-body-semi text-sm font-semibold text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--hover-green)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
