"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

type Option = { id: number; name: string; university_id?: number | null };

type Preload = {
  universities: Option[];
  majorsAll: Option[];   // include university_id
  minorsAll: Option[];   // include university_id
  interests: Option[];
  careers: Option[];
  classPrefs: Option[];
};

type Initial = {
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
};

export default function CreateAccountForm({ userId, nextHref, preload, initial }: Readonly<Props>) {
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

  // Helper: keep only values that exist in options
  const clampToOptions = useCallback((values: number[], options: Option[]) => {
    const valid = new Set(options.map(o => o.id));
    return values.filter(v => valid.has(v));
  }, []);

  // Prefill from server-provided initial (once)
  useEffect(() => {
    if (!initial) return;
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
      setMinorsOpts([]); // show all minors if no uni picked
      setMajors(prev => []);            // no majors until a uni is chosen
      setMinors(prev => []);
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

  const canSubmit = useMemo(() => universityId != null, [universityId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (universityId == null) throw new Error("Please select your university.");

      // Sanitize & log before sending
      const uniq = (xs: number[]) => Array.from(new Set(xs.filter(n => Number.isFinite(n))));
      const row = {
        profile_id: userId,                    // must be a UUID matching auth.users.id
        selected_majors:      uniq(majors),    // int8[]
        selected_minors:      uniq(minors),    // int8[]
        selected_interests:   uniq(interests), // int8[]
        career_options:       uniq(careerSelections), // int8[]
        class_preferences:    uniq(classPreferences), // int8[]
      };
      const profileUpdate: Record<string, unknown> = { id: userId, universityId: universityId }; 

      console.log("[CreateAccount] Upserting student row →", row);

      // Ask PostgREST to return the row so errors include context
      const { error: profileError } = await supabase
        .from("profile")
        .upsert(profileUpdate, { onConflict: "id" });

      const { data, error } = await supabase
        .from("student")
        .upsert(row, { onConflict: "profile_id" })
        .select("profile_id, university_id, selected_majors, selected_minors, selected_interests, career_options, class_preferences")
        .single();

      if (error) {
        console.error("[CreateAccount] Upsert error:", error);
        // Show a concise error to the user but keep full detail in the console
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

      <SingleSelect
        label="University"
        helper="Select your current university."
        options={universities}
        value={universityId}
        onChange={(e) => setUniversityId(e.target.value ? Number(e.target.value) : null)}
        placeholder="Choose a university"
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
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}

/* ---------- UI helpers ---------- */

function SingleSelect({
  label,
  helper,
  options,
  value,
  onChange,
  placeholder,
}: Readonly<{
  label: string;
  helper?: string;
  options: Option[];
  value: number | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}>) {
  const id = `sel-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const helperId = helper ? `${id}-help` : undefined;

  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
        {label}
      </label>
      {helper && (
        <div id={helperId} style={{ color: "#666", marginBottom: 8 }}>
          {helper}
        </div>
      )}
      <select
        id={id}
        aria-describedby={helperId}
        value={value == null ? "" : String(value)}
        onChange={onChange}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 8,
          border: "1px solid #e5e5e5",
          padding: "0 8px",
          background: "white",
        }}
      >
        <option value="" disabled>
          {placeholder ?? "Select…"}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={String(opt.id)}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChipsField({
  label,
  helper,
  options,
  values,
  onChange,
  disabled,
}: Readonly<{
  label: string;
  helper?: string;
  options: Option[];
  values: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}>) {
  const id = `chips-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const toggle = useCallback(
    (val: number) => {
      if (disabled) return;
      onChange(((prev: Iterable<unknown> | null | undefined) => {
        const set = new Set(prev);
        set.has(val) ? set.delete(val) : set.add(val);
        return Array.from(set);
      }) as unknown as number[]); // TS appeasement for functional updates
    },
    [disabled, onChange]
  );

  return (
    <div style={{ marginBottom: 16, opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {label}
        </label>
        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            style={{ fontSize: 12, color: "#555", textDecoration: "underline", background: "none" }}
            aria-label={`Clear ${label} selections`}
          >
            Clear
          </button>
        )}
      </div>
      {helper && <div style={{ color: "#666", marginBottom: 8 }}>{helper}</div>}

      <Stack
        id={id}
        role="listbox"
        aria-multiselectable="true"
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
      >
        {options.map((opt) => {
          const selected = values.includes(opt.id);
          return (
            <Chip
              key={opt.id}
              label={opt.name}
              onClick={() => toggle(opt.id)}
              clickable
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              sx={{ mb: 1 }}
              role="option"
              aria-selected={selected}
            />
          );
        })}
        {options.length === 0 && <span style={{ color: "#777" }}>No options available.</span>}
      </Stack>
    </div>
  );
}
