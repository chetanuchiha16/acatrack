/**
 * utils/format.ts
 *
 * Pure, typed formatting helpers used across Result, SemesterResults,
 * ParentResult, and related components.
 *
 * All functions are null-safe and return sensible fallbacks so that
 * callers never need to scatter `?? 0` or `.toFixed(2)` inline.
 */

import type { Semester } from "../types";

// ─── Numeric formatters ───────────────────────────────────────────────────────

/**
 * Safely format a GPA/SGPA/CGPA value to 2 decimal places.
 * Returns "–" for null, undefined, or NaN inputs.
 *
 * @example formatGpa(8.3456) → "8.35"
 * @example formatGpa(null)   → "–"
 */
export function formatGpa(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "–";
  return val.toFixed(2);
}

/**
 * Format a percentage value with a trailing `%`.
 * Returns "–" for null, undefined, or NaN inputs.
 *
 * @example formatPercent(87.333) → "87.33%"
 */
export function formatPercent(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "–";
  return `${val.toFixed(2)}%`;
}

/**
 * Format raw marks/credits that can arrive from the backend as either
 * a number or a string (e.g. "AB" for absent). Returns "–" for nullish.
 *
 * @example formatMark(45)    → "45"
 * @example formatMark("AB")  → "AB"
 * @example formatMark(null)  → "–"
 */
export function formatMark(val: number | string | null | undefined): string {
  if (val == null) return "–";
  return String(val);
}

// ─── Semester label ───────────────────────────────────────────────────────────

/**
 * Convert a backend semester slug to a human-readable label.
 *
 * @example formatSemesterLabel("sem3") → "Semester 3"
 */
export function formatSemesterLabel(sem: Semester | string): string {
  const match = sem.match(/^sem(\d+)$/i);
  if (!match) return sem;
  return `Semester ${match[1]}`;
}

/**
 * Zero-pad a semester number and return its slug.
 *
 * @example semSlug(3) → "sem3"
 */
export function semSlug(n: number): Semester {
  return `sem${n}` as Semester;
}

// ─── ClassNames utility ───────────────────────────────────────────────────────

/**
 * Lightweight CSS classname joiner (no Tailwind plugin required).
 * Filters out falsy values and joins with a space.
 *
 * @example cn("px-4", isActive && "bg-blue-500", undefined) → "px-4 bg-blue-500"
 */
export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Format an ISO date-string or Date object into a locale-aware short date.
 *
 * @example formatDate("2025-03-17T00:00:00Z") → "Mar 17, 2025"
 */
export function formatDate(
  val: string | Date | null | undefined,
  locale = "en-IN"
): string {
  if (!val) return "–";
  try {
    return new Date(val).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "–";
  }
}
