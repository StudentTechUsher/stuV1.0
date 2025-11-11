"use client";

import { useEffect, useMemo, useState, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
} from "@mui/material";
// Removed direct client-side upsert; persistence handled by server action now.
import { saveProfileAndPreferences } from "./save-profile-action";
import { saveGradTimeline } from "./save-grad-timeline-action";
import { upsertUserEntry } from "./upsert-user-entry-action";
import { Option } from "@/types/option";
import SearchableMultiSelect from "@/helpers/searchable-multi-select";
import SingleSelect from "@/helpers/single-select";
import TranscriptUploadSection from "@/components/transcript/TranscriptUploadSection";
import { Term, termYearToDate, termYearToSem } from "@/lib/gradDate";

type Preload = {
  universities: Option[];
  majorsAll: Option[];   // include university_id
  minorsAll: Option[];   // include university_id
  interests: Option[];
  careers: Option[];
  classPrefs: Option[];
};

type Initial = {
  fname?: string;
  lname?: string;
  email?: string;
  university_id: number | null;
  selected_majors: number[] | null;
  selected_minors: number[] | null;
  selected_interests: number[] | null;
  career_options: number[] | null;
  class_preferences: number[] | null;
  est_grad_sem?: string | null;
  est_grad_date?: string | null;
  career_goals?: string | null;
} | null;

type Props = {
  userId: string;
  nextHref: string;
  preload: Preload;
  initial?: Initial;
  isEditMode?: boolean;
};

