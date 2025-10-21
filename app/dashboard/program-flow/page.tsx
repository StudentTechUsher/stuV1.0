import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import { fetchProgramsByUniversity } from "@/lib/services/programService";
import ProgramFlowClient from "@/components/program-flow/program-flow-client";

export const dynamic = 'force-dynamic';

export default async function ProgramFlowPage() {
  // Create Supabase server client
  const supabase = await createServerSupabase();

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Check user's role - must be advisor (role_id = 2)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id, university_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role_id !== 2) {
    // Not an advisor - redirect to dashboard
    redirect('/dashboard');
  }

  // Fetch programs for the advisor's university
  const programs = await fetchProgramsByUniversity(profile.university_id);

  return <ProgramFlowClient programs={programs} />;
}
