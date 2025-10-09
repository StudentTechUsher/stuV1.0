/**
 * Database Abstraction Layer - Types
 *
 * These interfaces define a database-agnostic API that can work with any provider.
 * Currently implemented for Supabase, but designed to work with PostgreSQL, MySQL, etc.
 *
 * @see adapters/supabase.adapter.ts - Current implementation
 */

/**
 * Generic query builder interface that mimics Supabase's chainable API
 */
export interface QueryBuilder<T = any> {
  select(columns?: string): QueryBuilder<T>;
  insert(data: any | any[]): QueryBuilder<T>;
  update(data: any): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  eq(column: string, value: any): QueryBuilder<T>;
  neq(column: string, value: any): QueryBuilder<T>;
  gt(column: string, value: any): QueryBuilder<T>;
  gte(column: string, value: any): QueryBuilder<T>;
  lt(column: string, value: any): QueryBuilder<T>;
  lte(column: string, value: any): QueryBuilder<T>;
  like(column: string, pattern: string): QueryBuilder<T>;
  ilike(column: string, pattern: string): QueryBuilder<T>;
  in(column: string, values: any[]): QueryBuilder<T>;
  is(column: string, value: null | boolean): QueryBuilder<T>;
  contains(column: string, value: any): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<DatabaseResponse<T>>;
  maybeSingle(): Promise<DatabaseResponse<T | null>>;
  then<TResult1 = DatabaseResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Standard database response format
 */
export interface DatabaseResponse<T = any> {
  data: T | null;
  error: DatabaseError | null;
}

/**
 * Database error interface
 */
export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Authentication user interface
 */
export interface DatabaseUser {
  id: string;
  email?: string;
  [key: string]: any;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: DatabaseUser | null;
  error: DatabaseError | null;
}

/**
 * Auth interface for user management
 */
export interface DatabaseAuth {
  getUser(): Promise<{ data: { user: DatabaseUser | null }; error: DatabaseError | null }>;
  signIn(credentials: { email: string; password: string }): Promise<AuthResponse>;
  signOut(): Promise<{ error: DatabaseError | null }>;
  onAuthStateChange(callback: (user: DatabaseUser | null) => void): { unsubscribe: () => void };
}

/**
 * Main database client interface
 */
export interface DatabaseClient {
  from<T = any>(table: string): QueryBuilder<T>;
  auth: DatabaseAuth;
  rpc(functionName: string, params?: any): Promise<DatabaseResponse<any>>;
}

/**
 * Type helper to extract table names from your database schema
 * You can extend this as you define your database schema types
 */
export type TableName =
  | 'program'
  | 'student'
  | 'profiles'
  | 'grad_plan'
  | 'course'
  | 'notification'
  | 'conversation'
  | 'message'
  | 'university'
  // Add more table names as needed
  | string; // Allow string for flexibility
