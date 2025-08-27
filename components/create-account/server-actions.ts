import "server-only";
import { createClient } from "@supabase/supabase-js";

export type Option = { id: number; name: string; university_id?: number | null };

function sClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function listUniversities(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("university").select("id,name").order("name");
  if (error) throw new Error(`[university] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listMajors(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("major")
    .select("id,name,university_id")
    .order("name");
  if (error) throw new Error(`[major] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listMinors(): Promise<Option[]> {
  const supabase = sClient();
  // include university_id if present; if not, just drop it
  const { data, error } = await supabase.from("minor")
    .select("id,name,university_id")
    .order("name");
  if (error) throw new Error(`[minor] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listStudentInterests(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("student_interests").select("id,name").order("name");
  if (error) throw new Error(`[student_interests] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listCareerOptions(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("career_options").select("id,name").order("name");
  if (error) throw new Error(`[career_options] ${error.message}`);
  return (data ?? []) as Option[];
}

export async function listClassPreferences(): Promise<Option[]> {
  const supabase = sClient();
  const { data, error } = await supabase.from("class_preferences").select("id,name").order("name");
  if (error) throw new Error(`[class_preferences] ${error.message}`);
  return (data ?? []) as Option[];
}
