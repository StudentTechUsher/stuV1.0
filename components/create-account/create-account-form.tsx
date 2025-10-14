"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
// Removed direct client-side upsert; persistence handled by server action now.
import { saveProfileAndPreferences } from "./save-profile-action";
import { saveGradTimeline } from "./save-grad-timeline-action";
import { upsertUserEntry } from "./upsert-user-entry-action";
import { Option } from "@/types/option";
import SearchableMultiSelect from "@/helpers/searchable-multi-select";
import SingleSelect from "@/helpers/single-select";
import { TextField, Select, MenuItem, FormControl, InputLabel, FormHelperText } from "@mui/material";
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
    <form onSubmit={onSubmit}>
      {error && (
        <div
          role="alert"
          style={{
            background: "#fee",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Names (required by profiles.fname/lname) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <TextField
          id="fname"
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <TextField
          id="lname"
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      <p className="font-body" style={{ color: "var(--text-secondary, #666)", marginBottom: 16 }}>
        Tell us a bit about your academic goals and interests. You can change these later.
      </p>

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

      {/* Graduation Timeline */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <h3 className="font-header-bold" style={{ fontSize: '1rem', marginBottom: 8 }}>
          Graduation Timeline {!isEditMode && <span style={{ color: 'var(--action-cancel)' }}>*</span>}
        </h3>
        <p className="font-body" style={{ color: "var(--text-secondary, #666)", marginBottom: 12, fontSize: '0.9rem' }}>
          When do you plan to graduate?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormControl fullWidth required={!isEditMode}>
            <InputLabel id="grad-term-label">Term</InputLabel>
            <Select
              labelId="grad-term-label"
              value={gradTerm}
              label="Term"
              onChange={(e) => setGradTerm(e.target.value as Term | "")}
            >
              <MenuItem value="">
                <em>Select term</em>
              </MenuItem>
              <MenuItem value="Spring">Spring</MenuItem>
              <MenuItem value="Summer">Summer</MenuItem>
              <MenuItem value="Fall">Fall</MenuItem>
              <MenuItem value="Winter">Winter</MenuItem>
            </Select>
            {!isEditMode && (
              <FormHelperText>When you plan to graduate</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth required={!isEditMode}>
            <InputLabel id="grad-year-label">Year</InputLabel>
            <Select
              labelId="grad-year-label"
              value={gradYear}
              label="Year"
              onChange={(e) => setGradYear(e.target.value as number | "")}
            >
              <MenuItem value="">
                <em>Select year</em>
              </MenuItem>
              {Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() + i;
                return (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                );
              })}
            </Select>
            {!isEditMode && (
              <FormHelperText>You can edit this later</FormHelperText>
            )}
          </FormControl>
        </div>
      </div>

      {/* Career Goals */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <h3 className="font-header-bold" style={{ fontSize: '1rem', marginBottom: 8 }}>
          Career Goals
        </h3>
        <p className="font-body" style={{ color: "var(--text-secondary, #666)", marginBottom: 12, fontSize: '0.9rem' }}>
          What are your career aspirations? (Optional)
        </p>

        <textarea
          value={careerGoalsText}
          onChange={(e) => setCareerGoalsText(e.target.value)}
          placeholder="E.g., I want to work in software engineering, focus on AI/ML, and eventually start my own company..."
          maxLength={1000}
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border, #ccc)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            resize: 'vertical',
          }}
        />
        <p className="font-body" style={{ color: "var(--text-secondary, #666)", fontSize: '0.8rem', marginTop: 4 }}>
          {careerGoalsText.length}/1000 characters
        </p>
      </div>

      {/* Transcript Upload - only show in create mode, not edit mode */}
      {!isEditMode && (
        <div style={{ marginTop: 24 }}>
          <TranscriptUploadSection />
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        {(() => {
          let buttonLabel = "Continue";
          if (isEditMode) buttonLabel = "Update Profile";
          if (saving) buttonLabel = "Saving…";
          return (
            <button
          type="submit"
          disabled={!canSubmit || saving}
          aria-disabled={!canSubmit || saving}
          className="font-body-medium"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--border-light)",
            background: canSubmit && !saving ? "black" : "var(--text-muted, #999)",
            color: "white",
          }}
        >
          {buttonLabel}
        </button>
          );
        })()}
      </div>
    </form>
  );
}
