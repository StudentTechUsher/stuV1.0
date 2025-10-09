/**
 * Supabase Database Adapter
 *
 * This adapter wraps the Supabase client to match our DatabaseClient interface.
 * To switch to a different database provider (PostgreSQL, MySQL, etc.),
 * create a new adapter file and swap it in lib/database/index.ts
 *
 * @see ../types.ts - Interface this implements
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  DatabaseClient,
  QueryBuilder,
  DatabaseResponse,
  DatabaseError,
  DatabaseAuth,
  DatabaseUser,
  AuthResponse,
} from '../types';

/**
 * Wraps Supabase's query builder to match our interface
 */
class SupabaseQueryBuilder<T = any> implements QueryBuilder<T> {
  constructor(private supabaseQuery: any) {}

  select(columns?: string): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.select(columns));
  }

  insert(data: any | any[]): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.insert(data));
  }

  update(data: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.update(data));
  }

  delete(): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.delete());
  }

  eq(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.eq(column, value));
  }

  neq(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.neq(column, value));
  }

  gt(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.gt(column, value));
  }

  gte(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.gte(column, value));
  }

  lt(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.lt(column, value));
  }

  lte(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.lte(column, value));
  }

  like(column: string, pattern: string): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.like(column, pattern));
  }

  ilike(column: string, pattern: string): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.ilike(column, pattern));
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.in(column, values));
  }

  is(column: string, value: null | boolean): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.is(column, value));
  }

  contains(column: string, value: any): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.contains(column, value));
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.order(column, options));
  }

  limit(count: number): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.limit(count));
  }

  range(from: number, to: number): QueryBuilder<T> {
    return new SupabaseQueryBuilder(this.supabaseQuery.range(from, to));
  }

  async single(): Promise<DatabaseResponse<T>> {
    const result = await this.supabaseQuery.single();
    return {
      data: result.data,
      error: result.error ? this.mapError(result.error) : null,
    };
  }

  async maybeSingle(): Promise<DatabaseResponse<T | null>> {
    const result = await this.supabaseQuery.maybeSingle();
    return {
      data: result.data,
      error: result.error ? this.mapError(result.error) : null,
    };
  }

  async then<TResult1 = DatabaseResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const result = await this.supabaseQuery;
      const response: DatabaseResponse<T[]> = {
        data: result.data,
        error: result.error ? this.mapError(result.error) : null,
      };
      return onfulfilled ? onfulfilled(response) : (response as any);
    } catch (error) {
      return onrejected ? onrejected(error) : Promise.reject(error);
    }
  }

  private mapError(error: any): DatabaseError {
    return {
      message: error.message || 'Database error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }
}

/**
 * Wraps Supabase's auth to match our interface
 */
class SupabaseAuth implements DatabaseAuth {
  constructor(private supabaseAuth: any) {}

  async getUser() {
    const result = await this.supabaseAuth.getUser();
    return {
      data: {
        user: result.data.user ? this.mapUser(result.data.user) : null,
      },
      error: result.error ? this.mapError(result.error) : null,
    };
  }

  async signIn(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const result = await this.supabaseAuth.signInWithPassword(credentials);
    return {
      user: result.data.user ? this.mapUser(result.data.user) : null,
      error: result.error ? this.mapError(result.error) : null,
    };
  }

  async signOut() {
    const result = await this.supabaseAuth.signOut();
    return {
      error: result.error ? this.mapError(result.error) : null,
    };
  }

  onAuthStateChange(callback: (user: DatabaseUser | null) => void) {
    const { data } = this.supabaseAuth.onAuthStateChange(
      (_event: string, session: any) => {
        callback(session?.user ? this.mapUser(session.user) : null);
      }
    );
    return {
      unsubscribe: data.subscription.unsubscribe,
    };
  }

  private mapUser(user: any): DatabaseUser {
    return {
      id: user.id,
      email: user.email,
      ...user,
    };
  }

  private mapError(error: any): DatabaseError {
    return {
      message: error.message || 'Auth error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }
}

/**
 * Main Supabase adapter class
 */
export class SupabaseDatabaseAdapter implements DatabaseClient {
  public auth: DatabaseAuth;

  constructor(private supabase: SupabaseClient) {
    this.auth = new SupabaseAuth(supabase.auth);
  }

  from<T = any>(table: string): QueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.supabase.from(table));
  }

  async rpc(functionName: string, params?: any): Promise<DatabaseResponse<any>> {
    const result = await this.supabase.rpc(functionName, params);
    return {
      data: result.data,
      error: result.error ? this.mapError(result.error) : null,
    };
  }

  private mapError(error: any): DatabaseError {
    return {
      message: error.message || 'Database error',
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }
}
