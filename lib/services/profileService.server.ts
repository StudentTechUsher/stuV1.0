"use server";
import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import type { AdvisorStudentRow } from './profileService';

/** Server-side variant to be called in RSC pages (avoids exposing multiple round trips client-side). */
export async function getStudentsWithProgramsServer(): Promise<AdvisorStudentRow[]> {
  try {
    const supabaseSrv = await createSupabaseServerComponentClient();
    const { data: profiles, error: profilesError } = await supabaseSrv
      .from('profiles')
      .select('id, fname, lname')
      .eq('role_id', 3);
    if (profilesError || !profiles?.length) return [];

    const profileIds = profiles.map(p => p.id);
    const { data: students, error: studentsError } = await supabaseSrv
      .from('student')
      .select('profile_id, selected_programs')
      .in('profile_id', profileIds);
    if (studentsError) return profiles.map(p => ({ id: p.id, fname: p.fname, lname: p.lname, programs: '' }));

    const programIds = new Set<number>();
    const studentProgramsMap = new Map<string, number[]>();
    students?.forEach(s => {
      const list = Array.isArray(s.selected_programs) ? s.selected_programs.filter((x: any) => Number.isInteger(x)) : [];
      studentProgramsMap.set(s.profile_id, list);
      list.forEach(id => programIds.add(id));
    });

    let programNameMap = new Map<number, string>();
    if (programIds.size) {
      const { data: programs, error: programsError } = await supabaseSrv
        .from('program')
        .select('id, name')
        .in('id', Array.from(programIds));
      if (!programsError && programs) {
        programNameMap = new Map(programs.map(p => [p.id, p.name]));
      }
    }
    return profiles.map(p => {
      const ids = studentProgramsMap.get(p.id) || [];
      const names = ids.map(id => programNameMap.get(id)).filter(Boolean) as string[];
      return { id: p.id, fname: p.fname, lname: p.lname, programs: names.join(', ') };
    });
  } catch (e) {
    console.error('❌ Server fetch students failed:', e);
    return [];
  }
}
