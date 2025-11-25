/**
 * Database Abstraction Interfaces
 *
 * These interfaces define the contract that any database adapter must implement.
 * This allows us to switch database providers without changing service layer code.
 */

/**
 * Standard database error structure
 */
export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Standard database response structure
 */
export interface DatabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
}

/**
 * Database user structure
 */
export interface DatabaseUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: DatabaseUser | null;
  error: DatabaseError | null;
}

/**
 * Query builder interface - supports chaining
 */
export interface QueryBuilder<T = Record<string, unknown>> {
  // Selection
  select(columns?: string): QueryBuilder<T>;

  // Mutations
  insert(data: Partial<T> | Partial<T>[]): QueryBuilder<T>;
  update(data: Partial<T>): QueryBuilder<T>;
  delete(): QueryBuilder<T>;

  // Filters
  eq(column: string, value: unknown): QueryBuilder<T>;
  neq(column: string, value: unknown): QueryBuilder<T>;
  gt(column: string, value: unknown): QueryBuilder<T>;
  gte(column: string, value: unknown): QueryBuilder<T>;
  lt(column: string, value: unknown): QueryBuilder<T>;
  lte(column: string, value: unknown): QueryBuilder<T>;
  like(column: string, pattern: string): QueryBuilder<T>;
  ilike(column: string, pattern: string): QueryBuilder<T>;
  in(column: string, values: unknown[]): QueryBuilder<T>;
  is(column: string, value: null | boolean): QueryBuilder<T>;
  contains(column: string, value: unknown): QueryBuilder<T>;

  // Modifiers
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;

  // Execution
  single(): Promise<DatabaseResponse<T>>;
  maybeSingle(): Promise<DatabaseResponse<T | null>>;
  then<TResult1 = DatabaseResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Authentication interface
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
  auth: DatabaseAuth;
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T>;
  rpc<T = unknown>(functionName: string, params?: Record<string, unknown>): Promise<DatabaseResponse<T>>;
}

/**
 * Table name type - can be extended per database schema
 */
export type TableName = string;
