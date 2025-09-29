import { supabase } from '@/lib/supabaseClient';


export async function getUserUniversityId(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('profiles')
        .select('university_id')
        .eq('id', userId)
        .single();

    if (error) throw error;
    const raw = data?.university_id;
    if (raw === undefined || raw === null) {
        throw new Error('profiles.university_id not set for this user');
    }
    return typeof raw === 'string' ? Number(raw) : raw;
}