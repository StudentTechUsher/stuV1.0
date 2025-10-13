"use server";

/**
 * Institution Service
 *
 * Handles institution/university settings and configuration
 */

import { createSupabaseServerComponentClient } from '@/lib/supabase/server';
import { coerceSelectionMode, type SelectionMode } from '@/lib/selectionMode';
import { InstitutionNotFoundError, InstitutionFetchError, InstitutionUpdateError, InstitutionUnauthorizedError } from './errors/institutionErrors';

/**
 * AUTHORIZATION: MEMBERS OF INSTITUTION
 * Fetches institution settings for a university
 * @param universityId - The university ID
 * @returns Institution settings object
 */
export async function fetchInstitutionSettings(universityId: number) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { data: settings, error } = await supabase
      .from('institution_settings')
      .select('selection_mode')
      .eq('university_id', universityId)
      .single();

    if (error) {
      // If no settings exist, return default
      if (error.code === 'PGRST116') {
        return { selection_mode: 'MANUAL' as SelectionMode };
      }
      throw new InstitutionFetchError('Failed to fetch institution settings', error);
    }

    return {
      selection_mode: coerceSelectionMode(settings?.selection_mode),
    };
  } catch (error) {
    if (error instanceof InstitutionFetchError) {
      throw error;
    }
    throw new InstitutionFetchError('Unexpected error fetching institution settings', error);
  }
}

/**
 * AUTHORIZATION: ADMINS ONLY
 * Updates institution settings for a university
 * @param universityId - The university ID
 * @param selectionMode - The selection mode to set
 * @param userId - The user ID making the update
 * @returns Updated settings object
 */
export async function updateInstitutionSettings(
  universityId: number,
  selectionMode: SelectionMode,
  userId: string
) {
  try {
    const supabase = await createSupabaseServerComponentClient();

    const { data, error } = await supabase
      .from('institution_settings')
      .upsert(
        {
          university_id: universityId,
          selection_mode: selectionMode,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: 'university_id' }
      )
      .select()
      .single();

    if (error) {
      // If it's a policy violation, the user is not an admin
      if (error.code === '42501' || error.message?.includes('policy')) {
        throw new InstitutionUnauthorizedError();
      }
      throw new InstitutionUpdateError('Failed to update institution settings', error);
    }

    return {
      selection_mode: data.selection_mode,
      updated_at: data.updated_at,
    };
  } catch (error) {
    if (error instanceof InstitutionUnauthorizedError || error instanceof InstitutionUpdateError) {
      throw error;
    }
    throw new InstitutionUpdateError('Unexpected error updating institution settings', error);
  }
}
