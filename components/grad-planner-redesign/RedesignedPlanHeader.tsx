'use client';

import React, { useState } from 'react';
import { Edit3, Save, X, Plus, ChevronDown, Pencil } from 'lucide-react';
import type { RedesignedPlanHeaderProps } from './types';

/**
 * REDESIGNED PLAN HEADER - COMPACT VERSION
 *
 * Visual Design:
 * - Compact layout to maximize screen space
 * - Plan selector dropdown
 * - New plan button
 * - Inline editable plan name
 * - Smaller stat cards
 */
export function RedesignedPlanHeader({
  planName,
  studentName,
  totalCredits,
  earnedCredits,
  isEditMode,
  onToggleEditMode,
  onSave,
  onCancel,
  currentSemesterCredits = 0,
  plannedCredits = 0,
  availablePlans = [],
  currentPlanId,
  onSelectPlan,
  onCreateNewPlan,
  onUpdatePlanName,
}: RedesignedPlanHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(planName);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);

  const percentComplete = totalCredits > 0
    ? Math.round((earnedCredits / totalCredits) * 100)
    : 0;
  const creditsRemaining = totalCredits - earnedCredits;

  // Handle plan name editing
  const handleNameBlur = () => {
    setIsEditingName(false);
    if (nameValue.trim() !== planName && nameValue.trim() !== '' && onUpdatePlanName) {
      onUpdatePlanName(nameValue.trim());
    } else {
      setNameValue(planName);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setNameValue(planName);
      setIsEditingName(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Top Row: Plan Selector + Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Plan Selector + New Plan Button */}
        <div className="flex items-center gap-3">
          {/* Plan Selector Dropdown */}
          {availablePlans.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-sm font-semibold"
                type="button"
              >
                <span className="text-[var(--foreground)]">Switch Plan</span>
                <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
              </button>

              {/* Dropdown Menu */}
              {showPlanDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-lg z-10">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan.planId}
                      onClick={() => {
                        onSelectPlan?.(plan.planId);
                        setShowPlanDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        plan.planId === currentPlanId
                          ? 'bg-[color-mix(in_srgb,var(--primary)_15%,white)] dark:bg-[color-mix(in_srgb,var(--primary)_15%,rgb(39,39,42))] text-[var(--primary)]'
                          : 'text-[var(--foreground)]'
                      }`}
                      type="button"
                    >
                      {plan.planName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Plan Button */}
          {onCreateNewPlan && (
            <button
              onClick={onCreateNewPlan}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] dark:hover:bg-[color-mix(in_srgb,var(--primary)_5%,rgb(39,39,42))] transition-all text-sm font-semibold text-[var(--muted-foreground)]"
              type="button"
            >
              <Plus size={16} />
              New Plan
            </button>
          )}
        </div>

        {/* Right: Edit/Save/Cancel Buttons */}
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 text-sm font-bold text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
                type="button"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-black hover:bg-[var(--hover-green)] transition-all shadow-md"
                type="button"
              >
                <Save size={16} />
                Save
              </button>
            </>
          ) : (
            <button
              onClick={onToggleEditMode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-black hover:bg-[var(--hover-green)] transition-all shadow-md"
              type="button"
            >
              <Edit3 size={16} />
              Edit Plan
            </button>
          )}
        </div>
      </div>

      {/* Plan Name + Student Name */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="text-2xl font-black bg-transparent border-b-2 border-[var(--primary)] outline-none text-[var(--foreground)] flex-1"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
              {planName}
            </h1>
            {onUpdatePlanName && (
              <button
                onClick={() => setIsEditingName(true)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                type="button"
                aria-label="Edit plan name"
              >
                <Pencil size={14} className="text-[var(--muted-foreground)]" />
              </button>
            )}
          </div>
        )}
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">
          • {studentName}
        </span>
      </div>

      {/* Progress Stats Row - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Progress Card */}
        <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--hover-green)] shadow-md">
          <span className="text-3xl font-black text-black">
            {percentComplete}%
          </span>
          <span className="text-xs font-semibold text-black/70 uppercase tracking-wider">
            Complete
          </span>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-black/40 transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Earned Credits Card */}
        <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 shadow-sm">
          <span className="text-3xl font-black text-[var(--foreground)]">
            {earnedCredits}
          </span>
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            Credits Earned
          </span>
          <p className="text-xs text-[var(--muted-foreground)]">
            of {totalCredits} required
          </p>
        </div>

        {/* Remaining Credits Card */}
        <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 shadow-sm">
          <span className="text-3xl font-black text-[var(--foreground)]">
            {creditsRemaining}
          </span>
          <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            Remaining
          </span>
          <p className="text-xs text-[var(--muted-foreground)]">
            to complete degree
          </p>
        </div>
      </div>

      {/* Additional Info Row - Compact */}
      {(currentSemesterCredits > 0 || plannedCredits > 0) && (
        <div className="flex items-center gap-3 flex-wrap">
          {currentSemesterCredits > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[color-mix(in_srgb,var(--action-edit)_42%,transparent)] bg-[color-mix(in_srgb,var(--action-edit)_14%,white)] dark:bg-[color-mix(in_srgb,var(--action-edit)_14%,rgb(39,39,42))]">
              <span className="text-sm font-bold text-[var(--foreground)]">
                {currentSemesterCredits.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Current Semester
              </span>
            </div>
          )}

          {plannedCredits > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[color-mix(in_srgb,var(--primary)_42%,transparent)] bg-[color-mix(in_srgb,var(--primary)_14%,white)] dark:bg-[color-mix(in_srgb,var(--primary)_14%,rgb(39,39,42))]">
              <span className="text-sm font-bold text-[var(--foreground)]">
                {plannedCredits.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Planned
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
