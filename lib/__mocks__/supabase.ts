import { vi } from 'vitest';

/**
 * Mock Supabase Client for Testing
 *
 * This mock provides a chainable interface that mimics Supabase's query builder.
 * Use this in your tests to mock database operations without hitting a real database.
 *
 * Usage in tests:
 * ```ts
 * import { supabase } from '@/lib/supabase';
 *
 * vi.mock('@/lib/supabase', () => ({
 *   supabase: mockSupabase
 * }));
 *
 * // Then in your test:
 * mockSupabase.from('program').select.mockReturnThis();
 * mockSupabase.eq.mockReturnThis();
 * mockSupabase.order.mockResolvedValue({ data: [...], error: null });
 * ```
 */

export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  auth: {
    getUser: vi.fn(),
  },
};
