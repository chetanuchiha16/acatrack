/**
 * utils/errorHandler.ts
 *
 * Centralized API error normalization.
 *
 * Instead of scattering `err instanceof Error ? err.message : "Unknown error"`
 * across every store and component, call `parseApiError(err)` and get a
 * human-readable string back, regardless of whether the error came from:
 *   - An Axios HTTP response (e.g. 400/401/500 with JSON body)
 *   - A network failure (no response)
 *   - A plain JavaScript Error
 *   - An unknown thrown value
 */

import axios, { type AxiosError } from "axios";
import type { ApiErrorResponse } from "../types";

// Re-export so callers can do: `import { isAxiosError } from "./errorHandler"`
export { isAxiosError } from "axios";

/**
 * Normalize any thrown value into a user-friendly error string.
 *
 * Priority order:
 * 1. Axios response body: `{ error: "..." }` from the Flask backend
 * 2. Axios response body: generic `{ message: "..." }`
 * 3. Axios network error (no response received)
 * 4. Plain JS Error `.message`
 * 5. Fallback: "An unexpected error occurred."
 */
export function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorResponse & { message?: string }>;

    // Backend JSON body
    if (axiosErr.response?.data) {
      const { error, message } = axiosErr.response.data;
      if (error) return error;
      if (message) return message;
      // HTTP status fallback
      return `Server error (${axiosErr.response.status})`;
    }

    // Network / timeout — no response received
    if (axiosErr.request) {
      return "Network error — please check your connection.";
    }
  }

  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === "string" && err.length > 0) {
    return err;
  }

  return "An unexpected error occurred.";
}

/**
 * Extract the HTTP status code from an Axios error if present, else null.
 */
export function getHttpStatus(err: unknown): number | null {
  if (axios.isAxiosError(err)) {
    return err.response?.status ?? null;
  }
  return null;
}

/**
 * Returns true if the error represents an HTTP 401 Unauthorized.
 * Useful for deciding whether to redirect to /auth.
 */
export function isUnauthorizedError(err: unknown): boolean {
  return getHttpStatus(err) === 401;
}
