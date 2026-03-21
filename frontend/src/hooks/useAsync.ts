/**
 * hooks/useAsync.ts
 *
 * Generic, strongly-typed hook for managing async state.
 *
 * Replaces the repetitive useState(null) + useState(false) + useState(null)
 * pattern for data / loading / error in every component that fetches data.
 *
 * @example
 * const { data, loading, error, refetch } = useAsync(
 *   () => axiosInstance.get<StudentResult>(`${API_BASE}/auth/Student/result`).then(r => r.data),
 *   []
 * );
 */

import { useState, useEffect, useCallback, type DependencyList } from "react";
import type { AsyncState } from "../types";

/**
 * useAsync<T>
 *
 * @param fn   - Async factory function returning a Promise<T>.
 *               Re-runs whenever `deps` change.
 * @param deps - Dependency array (same semantics as useEffect).
 * @returns    AsyncState<T> — { data, loading, error, refetch }
 *
 * Notes:
 * - Cancelled effects (due to component unmount or dep change) are ignored via
 *   an `active` flag, preventing setState-on-unmounted-component warnings.
 * - `refetch` is stable (wrapped in useCallback with no deps) so it's safe
 *   to include in other hooks' dependency arrays.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: DependencyList
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<number>(0);

  // Stable refetch: incrementing trigger re-runs the effect
  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    fn()
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const message =
            err instanceof Error ? err.message : "An error occurred.";
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, trigger]);

  return { data, loading, error, refetch };
}

export default useAsync;
