import { supabase } from '@/lib/supabaseClient';
import type { ProgramRow } from '@/types/program';


export async function fetchProgramsByUniversity(universityId: number): Promise<ProgramRow[]> {
    const { data, error } = await supabase
    .from('program')
    .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
    .eq('university_id', universityId)
    .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ProgramRow[];
}


export async function updateProgramRequirements(id: string, requirements: unknown): Promise<ProgramRow> {
    const { data, error } = await supabase
        .from('program')
        .update({ requirements })
        .eq('id', id)
        .select('id, university_id, name, program_type, version, created_at, modified_at, requirements')
        .single();

    if (error) throw error;
    return data as ProgramRow;
}