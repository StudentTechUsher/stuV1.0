"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Chip from "@mui/material/Chip";

type Option = { id: number; name: string };

type Props = {
  userId: string;   // auth.users.id (uuid)
  nextHref: string;
};

export default function CreateAccountForm({ userId, nextHref }: Readonly<Props>) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [universities, setUniversities] = useState<Option[]>([]);
  const [majorsOpts, setMajorsOpts] = useState<Option[]>([]);
  const [minorsOpts, setMinorsOpts] = useState<Option[]>([]);
  const [interestsOpts, setInterestsOpts] = useState<Option[]>([]);
  const [careerOpts, setCareerOpts] = useState<Option[]>([]);
  const [classPrefOpts, setClassPrefOpts] = useState<Option[]>([]);

  // Selected values
  const [universityId, setUniversityId] = useState<number | null>(null); // single
  const [majors, setMajors] = useState<number[]>([]);
  const [minors, setMinors] = useState<number[]>([]);
  const [interests, setInterests] = useState<number[]>([]);
  const [careerSelections, setCareerSelections] = useState<number[]>([]);
  const [classPreferences, setClassPreferences] = useState<number[]>([]);

  // Load lookups + existing row
  useEffect(() => {
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [uniRes, interestsRes, careerRes, classRes, existingRes] = await Promise.all([
          supabase.from("university").select("id,name").order("name"),
          supabase.from("student_interests").select("id,name").order("name"),
          supabase.from("career_options").select("id,name").order("name"),
          supabase.from("class_preferences").select("id,name").order("name"),
          supabase
            .from("student")
            .select("university_id, selected_majors, selected_minors, selected_interests, career_options, class_preferences")
            .eq("profile_id", userId)
            .maybeSingle(),
        ]);

        if (uniRes.error) throw uniRes.error;
        if (interestsRes.error) throw interestsRes.error;
        if (careerRes.error) throw careerRes.error;
        if (classRes.error) throw classRes.error;
        if (existingRes.error && existingRes.error.code !== "PGRST116") throw existingRes.error;

        setUniversities((uniRes.data ?? []) as Option[]);
        setInterestsOpts((interestsRes.data ?? []) as Option[]);
        setCareerOpts((careerRes.data ?? []) as Option[]);
        setClassPrefOpts((classRes.data ?? []) as Option[]);

        const existing = existingRes.data as
          | null
          | {
              university_id: number | null;
              selected_majors: number[] | null;
              selected_minors: number[] | null;
              selected_interests: number[] | null;
              career_options: number[] | null;
              class_preferences: number[] | null;
            };

        if (existing) {
          setUniversityId(existing.university_id ?? null);
          setInterests(existing.selected_interests ?? []);
          setCareerSelections(existing.career_options ?? []);
          setClassPreferences(existing.class_preferences ?? []);
          setMinors(existing.selected_minors ?? []);
          // Load majors/minors filtered by university, then set selections
          const uni = existing.university_id;
          if (uni != null) {
            const [majorsQuery, minorsQuery] = await Promise.all([
              supabase
                .from("major")
                .select("id,name")
                .eq("university_id", uni)
                .order("name"),
              supabase
                .from("minor")
                .select("id,name")
                .eq("university_id", uni)
                .order("name"),
            ]);
            if (majorsQuery.error) throw majorsQuery.error;
            if (minorsQuery.error) throw minorsQuery.error;
            setMajorsOpts((majorsQuery.data ?? []) as Option[]);
            setMinorsOpts((minorsQuery.data ?? []) as Option[]);
            setMajors(existing.selected_majors ?? []);
            setMinors(existing.selected_minors ?? []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // When university changes, (re)load majors and minors lists
  useEffect(() => {
    (async () => {
      if (universityId == null) {
        setMajorsOpts([]);
        setMinorsOpts([]);
        setMajors([]);
        setMinors([]);
        return;
      }
      const [{ data: majorsData, error: majorsErr }, { data: minorsData, error: minorsErr }] =
        await Promise.all([
          supabase
            .from("major")
            .select("id,name")
            .eq("university_id", universityId)
            .order("name"),
          supabase
            .from("minor")
            .select("id,name")
            .eq("university_id", universityId)
            .order("name"),
        ]);
      if (majorsErr || minorsErr) {
        setError((majorsErr ?? minorsErr)?.message ?? null);
        setMajorsOpts([]);
        setMinorsOpts([]);
        setMajors([]);
        setMinors([]);
        return;
      }
      setMajorsOpts((majorsData ?? []) as Option[]);
      setMinorsOpts((minorsData ?? []) as Option[]);
      setMajors([]); // clear selections when switching universities
      setMinors([]);
    })();
  }, [universityId]);

  const canSubmit = useMemo(() => universityId != null, [universityId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (universityId == null) throw new Error("Please select your university.");
      const { error } = await supabase.from("student").upsert(
        {
          profile_id: userId,
          university_id: universityId,
          selected_majors: majors,
          selected_minors: minors,
          selected_interests: interests,
          career_options: careerSelections,
          class_preferences: classPreferences,
        },
        { onConflict: "profile_id" }
      );
      if (error) throw error;
      router.push(nextHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  if (loading) return <div>Loading form…</div>;

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div
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

      <SingleField
        label="University"
        helper="Select your current university."
        options={universities}
        value={universityId}
        onChange={(e) => setUniversityId(e.target.value ? Number(e.target.value) : null)}
        placeholder="Choose a university"
      />

      <ChipsField
        label="Major(s)"
        helper={universityId == null
          ? "Choose a university first to see available majors."
          : "Choose one or more majors you’re pursuing or considering."}
        options={majorsOpts}
        values={majors}
        onChange={setMajors}
        disabled={universityId == null || majorsOpts.length === 0}
      />

      <ChipsField
        label="Minor(s)"
        helper={universityId == null
          ? "Choose a university first to see available minors."
          : "Choose one or more minors you’re pursuing or considering."}
        options={minorsOpts}
        values={minors}
        onChange={setMinors}
        disabled={universityId == null || minorsOpts.length === 0}
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

function SingleField({
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
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {helper && <div style={{ color: "#666", marginBottom: 8 }}>{helper}</div>}
      <select
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
  function toggle(id: number) {
    if (disabled) return;
    const set = new Set(values);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange(Array.from(set));
  }

  return (
    <div style={{ marginBottom: 16, opacity: disabled ? 0.6 : 1 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {helper && <div style={{ color: "#666", marginBottom: 8 }}>{helper}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const selected = values.includes(opt.id);
          return (
            <Chip
              key={opt.id}
              label={opt.name}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => toggle(opt.id)}
              style={{ cursor: disabled ? "not-allowed" : "pointer" }}
            />
          );
        })}
        {options.length === 0 && (
          <div style={{ color: "#666" }}>No options available.</div>
        )}
      </div>
    </div>
  );
}
