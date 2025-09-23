"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Option } from "@/types/option";
import ChipsField from "@/helpers/chips-field";
import SingleSelect from "@/helpers/single-select";
import { TextField } from "@mui/material";

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
      const fname = firstName.trim();
      const lname = lastName.trim();
      if (!fname || !lname) throw new Error("Please enter your first and last name.");
      if (universityId == null) throw new Error("Please select your university.");

      const uniq = (xs: number[]) => Array.from(new Set(xs.filter(n => Number.isFinite(n))));

      // 1) Ensure profile exists (now including fname/lname + university_id)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, fname, lname, university_id: universityId },
          { onConflict: "id" }
        )
        .select("id")
        .single();

      if (profileError) {
        console.error("[CreateAccount] Profile upsert error:", profileError);
        setError(profileError.message || "Could not save your profile.");
        setSaving(false);
        return;
      }

      // 2) Upsert student preferences referencing that profile
      // Store just the program IDs in selected_programs
      const selectedProgramIds = [...uniq(majors), ...uniq(minors)];

      console.log("[CreateAccount] Selected program IDs:", selectedProgramIds);
      console.log("[CreateAccount] Selected interests:", uniq(interests));

      const studentRow = {
        profile_id: userId,                       // FK to profiles.id (UUID)
        selected_programs: selectedProgramIds.length > 0 ? selectedProgramIds : null,
        selected_interests: uniq(interests).length > 0 ? uniq(interests) : null,
        career_options: uniq(careerSelections).length > 0 ? uniq(careerSelections) : null,
        class_preferences: uniq(classPreferences).length > 0 ? uniq(classPreferences) : null,
      };

      console.log("[CreateAccount] Upserting student row →", studentRow);

      const { data, error } = await supabase
        .from("student")
        .upsert(studentRow, { onConflict: "profile_id" })
        .select("profile_id, selected_programs, selected_interests, career_options, class_preferences")
        .single();

      if (error) {
        console.error("[CreateAccount] Student upsert error:", error);
        setError(error.message || "Could not save your preferences.");
        setSaving(false);
        return;
      }

      console.log("[CreateAccount] Upsert OK:", data);
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
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          id="lname"
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          inputProps={{ maxLength: 100 }}
        />
      </div>

      <p style={{ color: "#666", marginBottom: 16 }}>
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

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          aria-disabled={!canSubmit || saving}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: canSubmit && !saving ? "black" : "#999",
            color: "white",
            fontWeight: 600,
          }}
        >
          {saving ? "Saving…" : (isEditMode ? "Update Profile" : "Continue")}
        </button>
      </div>
    </form>
  );
}
