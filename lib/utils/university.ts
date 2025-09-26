import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { University } from '@/lib/types/university';

export async function getUserUniversity(userId: string): Promise<University | null> {
  const supabase = createSupabaseBrowserClient();

  try {
    // First get the user's university_id from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('university_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.university_id) {
      console.error('Error getting user university_id:', profileError);
      return null;
    }

    // Then get the university details
    const { data: university, error: universityError } = await supabase
      .from('university')
      .select('*')
      .eq('id', profile.university_id)
      .single();

    if (universityError) {
      console.error('Error getting university:', universityError);
      return null;
    }

    return university as University;
  } catch (error) {
    console.error('Error in getUserUniversity:', error);
    return null;
  }
}

export function getUniversityByDomain(domain: string): Promise<University | null> {
  const supabase = createSupabaseBrowserClient();

  return supabase
    .from('university')
    .select('*')
    .eq('domain', domain)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.error('Error getting university by domain:', error);
        return null;
      }
      return data as University;
    });
}

export function extractDomainFromEmail(email: string): string {
  return email.split('@')[1] || '';
}

export function getSubdomainFromHost(host: string): string {
  const parts = host.split('.');
  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0];
  }
  return '';
}

export async function updateUniversityColors(
  universityId: number,
  colors: Partial<Pick<University, 'primary_color' | 'secondary_color' | 'accent_color' | 'dark_color' | 'light_color' | 'text_color' | 'secondary_text_color'>>
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();

  try {
    // Convert undefined values to null for database
    const cleanedColors = Object.fromEntries(
      Object.entries(colors).map(([key, value]) => [key, value === undefined ? null : value])
    );

    const { error } = await supabase
      .from('university')
      .update(cleanedColors)
      .eq('id', universityId);

    if (error) {
      console.error('Error updating university colors:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUniversityColors:', error);
    return false;
  }
}

export const DEFAULT_THEME_COLORS = {
  primary_color: '#12F987',
  secondary_color: '#0F7B5A',
  accent_color: '#20E89F',
  dark_color: '#0A5940',
  light_color: '#80F4C3',
  text_color: '#FFFFFF',
  secondary_text_color: '#CCCCCC'
};