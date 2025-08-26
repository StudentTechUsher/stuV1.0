"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  const [interestsOpts, setInterestsOpts] = useState<Option[]>([]);
  const [careerOpts, setCareerOpts] = useState<Option[]>([]);
  const [classPrefOpts, setClassPrefOpts] = useState<Option[]>([]);

  // Selected values
  const [universityId, setUniversityId] = useState<number | null>(null); // single
  const [majors, setMajors] = useState<number[]>([]);
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
            .select("university_id, selected_majors, selected_interests, career_options, class_preferences")
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
              selected_interests: number[] | null;
              career_options: number[] | null;
              class_preferences: number[] | null;
            };

        if (existing) {
          setUniversityId(existing.university_id ?? null);
          setInterests(existing.selected_interests ?? []);
          setCareerSelections(existing.career_options ?? []);
          setClassPreferences(existing.class_preferences ?? []);
          // Load majors filtered by university, then set selections
          const uni = existing.university_id;
          if (uni != null) {
            const { data: majorsData, error: majorsErr } = await supabase
              .from("major")
              .select("id,name")
              .eq("university_id", uni)
              .order("name");
            if (majorsErr) throw majorsErr;
            setMajorsOpts((majorsData ?? []) as Option[]);
            setMajors(existing.selected_majors ?? []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // When university changes, (re)load majors list
  useEffect(() => {
    (async () => {
      if (universityId == null) {
        setMajorsOpts([]);
        setMajors([]);
        return;
      }
      const { data, error } = await supabase
        .from("major")
        .select("id,name")
        .eq("university_id", universityId)
        .order("name");
      if (error) {
        setError(error.message);
        setMajorsOpts([]);
        setMajors([]);
        return;
      }
      setMajorsOpts((data ?? []) as Option[]);
      setMajors([]); // clear selections when switching universities
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
      <select
        multiple
        size={Math.max(3, Math.min(options.length, 8))}
        value={values.map(String)}
        onChange={(e) => {
          if (disabled) return;
          const selected = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
          onChange(selected);
        }}
        disabled={disabled}
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: 8,
          border: "1px solid #e5e5e5",
          padding: "8px",
          background: "white",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {options.map((opt) => (
          <option key={opt.id} value={String(opt.id)}>
            {opt.name}
          </option>
        ))}
        {options.length === 0 && (
          <option disabled>No options available.</option>
        )}
      </select>
    </div>
  );
}
