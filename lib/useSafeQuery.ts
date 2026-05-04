import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

/**
 * Result type for safe async operations
 */
export interface SafeResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Generic hook for safe Supabase data fetching with error handling and fallbacks
 */
export function useSafeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  options?: {
    enabled?: boolean;
    fallback?: T | null;
    onError?: (error: Error) => void;
  }
): SafeResult<T> {
  const [data, setData] = useState<T | null>(options?.fallback ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const executeQuery = useCallback(async () => {
    if (options?.enabled === false) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: result, error: queryError } = await queryFn();

      if (queryError) {
        const safeError = queryError instanceof Error ? queryError : new Error(String(queryError));
        setError(safeError);
        console.warn('Query failed:', safeError.message);
        options?.onError?.(safeError);
        setData(options?.fallback ?? null);
      } else {
        // Safe null/undefined handling
        if (result === null || result === undefined) {
          setData(options?.fallback ?? null);
        } else {
          setData(result);
        }
      }
    } catch (caughtError) {
      const safeError = caughtError instanceof Error ? caughtError : new Error('Unexpected error occurred');
      setError(safeError);
      console.error('Unexpected query error:', safeError.message);
      options?.onError?.(safeError);
      setData(options?.fallback ?? null);
    } finally {
      setLoading(false);
    }
  }, [queryFn, options]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return {
    data,
    error,
    loading,
    refresh: executeQuery,
  };
}

/**
 * Hook for safe user data fetching
 */
export function useSafeUser() {
  const queryFn = useCallback(async () => {
    // Dynamic import to avoid circular dependencies
    const { getCurrentUserSafe } = await import('./authHooks');
    const user = await getCurrentUserSafe();
    return { data: user, error: user ? null : new Error('No user found') };
  }, []);

  return useSafeSupabaseQuery<User>(queryFn, {
    fallback: null,
  });
}

/**
 * Helper function to safely access nested object properties
 */
export const safeAccess = <T extends Record<string, unknown>>(
  obj: T | null | undefined,
  path: string[],
  fallback: unknown = null
): unknown => {
  if (!obj || typeof obj !== 'object') return fallback;

  let current: unknown = obj;
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current ?? fallback;
};

/**
 * Type guard for checking if value is defined and not null
 */
export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Safe array mapper that filters out null/undefined values
 */
export const safeMap = <T, U>(
  array: T[] | null | undefined,
  mapper: (item: T, index: number) => U
): U[] => {
  if (!array || !Array.isArray(array)) return [];
  return array.map(mapper);
};

/**
 * Safe reducer with initial value protection
 */
export const safeReduce = <T, U>(
  array: T[] | null | undefined,
  reducer: (acc: U, item: T, index: number) => U,
  initialValue: U
): U => {
  if (!array || !Array.isArray(array)) return initialValue;
  return array.reduce(reducer, initialValue);
};
