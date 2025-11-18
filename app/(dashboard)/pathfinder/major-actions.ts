"use server";
import { supabase } from '@/lib/supabase';

export async function fetchMajorByName(universityId: number, majorName: string) {
  const { data, error } = await supabase
    .from('program')
    .select('id, name, program_type, requirements')
    .eq('university_id', universityId)
    .eq('program_type', 'major')
    .ilike('name', majorName);

  if (error) {
    console.error('❌ fetchMajorByName error:', error);
    return { success: false, message: 'Failed fetching major', error };
  }
  if (!data?.length) {
    return { success: false, message: 'Major not found' };
  }
  // return the closest exact (case-insensitive) match first
  const exact = data.find(d => d.name.toLowerCase() === majorName.toLowerCase()) || data[0];
  return { success: true, major: exact };
}

export async function fetchMinorByName(universityId: number, minorName: string) {
  const { data, error } = await supabase
    .from('program')
    .select('id, name, program_type, requirements')
    .eq('university_id', universityId)
    .eq('program_type', 'minor')
    .ilike('name', minorName);

  if (error) {
    console.error('❌ fetchMinorByName error:', error);
    return { success: false, message: 'Failed fetching minor', error };
  }
  if (!data?.length) {
    return { success: false, message: 'Minor not found' };
  }
  const exact = data.find(d => d.name.toLowerCase() === minorName.toLowerCase()) || data[0];
  return { success: true, minor: exact };
}
