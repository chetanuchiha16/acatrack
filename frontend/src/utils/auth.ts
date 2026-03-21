/**
 * utils/auth.ts
 *
 * Typed replacement for utils/auth.js.
 * The original auth.js is kept alongside for backward compatibility —
 * any existing imports of `./utils/auth` that resolved to the JS file
 * will continue to work. New code should import from this file.
 */

import type { JwtPayload } from "../types";

/**
 * Decode and validate a JWT string.
 *
 * - Returns the decoded payload if the token is well-formed and not expired.
 * - Returns `null` if the token is missing, malformed, or expired.
 *
 * ⚠️  This does NOT verify the signature — that is the server's job.
 *     Use this only for reading claims on the client (e.g. displaying the role).
 */
export function parseJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1])) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // token expired
    }

    return payload;
  } catch (err) {
    console.warn("[auth] Invalid JWT:", err);
    return null;
  }
}

/**
 * Check whether a raw JWT string is currently valid (not expired).
 *
 * @example
 * if (!isTokenValid(getToken())) { clearToken(); navigate("/auth"); }
 */
export function isTokenValid(token: string | null | undefined): boolean {
  return parseJwt(token) !== null;
}

/**
 * Extract a specific claim from a JWT without full parse validation.
 * Useful for quickly reading `who` or `sub` in display logic.
 *
 * @example getJwtClaim(token, "who") → "Student"
 */
export function getJwtClaim<K extends keyof JwtPayload>(
  token: string | null | undefined,
  claim: K
): JwtPayload[K] | null {
  const payload = parseJwt(token);
  if (!payload) return null;
  return payload[claim] ?? null;
}
