import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseDatabaseAdapter } from './supabase.adapter';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = (): SupabaseClient => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  } as unknown as SupabaseClient;
};

describe('SupabaseDatabaseAdapter', () => {
  let mockSupabase: SupabaseClient;
  let adapter: SupabaseDatabaseAdapter;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    adapter = new SupabaseDatabaseAdapter(mockSupabase);
  });

  describe('from() - Query Builder', () => {
    it('should create a query builder for a table', () => {
      const query = adapter.from('program');
      expect(mockSupabase.from).toHaveBeenCalledWith('program');
      expect(query).toBeDefined();
    });

    it('should chain select() method', async () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();
      mockQuery.then.mockImplementation((resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: 1 }], error: null }).then(resolve)
      );

      const result = await adapter.from('program').select('*');

      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.error).toBeNull();
    });

    it('should chain multiple methods', async () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();

      adapter.from('program').select('*').eq('id', 1).order('created_at');

      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', undefined);
    });

    it('should handle errors in queries', async () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();
      const mockError = { message: 'Test error', code: '500' };
      mockQuery.then.mockImplementation((resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: mockError }).then(resolve)
      );

      const result = await adapter.from('program').select('*');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        message: 'Test error',
        code: '500',
        details: undefined,
        hint: undefined,
      });
    });
  });

  describe('auth - Authentication', () => {
    it('should get current user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await adapter.auth.getUser();

      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('should handle sign in', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      (mockSupabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await adapter.auth.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.user).toEqual(mockUser);
    });

    it('should handle sign out', async () => {
      const result = await adapter.auth.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    it('should handle auth errors', async () => {
      const mockError = { message: 'Invalid credentials', code: 'auth_error' };
      (mockSupabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await adapter.auth.getUser();

      expect(result.data.user).toBeNull();
      expect(result.error).toEqual({
        message: 'Invalid credentials',
        code: 'auth_error',
        details: undefined,
        hint: undefined,
      });
    });
  });

  describe('rpc() - Remote Procedure Calls', () => {
    it('should call RPC function', async () => {
      const mockResult = { count: 10 };
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await adapter.rpc('get_program_count', { university_id: 1 });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_program_count', {
        university_id: 1,
      });
      expect(result.data).toEqual(mockResult);
      expect(result.error).toBeNull();
    });

    it('should handle RPC errors', async () => {
      const mockError = { message: 'Function not found', code: 'P0001' };
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await adapter.rpc('invalid_function');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        message: 'Function not found',
        code: 'P0001',
        details: undefined,
        hint: undefined,
      });
    });
  });

  describe('Query Builder Methods', () => {
    it('should support insert()', () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();
      const data = { name: 'Computer Science', university_id: 1 };

      adapter.from('program').insert(data);

      expect(mockQuery.insert).toHaveBeenCalledWith(data);
    });

    it('should support update()', () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();
      const updates = { name: 'Updated Name' };

      adapter.from('program').update(updates);

      expect(mockQuery.update).toHaveBeenCalledWith(updates);
    });

    it('should support delete()', () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();

      adapter.from('program').delete();

      expect(mockQuery.delete).toHaveBeenCalled();
    });

    it('should support single()', async () => {
      const mockQuery = (mockSupabase.from as ReturnType<typeof vi.fn>)();
      const mockData = { id: 1, name: 'Test' };
      mockQuery.single.mockResolvedValue({ data: mockData, error: null });

      const result = await adapter.from('program').select('*').eq('id', 1).single();

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });
  });
});
