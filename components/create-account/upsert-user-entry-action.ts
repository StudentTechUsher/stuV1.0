'use server';

import { supabase } from '@/lib/supabase';
import { validateAndSanitizeUserEntry } from '@/lib/validation/userInputValidation';

type TableName = 'student_interests' | 'career_options';

interface UpsertResult {
  ok: boolean;
  id?: number;
  name?: string;
  error?: string;
}

/**
 * AUTHORIZATION: STUDENTS AND ABOVE
 * Upserts a new user-submitted entry into student_interests or career_options table
 * @param table - The table to insert into ('student_interests' or 'career_options')
 * @param entry - The user-submitted entry text
 * @returns Result with ok flag, id, and name if successful
 */
export async function upsertUserEntry(
  table: TableName,
  entry: string
): Promise<UpsertResult> {
  // Validate and sanitize the input
  const validation = validateAndSanitizeUserEntry(entry);

  if (!validation.isValid) {
    return {
      ok: false,
      error: validation.error || 'Invalid entry',
    };
  }

  const { sanitized } = validation;

  try {
    // Check if entry already exists (case-insensitive)
    const { data: existing, error: searchError } = await supabase
      .from(table)
      .select('id, name')
      .ilike('name', sanitized);

    if (searchError) {
      console.error(`Error checking for existing ${table} entry:`, searchError);
      return {
        ok: false,
        error: `Failed to check for existing entry`,
      };
    }

    // If it exists, return the existing entry
    if (existing && existing.length > 0) {
      return {
        ok: true,
        id: existing[0].id,
        name: existing[0].name,
      };
    }

    // Insert new entry
    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert({ name: sanitized })
      .select('id, name')
      .single();

    if (insertError) {
      console.error(`Error inserting new ${table} entry:`, insertError);
      return {
        ok: false,
        error: `Failed to add new entry`,
      };
    }

    return {
      ok: true,
      id: inserted.id,
      name: inserted.name,
    };
  } catch (error) {
    console.error(`Unexpected error in upsertUserEntry for ${table}:`, error);
    return {
      ok: false,
      error: 'An unexpected error occurred',
    };
  }
}
