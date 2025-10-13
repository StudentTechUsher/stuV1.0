"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

interface SavePayload {
  userId: string;
  fname: string;
  lname: string;
  universityId: number;
  majors: number[];
  minors: number[];
  interests: number[];
  careerSelections: number[];
  classPreferences: number[];
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

async function serverClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

/**
 * Server action to persist profile and student preference data.
 * Consolidates logic previously performed client-side so RLS policies execute with user session.
 */
export async function saveProfileAndPreferences(payload: SavePayload): Promise<SaveResult> {
  try {
  const supabase = await serverClient();
    const {
      userId,
      fname,
      lname,
      universityId,
      majors,
      minors,
      interests,
      careerSelections,
      classPreferences,
    } = payload;

    if (!userId) return { ok: false, error: "Missing userId" };
    if (!fname.trim() || !lname.trim()) return { ok: false, error: "First and last name are required" };
    if (universityId == null) return { ok: false, error: "University is required" };

    const uniq = (xs: number[] | null | undefined) => {
      if (!xs || !Array.isArray(xs)) return [];
      return Array.from(new Set(xs.filter(n => Number.isFinite(n))));
    };

    // 1. Upsert profile and mark as onboarded
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        fname: fname.trim(),
        lname: lname.trim(),
        university_id: universityId,
        onboarded: true
      }, { onConflict: "id" });
    if (profileError) {
      console.error("[saveProfileAndPreferences] profile upsert", profileError);
      return { ok: false, error: profileError.message };
    }

    // 2. Upsert student row
    const selectedProgramIds = [...uniq(majors), ...uniq(minors)];

    const studentRow = {
      profile_id: userId,
      selected_programs: selectedProgramIds.length ? selectedProgramIds : null,
      selected_interests: uniq(interests).length ? uniq(interests) : null,
      targeted_career: uniq(careerSelections).length ? uniq(careerSelections) : null,
      class_preferences: uniq(classPreferences).length ? uniq(classPreferences) : null,
    };

    const { error: studentError } = await supabase
      .from("student")
      .upsert(studentRow, { onConflict: "profile_id" });
    if (studentError) {
      console.error("[saveProfileAndPreferences] student upsert", studentError);
      return { ok: false, error: studentError.message };
    }

    return { ok: true };
  } catch (error: unknown) {
    console.error("[saveProfileAndPreferences] unexpected", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, error: message };
  }
}
