import { supabaseAdmin } from "../supabaseAdmin";
import type { Career } from '@/types/career';

// Custom error types for better error handling
export class CareerNotFoundError extends Error {
  constructor(message = 'Career not found') {
    super(message);
    this.name = 'CareerNotFoundError';
  }
}

export class CareerFetchError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CareerFetchError';
  }
}

export class CareerSaveError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CareerSaveError';
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Fetches all published careers or filters by search query
 * @param searchQuery - Optional search term to filter careers
 * @returns Array of careers matching the search
 */
export async function fetchCareers(searchQuery?: string): Promise<Career[]> {
  try {
    let query = supabaseAdmin
      .from('careers')
      .select('*')
      .eq('status', 'published')
      .order('title', { ascending: true });

    if (searchQuery && searchQuery.trim()) {
      const search = `%${searchQuery.trim()}%`;
      query = query.or(`title.ilike.${search},overview.ilike.${search},topSkills.cs.{${searchQuery.trim()}}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new CareerFetchError('Failed to fetch careers', error);
    }

    return data || [];
  } catch (error) {
    if (error instanceof CareerFetchError) {
      throw error;
    }
    throw new CareerFetchError('Failed to fetch careers', error);
  }
}

/**
 * AUTHORIZATION: PUBLIC
 * Fetches a single career by slug
 * @param slug - The career slug (e.g., 'data-analyst')
 * @returns The career data
 */
export async function fetchCareerBySlug(slug: string): Promise<Career> {
  const { data, error } = await supabaseAdmin
    .from('careers')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new CareerNotFoundError(`Career with slug "${slug}" not found`);
    }
    throw new CareerFetchError('Failed to fetch career', error);
  }

  return data;
}

/**
 * AUTHORIZATION: ADVISORS AND ABOVE
 * Saves a career as a draft (admin/advisor only)
 * @param career - The career data to save
 * @returns The saved career
 */
export async function saveCareerDraft(career: Partial<Career>): Promise<Career> {
  if (!career.id) {
    throw new CareerSaveError('Career ID is required');
  }

  const { data, error } = await supabaseAdmin
    .from('careers')
    .upsert({
      ...career,
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new CareerSaveError('Failed to save career draft', error);
  }

  return data;
}

/**
 * AUTHORIZATION: ADVISORS AND ABOVE
 * Publishes a career (makes it publicly visible)
 * @param careerSlug - The slug of the career to publish
 * @returns The published career
 */
export async function publishCareer(careerSlug: string): Promise<Career> {
  const { data, error } = await supabaseAdmin
    .from('careers')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('slug', careerSlug)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new CareerNotFoundError(`Career with slug "${careerSlug}" not found`);
    }
    throw new CareerSaveError('Failed to publish career', error);
  }

  return data;
}

/**
 * AUTHORIZATION: ADVISORS AND ABOVE
 * Lists all careers including drafts (admin/advisor only)
 * @returns Array of all careers
 */
export async function fetchAllCareers(): Promise<Career[]> {
  const { data, error } = await supabaseAdmin
    .from('careers')
    .select('*')
    .order('title', { ascending: true });

  if (error) {
    throw new CareerFetchError('Failed to fetch all careers', error);
  }

  return data || [];
}