export default function CreateAccountForm({ 
  userId, 
  nextHref, 
  preload, 
  initial, 
  isEditMode = false 
}: Readonly<Props>) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups (static from server)
  const [universities] = useState<Option[]>(preload.universities);
  const [majorsOpts, setMajorsOpts] = useState<Option[]>([]);
  const [minorsOpts, setMinorsOpts] = useState<Option[]>([]);
  const [interestsOpts, setInterestsOpts] = useState<Option[]>(preload.interests);
  const [careerOpts, setCareerOpts] = useState<Option[]>(preload.careers);
  const [classPrefOpts] = useState<Option[]>(preload.classPrefs);

  // Selected values
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [majors, setMajors] = useState<number[]>([]);
  const [minors, setMinors] = useState<number[]>([]);
  const [interests, setInterests] = useState<number[]>([]);
  const [careerSelections, setCareerSelections] = useState<number[]>([]);
  const [classPreferences, setClassPreferences] = useState<number[]>([]);

  // NEW: name fields required by profiles.fname/lname
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName]   = useState<string>("");

  // Graduation timeline fields
  const [gradTerm, setGradTerm] = useState<Term | "">("");
  const [gradYear, setGradYear] = useState<number | "">("");
  const [careerGoalsText, setCareerGoalsText] = useState<string>("");

  // Helper: keep only values that exist in options
  const clampToOptions = useCallback((values: number[], options: Option[]) => {
    const valid = new Set(options.map(o => o.id));
    return values.filter(v => valid.has(v));
  }, []);

  // Prefill from server-provided initial (once) — this only has student prefs
  useEffect(() => {
    if (!initial) return;
    setFirstName(initial.fname ?? "");
    setLastName(initial.lname ?? "");
    setUniversityId(initial.university_id ?? null);
    setMajors(initial.selected_majors ?? []);
    setMinors(initial.selected_minors ?? []);
    setInterests(initial.selected_interests ?? []);
    setCareerSelections(initial.career_options ?? []);
    setClassPreferences(initial.class_preferences ?? []);
    setCareerGoalsText(initial.career_goals ?? "");

    // Parse graduation semester if provided
    if (initial.est_grad_sem) {
      const parts = initial.est_grad_sem.trim().split(/\s+/);
      if (parts.length === 2) {
        const [term, year] = parts;
        if (["Spring", "Summer", "Fall", "Winter"].includes(term)) {
          setGradTerm(term as Term);
          setGradYear(parseInt(year, 10));
        }
      }
    }
  }, [initial]);

  // Filter majors/minors by selected university (and clamp existing selections instead of clearing)
  useEffect(() => {
    if (universityId == null) {
      setMajorsOpts([]);
      setMinorsOpts([]);
      setMajors(() => []);
      setMinors(() => []);
      return;
    }

    const nextMajorsOpts = preload.majorsAll.filter(m => m.university_id === universityId);
    const nextMinorsOpts = preload.minorsAll.filter(m => m.university_id === universityId);

    setMajorsOpts(nextMajorsOpts);
    setMinorsOpts(nextMinorsOpts);

    // Keep selections that still exist under this university
    setMajors(prev => clampToOptions(prev, nextMajorsOpts));
    setMinors(prev => clampToOptions(prev, nextMinorsOpts));
  }, [universityId, preload.majorsAll, preload.minorsAll, clampToOptions]);

  const canSubmit = useMemo(() => {
    // For create mode, require graduation timeline
    if (!isEditMode) {
      return (
        universityId != null &&
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        gradTerm !== "" &&
        gradYear !== ""
      );
    }
    // For edit mode, don't require timeline (already set)
    return (
      universityId != null &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0
    );
  }, [universityId, firstName, lastName, gradTerm, gradYear, isEditMode]);

  // Handler for adding custom interests
  const handleAddInterest = useCallback(async (name: string): Promise<{ id: number; name: string } | null> => {
    const result = await upsertUserEntry('student_interests', name);
    if (result.ok && result.id !== undefined && result.name) {
      const newOption = { id: result.id, name: result.name };
      // Add to local options if not already there
      setInterestsOpts(prev => {
        if (prev.find(opt => opt.id === newOption.id)) return prev;
        return [...prev, newOption];
      });
      return newOption;
    }
    return null;
  }, []);

  // Handler for adding custom career options
  const handleAddCareer = useCallback(async (name: string): Promise<{ id: number; name: string } | null> => {
    const result = await upsertUserEntry('career_options', name);
    if (result.ok && result.id !== undefined && result.name) {
      const newOption = { id: result.id, name: result.name };
      // Add to local options if not already there
      setCareerOpts(prev => {
        if (prev.find(opt => opt.id === newOption.id)) return prev;
        return [...prev, newOption];
      });
      return newOption;
    }
    return null;
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await saveProfileAndPreferences({
        userId,
        fname: firstName,
        lname: lastName,
        universityId: universityId!,
        majors,
        minors,
        interests,
        careerSelections,
        classPreferences,
      });
      if (!result.ok) {
        setError(result.error || "Could not save your profile.");
        setSaving(false);
        return;
      }

      // Save graduation timeline directly to profiles table
      if (gradTerm !== "" && gradYear !== "") {
        const estGradSem = termYearToSem(gradTerm, gradYear as number);
        const estGradDate = termYearToDate(gradTerm, gradYear as number);

        const timelineResult = await saveGradTimeline({
          userId,
          est_grad_sem: estGradSem,
          est_grad_date: estGradDate,
          career_goals: careerGoalsText || null,
        });

        if (!timelineResult.ok) {
          setError(timelineResult.error || "Could not save graduation timeline.");
          setSaving(false);
          return;
        }
      } else if (isEditMode) {
        // In edit mode, always save (even if empty)
        const estGradSem = gradTerm !== "" && gradYear !== "" ? termYearToSem(gradTerm, gradYear as number) : null;
        const estGradDate = gradTerm !== "" && gradYear !== "" ? termYearToDate(gradTerm, gradYear as number) : null;

        const timelineResult = await saveGradTimeline({
          userId,
          est_grad_sem: estGradSem,
          est_grad_date: estGradDate,
          career_goals: careerGoalsText || null,
        });

        if (!timelineResult.ok) {
          setError(timelineResult.error || "Could not save graduation timeline.");
          setSaving(false);
          return;
        }
      }

      router.push(nextHref);
    } catch (err) {
      console.error("[CreateAccount] Submit exception:", err);
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-200 bg-red-50 p-4 flex items-start gap-3"
        >
          <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-body text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Names Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-1 rounded-full bg-[var(--primary)]"></div>
          <h3 className="font-header-bold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
            Personal Information
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            id="fname"
            label="First name"
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--primary)',
                  borderWidth: '2px',
                },
              },
            }}
          />
          <TextField
            id="lname"
            label="Last name"
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '& fieldset': {
                  borderColor: 'var(--border)',
                },
                '&:hover fieldset': {
                  borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--primary)',
                  borderWidth: '2px',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Academic Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[var(--primary)]"></div>
          <h3 className="font-header-bold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
            Academic Details
          </h3>
        </div>
        {!isEditMode && (
          <p className="font-body text-sm text-[var(--muted-foreground)] -mt-2">
            Tell us about your academic goals and interests
          </p>
        )}

      <SingleSelect
        label="University"
        helper={isEditMode ? "University cannot be changed after account creation." : "Select your current university."}
        options={universities}
        value={universityId}
        onChange={(e) => setUniversityId(e.target.value ? Number(e.target.value) : null)}
        placeholder="Choose a university"
        disabled={isEditMode}
      />

      <SearchableMultiSelect
        label="Major(s)"
        helper={
          universityId == null
            ? "Choose a university first to see available majors."
            : "Choose one or more majors you're pursuing or considering."
        }
        options={majorsOpts}
        values={majors}
        onChange={setMajors}
        disabled={universityId == null || majorsOpts.length === 0}
        placeholder="Search for majors..."
        maxSelections={3}
      />

      <SearchableMultiSelect
        label="Minor(s)"
        helper="Optional – pick any minors you're considering."
        options={minorsOpts}
        values={minors}
        onChange={setMinors}
        disabled={minorsOpts.length === 0}
        placeholder="Search for minors..."
        maxSelections={3}
      />

      <SearchableMultiSelect
        label="Interests"
        helper="What subjects or areas excite you? Type and press Enter to add custom entries."
        options={interestsOpts}
        values={interests}
        onChange={setInterests}
        placeholder="Search or add your own..."
        allowCustomEntries={true}
        onAddCustomEntry={handleAddInterest}
      />

      <SearchableMultiSelect
        label="Potential career paths"
        helper="Where do you see yourself heading? Type and press Enter to add custom entries."
        options={careerOpts}
        values={careerSelections}
        onChange={setCareerSelections}
        placeholder="Search or add your own..."
        allowCustomEntries={true}
        onAddCustomEntry={handleAddCareer}
      />

      <SearchableMultiSelect
        label="Class preferences"
        helper="e.g., mornings, small seminars, online, project-based."
        options={classPrefOpts}
        values={classPreferences}
        onChange={setClassPreferences}
        placeholder="Search for preferences..."
      />
      </div>

      {/* Graduation Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[var(--primary)]"></div>
          <h3 className="font-header-bold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
            Graduation Timeline {!isEditMode && <span className="text-red-500 ml-1">*</span>}
          </h3>
        </div>
        <p className="font-body text-sm text-[var(--muted-foreground)] -mt-2">
          When do you plan to graduate?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormControl fullWidth required={!isEditMode}>
            <InputLabel id="grad-term-label" className="font-body">Term</InputLabel>
            <Select
              labelId="grad-term-label"
              value={gradTerm}
              label="Term"
              onChange={(e: SelectChangeEvent) => setGradTerm(e.target.value as Term | "")}
              className="font-body"
              sx={{
                borderRadius: '10px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--border)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--primary)',
                  borderWidth: '2px',
                },
              }}
            >
              <MenuItem value="">
                <em>Select term</em>
              </MenuItem>
              <MenuItem value="Spring" className="font-body">Spring</MenuItem>
              <MenuItem value="Summer" className="font-body">Summer</MenuItem>
              <MenuItem value="Fall" className="font-body">Fall</MenuItem>
              <MenuItem value="Winter" className="font-body">Winter</MenuItem>
            </Select>
            {!isEditMode && (
              <FormHelperText className="font-body">When you plan to graduate</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth required={!isEditMode}>
            <InputLabel id="grad-year-label" className="font-body">Year</InputLabel>
            <Select
              labelId="grad-year-label"
              value={String(gradYear)}
              label="Year"
              onChange={(e: SelectChangeEvent) => setGradYear(Number(e.target.value) || "")}
              className="font-body"
              sx={{
                borderRadius: '10px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--border)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'var(--primary)',
                  borderWidth: '2px',
                },
              }}
            >
              <MenuItem value="">
                <em>Select year</em>
              </MenuItem>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() + i;
                return (
                  <MenuItem key={year} value={year} className="font-body">
                    {year}
                  </MenuItem>
                );
              })}
            </Select>
            {!isEditMode && (
              <FormHelperText className="font-body">You can edit this later</FormHelperText>
            )}
          </FormControl>
        </div>
      </div>

      {/* Career Goals */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[var(--primary)]"></div>
          <h3 className="font-header-bold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
            Career Goals <span className="font-body-semi text-xs normal-case">(Optional)</span>
          </h3>
        </div>
        <p className="font-body text-sm text-[var(--muted-foreground)] -mt-1">
          What are your career aspirations?
        </p>

        <div className="relative">
          <textarea
            value={careerGoalsText}
            onChange={(e) => setCareerGoalsText(e.target.value)}
            placeholder="E.g., I want to work in software engineering, focus on AI/ML, and eventually start my own company..."
            maxLength={1000}
            className="font-body w-full min-h-[120px] rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-20 transition-all resize-vertical"
          />
          <p className="font-body text-xs text-[var(--muted-foreground)] mt-2">
            {careerGoalsText.length}/1000 characters
          </p>
        </div>
      </div>

      {/* Transcript Upload - only show in create mode, not edit mode */}
      {!isEditMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-[var(--primary)]"></div>
            <h3 className="font-header-bold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
              Transcript Upload <span className="font-body-semi text-xs normal-case">(Optional)</span>
            </h3>
          </div>
          <TranscriptUploadSection />
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="flex items-center gap-2 rounded-lg px-6 py-3 font-body-semi text-sm font-semibold shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          style={{
            backgroundColor: canSubmit && !saving ? 'var(--primary)' : 'var(--muted)',
            color: canSubmit && !saving ? 'black' : 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => {
            if (canSubmit && !saving) {
              e.currentTarget.style.backgroundColor = 'var(--hover-green)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (canSubmit && !saving) {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {saving && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          )}
          {saving ? 'Saving…' : isEditMode ? 'Update Profile' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
