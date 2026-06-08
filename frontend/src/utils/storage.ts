/**
 * utils/storage.ts
 *
 * Type-safe, centralized wrapper around browser storage APIs.
 * Centralizing token access here means a single place to swap
 * sessionStorage → httpOnly cookie if security requirements change.
 */

const TOKEN_KEY = "jwt_token" as const;

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Retrieve the JWT from sessionStorage. Returns null if absent. */
export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist the JWT to sessionStorage. */
export function setToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Safari private-browsing can throw QuotaExceededError — swallow silently
  }
}

/** Remove the JWT from sessionStorage (call on logout). */
export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("X-Demo-Session-ID");
  } catch {
    // no-op
  }
}

// ─── Generic sessionStorage ───────────────────────────────────────────────────

/**
 * Read a JSON-parsed value from sessionStorage.
 * Returns null on missing key, parse errors, or storage errors.
 */
export function getSessionItem<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialize and persist a value to sessionStorage. */
export function setSessionItem<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

/** Remove a key from sessionStorage. */
export function removeSessionItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
}

// ─── Generic localStorage ────────────────────────────────────────────────────

/**
 * Read a JSON-parsed value from localStorage.
 * Returns null on missing key, parse errors, or storage errors.
 */
export function getLocalItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Serialize and persist a value to localStorage. */
export function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

/** Remove a key from localStorage. */
export function removeLocalItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}
