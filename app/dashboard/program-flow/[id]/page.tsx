import { redirect, notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import { db } from "@/lib/database";
import type { ProgramRow } from "@/types/program";
import ProgramFlowDetailClient from "@/components/program-flow/program-flow-detail-client";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramFlowDetailPage({ params }: Readonly<PageProps>) {
  const { id } = await params;

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

  // Fetch the specific program
  const { data: program, error: programError } = await db
    .from('program')
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements, is_general_ed')
    .eq('id', id)
    .eq('university_id', profile.university_id) // Ensure advisor can only view programs from their university
    .single();

  if (programError || !program) {
    notFound();
  }

  return <ProgramFlowDetailClient program={program as ProgramRow} />;
}
