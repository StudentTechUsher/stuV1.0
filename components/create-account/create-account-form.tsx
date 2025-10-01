"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
// Removed direct client-side upsert; persistence handled by server action now.
import { saveProfileAndPreferences } from "./save-profile-action";
import { Option } from "@/types/option";
import ChipsField from "@/helpers/chips-field";
import SingleSelect from "@/helpers/single-select";
import { TextField } from "@mui/material";
import TranscriptUploadSection from "@/components/transcript/TranscriptUploadSection";

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
  const [interestsOpts] = useState<Option[]>(preload.interests);
  const [careerOpts] = useState<Option[]>(preload.careers);
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
    return (
      universityId != null &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0
    );
  }, [universityId, firstName, lastName]);

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

      <ChipsField
        label="Major(s)"
        helper={
          universityId == null
            ? "Choose a university first to see available majors."
            : "Choose one or more majors you’re pursuing or considering."
        }
        options={majorsOpts}
        values={majors}
        onChange={setMajors}
        disabled={universityId == null || majorsOpts.length === 0}
      />

      <ChipsField
        label="Minor(s)"
        helper="Optional – pick any minors you’re considering."
        options={minorsOpts}
        values={minors}
        onChange={setMinors}
        disabled={minorsOpts.length === 0}
      />

      <ChipsField
        label="Interests"
        helper="What subjects or areas excite you?"
        options={interestsOpts}
        values={interests}
        onChange={setInterests}
      />

      <ChipsField
        label="Potential career paths"
        helper="Where do you see yourself heading?"
        options={careerOpts}
        values={careerSelections}
        onChange={setCareerSelections}
      />

      <ChipsField
        label="Class preferences"
        helper="e.g., mornings, small seminars, online, project-based."
        options={classPrefOpts}
        values={classPreferences}
        onChange={setClassPreferences}
      />

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
