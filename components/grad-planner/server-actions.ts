import { supabase } from "@/lib/supabase";

export default async function GetProgramsForUniversity(university_id: number) {
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', false);

    if (error) {
      console.error('Error fetching programs:', error);
      return [];
    }
    console.log(data);

    return data;
}

export async function GetGenEdsForUniversity(university_id: number) {
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('university_id', university_id)
      .eq('is_general_ed', true);

    if (error) {
      console.error('Error fetching general education programs:', error);
      return [];
    }
    console.log(data);

    return data;
}

